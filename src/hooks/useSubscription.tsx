import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getScopedStoragePrefix } from "@/lib/backend-cache";

export type TrialStatus = "active" | "trial" | "expired" | "free";

interface SubscriptionState {
  status: TrialStatus;
  daysLeft: number | null;
  plan: string | null;
  expiresAt: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const LS_KEY_PREFIX = getScopedStoragePrefix("qb_sub_cache").replace(/:$/, "");

function getCacheKey(userId: string) {
  return `${LS_KEY_PREFIX}:${userId}`;
}

function readCache(userId: string | null | undefined): Omit<SubscriptionState, "loading" | "refresh"> | null {
  if (!userId) return null;

  try {
    const raw = localStorage.getItem(getCacheKey(userId));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (Date.now() - (parsed._ts || 0) > 10 * 60 * 1000) return null;

    return {
      status: parsed.status,
      daysLeft: parsed.daysLeft,
      plan: parsed.plan,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
}

function writeCache(
  userId: string | null | undefined,
  state: { status: TrialStatus; daysLeft: number | null; plan: string | null; expiresAt: string | null },
) {
  if (!userId) return;

  try {
    localStorage.setItem(getCacheKey(userId), JSON.stringify({ ...state, _ts: Date.now() }));
  } catch {}
}

const SubscriptionContext = createContext<SubscriptionState>({
  status: "free",
  daysLeft: null,
  plan: null,
  expiresAt: null,
  loading: true,
  refresh: async () => {},
});

export const useSubscription = () => useContext(SubscriptionContext);

function resolveSubscription(
  profile: {
    subscription_status: string | null;
    subscription_plan: string | null;
    subscription_expires_at: string | null;
    trial_ends_at: string | null;
  } | null,
  hotel: {
    subscription_tier: string | null;
    subscription_expiry: string | null;
  } | null,
): { status: TrialStatus; daysLeft: number | null; plan: string | null; expiresAt: string | null } {
  const now = new Date();

  if (hotel && hotel.subscription_tier && hotel.subscription_tier !== "free") {
    const tier = hotel.subscription_tier;
    const expiry = hotel.subscription_expiry;
    const daysLeft = expiry
      ? Math.max(0, Math.ceil((new Date(expiry).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : null;

    if (daysLeft === null || daysLeft > 0) {
      return { status: "active", daysLeft, plan: tier, expiresAt: expiry };
    }
  }

  if (profile?.subscription_status === "active" && profile.subscription_plan) {
    const daysLeft = profile.subscription_expires_at
      ? Math.max(0, Math.ceil((new Date(profile.subscription_expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : null;

    if (daysLeft !== null && daysLeft <= 0) {
      return { status: "free", daysLeft: 0, plan: null, expiresAt: null };
    }

    return {
      status: "active",
      daysLeft,
      plan: profile.subscription_plan,
      expiresAt: profile.subscription_expires_at,
    };
  }

  if (profile?.trial_ends_at) {
    const trialEnd = new Date(profile.trial_ends_at);
    const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (now < trialEnd) {
      return { status: "trial", daysLeft: Math.max(0, daysLeft), plan: null, expiresAt: null };
    }
  }

  return { status: "free", daysLeft: 0, plan: null, expiresAt: null };
}

export const SubscriptionProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, hotelId } = useAuth();
  const cached = readCache(user?.id ?? null);
  const hasOptimisticAccess = cached?.status === "trial" || cached?.status === "active";

  const [state, setState] = useState<SubscriptionState>({
    status: cached?.status ?? "free",
    daysLeft: cached?.daysLeft ?? null,
    plan: cached?.plan ?? null,
    expiresAt: cached?.expiresAt ?? null,
    loading: user ? !hasOptimisticAccess : false,
    refresh: async () => {},
  });

  const fetchStatus = useCallback(async () => {
    if (!user) {
      setState((prev) => ({
        ...prev,
        status: "free",
        daysLeft: null,
        plan: null,
        expiresAt: null,
        loading: false,
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      loading: prev.status === "trial" || prev.status === "active" ? false : true,
    }));

    try {
      const [profileRes, hotelRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("subscription_status, subscription_plan, subscription_expires_at, trial_ends_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
        hotelId
          ? supabase
              .from("hotels")
              .select("subscription_tier, subscription_expiry")
              .eq("id", hotelId)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (profileRes.error) throw profileRes.error;
      if (hotelRes.error) throw hotelRes.error;

      const result = resolveSubscription(profileRes.data, hotelRes.data);
      setState((prev) => ({ ...prev, ...result, loading: false }));
      writeCache(user.id, result);
    } catch (err) {
      console.error("Error fetching subscription status:", err);
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [user, hotelId]);

  useEffect(() => {
    const nextCached = readCache(user?.id ?? null);
    const nextHasOptimisticAccess = nextCached?.status === "trial" || nextCached?.status === "active";

    setState((prev) => ({
      ...prev,
      status: nextCached?.status ?? "free",
      daysLeft: nextCached?.daysLeft ?? null,
      plan: nextCached?.plan ?? null,
      expiresAt: nextCached?.expiresAt ?? null,
      loading: user ? !nextHasOptimisticAccess : false,
    }));
  }, [user?.id]);

  useEffect(() => {
    void fetchStatus();
    const interval = setInterval(() => {
      void fetchStatus();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  useEffect(() => {
    setState((prev) => ({ ...prev, refresh: fetchStatus }));
  }, [fetchStatus]);

  const value = useMemo(() => state, [state.status, state.daysLeft, state.plan, state.expiresAt, state.loading, state.refresh]);

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
};
