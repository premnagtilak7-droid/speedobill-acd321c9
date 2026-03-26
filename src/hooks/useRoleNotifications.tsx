/**
 * Role-based real-time notification system.
 * - Chef: new KOT tickets → loud bell + browser notification
 * - Waiter: order marked "ready" → soft ding + browser notification
 * - Owner: high-value bills (>₹500) + void requests → warning tone + browser notification
 */
import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  playLoudBell,
  playSoftDing,
  playWarningTone,
  sendBrowserNotif,
} from "@/lib/notification-sounds";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: "order" | "ready" | "void" | "bill" | "info";
  createdAt: number;
}

type NotifCallback = (notif: AppNotification) => void;
const notifListeners = new Set<NotifCallback>();

export function onAppNotification(cb: NotifCallback) {
  notifListeners.add(cb);
  return () => { notifListeners.delete(cb); };
}

function emit(notif: AppNotification) {
  notifListeners.forEach((cb) => cb(notif));
}

export function useRoleNotifications() {
  const { hotelId, role, user } = useAuth();
  const initialLoadDone = useRef(false);

  // ── Chef: new KOT tickets ──
  useEffect(() => {
    if (!hotelId || role !== "chef") return;
    const channel = supabase
      .channel(`chef-kot-notif-${hotelId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "kot_tickets", filter: `hotel_id=eq.${hotelId}` },
        async (payload) => {
          const kot = payload.new as any;
          if (kot.status === "pending") {
            // Get table number
            const { data: tbl } = await supabase
              .from("restaurant_tables")
              .select("table_number")
              .eq("id", kot.table_id)
              .maybeSingle();
            const tableNum = tbl?.table_number || "?";

            playLoudBell();
            sendBrowserNotif(
              "🔔 New Order — Kitchen",
              `Table ${tableNum} has a new order!`,
              `kot-${kot.id}`
            );
            emit({
              id: kot.id,
              title: "New Order",
              body: `Table ${tableNum} — new order received`,
              type: "order",
              createdAt: Date.now(),
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [hotelId, role]);

  // ── Waiter: order marked "ready" ──
  useEffect(() => {
    if (!hotelId || !user || role !== "waiter") return;
    const channel = supabase
      .channel(`waiter-ready-notif-${hotelId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "kot_tickets", filter: `hotel_id=eq.${hotelId}` },
        async (payload) => {
          const newRow = payload.new as any;
          const oldRow = payload.old as any;
          if (newRow.status === "ready" && oldRow?.status !== "ready") {
            // Check if this waiter placed the order
            const { data: order } = await supabase
              .from("orders")
              .select("waiter_id, table_id")
              .eq("id", newRow.order_id)
              .maybeSingle();
            
            if (order?.waiter_id === user.id) {
              const { data: tbl } = await supabase
                .from("restaurant_tables")
                .select("table_number")
                .eq("id", order.table_id)
                .maybeSingle();
              const tableNum = tbl?.table_number || "?";

              playSoftDing();
              sendBrowserNotif(
                "🍽️ Order Ready!",
                `Table ${tableNum} — food is ready for pickup`,
                `ready-${newRow.id}`
              );
              emit({
                id: newRow.id,
                title: "Order Ready",
                body: `Table ${tableNum} — food is ready!`,
                type: "ready",
                createdAt: Date.now(),
              });
            }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [hotelId, role, user]);

  // ── Owner: high-value bills + void requests ──
  useEffect(() => {
    if (!hotelId || role !== "owner") return;

    // Void reports
    const voidChannel = supabase
      .channel(`owner-voids-${hotelId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "void_reports", filter: `hotel_id=eq.${hotelId}` },
        (payload) => {
          const v = payload.new as any;
          playWarningTone();
          sendBrowserNotif(
            "⚠️ Void Request",
            `${v.item_name} (₹${v.item_price}) voided — ${v.reason}`,
            `void-${v.id}`
          );
          emit({
            id: v.id,
            title: "Void Request",
            body: `${v.item_name} (₹${v.item_price}) — ${v.reason}`,
            type: "void",
            createdAt: Date.now(),
          });
        }
      )
      .subscribe();

    // High-value bills (>₹500)
    const billChannel = supabase
      .channel(`owner-bills-${hotelId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `hotel_id=eq.${hotelId}` },
        (payload) => {
          const o = payload.new as any;
          if (o.status === "billed" && o.total >= 500) {
            playSoftDing();
            sendBrowserNotif(
              "💰 High-Value Bill",
              `₹${Number(o.total).toFixed(0)} bill saved`,
              `bill-${o.id}`
            );
            emit({
              id: o.id,
              title: "Bill Saved",
              body: `₹${Number(o.total).toFixed(0)} bill completed`,
              type: "bill",
              createdAt: Date.now(),
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(voidChannel);
      supabase.removeChannel(billChannel);
    };
  }, [hotelId, role]);
}
