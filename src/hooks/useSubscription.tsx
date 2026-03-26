import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionContextType {
  status: "trial" | "active" | "expired" | "free";
  daysLeft: number | null;
  plan: string | null;
  expiresAt: string | null;
  isActive: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  status: "trial",
  daysLeft: null,
  plan: null,
  expiresAt: null,
  isActive: true,
});

export const useSubscription = () => useContext(SubscriptionContext);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const { hotelId, user } = useAuth();
  const [status, setStatus] = useState<"trial" | "active" | "expired" | "free">("trial");
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !hotelId) return;

    const fetchSubscription = async () => {
      // Check profile for trial/subscription info
      const { data: profile } = await supabase
        .from("profiles")
        .select("trial_ends_at, subscription_status, subscription_plan, subscription_expires_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) return;

      const now = new Date();

      // Check hotel subscription tier
      const { data: hotel } = await supabase
        .from("hotels")
        .select("subscription_tier, subscription_expiry")
        .eq("id", hotelId)
        .maybeSingle();

      if (hotel?.subscription_expiry) {
        const expiry = new Date(hotel.subscription_expiry);
        const days = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        setExpiresAt(hotel.subscription_expiry);

        if (days > 0) {
          setStatus("active");
          setDaysLeft(days);
          setPlan(hotel.subscription_tier || "basic");
          return;
        } else {
          setStatus("expired");
          setDaysLeft(0);
          setPlan(hotel.subscription_tier || "free");
          return;
        }
      }

      // Check trial
      if (profile.trial_ends_at) {
        const trialEnd = new Date(profile.trial_ends_at);
        const days = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (days > 0) {
          setStatus("trial");
          setDaysLeft(days);
          setPlan("trial");
          return;
        }
      }

      setStatus("free");
      setDaysLeft(0);
      setPlan("free");
    };

    fetchSubscription();
  }, [user, hotelId]);

  const isActive = status === "trial" || status === "active";

  return (
    <SubscriptionContext.Provider value={{ status, daysLeft, plan, expiresAt, isActive }}>
      {children}
    </SubscriptionContext.Provider>
  );
};
