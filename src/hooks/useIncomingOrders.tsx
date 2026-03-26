import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

export const useIncomingOrders = () => {
  const { hotelId } = useAuth();
  const [incomingCount, setIncomingCount] = useState(0);

  useEffect(() => {
    if (!hotelId) return;

    const fetch = async () => {
      const { count } = await supabase
        .from("customer_orders")
        .select("id", { count: "exact", head: true })
        .eq("hotel_id", hotelId)
        .eq("status", "incoming");
      setIncomingCount(count || 0);
    };

    fetch();

    const channel = supabase
      .channel("incoming-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "customer_orders", filter: `hotel_id=eq.${hotelId}` }, () => fetch())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [hotelId]);

  return { incomingCount };
};
