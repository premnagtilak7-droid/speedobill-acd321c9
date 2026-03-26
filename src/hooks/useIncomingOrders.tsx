import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { playLoudBell, sendBrowserNotif } from "@/lib/notification-sounds";

export interface IncomingOrder {
  id: string;
  table_number: number;
  total_amount: number;
  items: any[];
  status: string;
  created_at: string;
}

// Re-export playOrderAlert using centralized engine
export function playOrderAlert() {
  playLoudBell();
}

function sendBrowserNotification(order: IncomingOrder) {
  sendBrowserNotif(
    "Speedo Bill — New Order",
    `Table ${order.table_number} ordered ₹${order.total_amount}`,
    `order-${order.id}`
  );
}

// ── Callbacks registry for global notification events ──
type OrderCallback = (order: IncomingOrder) => void;
const listeners = new Set<OrderCallback>();

export function onNewIncomingOrder(cb: OrderCallback) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

function notifyListeners(order: IncomingOrder) {
  listeners.forEach((cb) => cb(order));
}

// ── Title flash ──
let titleInterval: ReturnType<typeof setInterval> | null = null;
const originalTitle = typeof document !== "undefined" ? document.title : "Speedo Bill";

export function startTitleFlash() {
  if (titleInterval) return;
  let toggle = false;
  titleInterval = setInterval(() => {
    document.title = toggle ? "🔔 NEW ORDER!" : originalTitle;
    toggle = !toggle;
  }, 1000);
}

export function stopTitleFlash() {
  if (titleInterval) {
    clearInterval(titleInterval);
    titleInterval = null;
    document.title = originalTitle;
  }
}

export function useIncomingOrders() {
  const { hotelId } = useAuth();
  const [orders, setOrders] = useState<IncomingOrder[]>([]);
  const initialLoadDone = useRef(false);

  const fetchIncoming = useCallback(async () => {
    if (!hotelId) return;
    const { data } = await supabase
      .from("customer_orders" as any)
      .select("*")
      .eq("hotel_id", hotelId)
      .eq("status", "incoming")
      .order("created_at", { ascending: false });
    if (data) setOrders(data as unknown as IncomingOrder[]);
    initialLoadDone.current = true;
  }, [hotelId]);

  useEffect(() => {
    fetchIncoming();
  }, [fetchIncoming]);

  useEffect(() => {
    if (!hotelId) return;
    const channel = supabase
      .channel("incoming-customer-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "customer_orders" },
        (payload) => {
          const row = payload.new as any;
          if (row.hotel_id === hotelId && row.status === "incoming") {
            const order = row as IncomingOrder;
            setOrders((prev) => [order, ...prev]);
            if (initialLoadDone.current) {
              playOrderAlert();
              sendBrowserNotification(order);
              startTitleFlash();
              notifyListeners(order);
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "customer_orders" },
        (payload) => {
          const row = payload.new as any;
          if (row.status !== "incoming") {
            setOrders((prev) => {
              const next = prev.filter((o) => o.id !== row.id);
              if (next.length === 0) stopTitleFlash();
              return next;
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [hotelId]);

  const dismissOrder = useCallback(async (orderId: string) => {
    setOrders((prev) => {
      const next = prev.filter((o) => o.id !== orderId);
      if (next.length === 0) stopTitleFlash();
      return next;
    });
    await supabase
      .from("customer_orders" as any)
      .update({ status: "confirmed" } as any)
      .eq("id", orderId);
  }, []);

  return { incomingOrders: orders, incomingCount: orders.length, dismissOrder, refetch: fetchIncoming };
}
