import { useState, useEffect, useCallback } from "react";
import { Bell, X, ChefHat, UtensilsCrossed, AlertTriangle, IndianRupee, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AppNotification, onAppNotification } from "@/hooks/useRoleNotifications";
import { onNewIncomingOrder, IncomingOrder } from "@/hooks/useIncomingOrders";
import { formatDistanceToNow } from "date-fns";

const typeConfig: Record<string, { icon: any; color: string; bg: string }> = {
  order: { icon: ChefHat, color: "text-primary", bg: "bg-primary/10" },
  ready: { icon: UtensilsCrossed, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  void: { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
  bill: { icon: IndianRupee, color: "text-amber-500", bg: "bg-amber-500/10" },
  info: { icon: Info, color: "text-blue-500", bg: "bg-blue-500/10" },
};

const MAX_NOTIFICATIONS = 50;

export function NotificationBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const addNotification = useCallback((notif: AppNotification) => {
    setNotifications((prev) => [notif, ...prev].slice(0, MAX_NOTIFICATIONS));
    setUnreadCount((c) => c + 1);
  }, []);

  // Listen to role-based notifications
  useEffect(() => {
    const unsub = onAppNotification(addNotification);
    return unsub;
  }, [addNotification]);

  // Listen to incoming customer orders
  useEffect(() => {
    const unsub = onNewIncomingOrder((order: IncomingOrder) => {
      addNotification({
        id: `incoming-${order.id}`,
        title: "New Customer Order",
        body: `Table ${order.table_number} — ₹${order.total_amount}`,
        type: "order",
        createdAt: Date.now(),
      });
    });
    return unsub;
  }, [addNotification]);

  const markAllRead = () => setUnreadCount(0);

  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const handleToggle = () => {
    setOpen((o) => !o);
    if (!open) markAllRead();
  };

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        className="relative p-2 rounded-lg hover:bg-secondary/60 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground animate-badge-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop for mobile */}
          <div className="fixed inset-0 z-40 md:hidden" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-full mt-2 z-50 w-80 sm:w-96 rounded-xl border border-border bg-card shadow-xl animate-pop-in">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
              <div className="flex items-center gap-1">
                {notifications.length > 0 && (
                  <Button variant="ghost" size="sm" className="text-xs h-7 text-muted-foreground" onClick={clearAll}>
                    Clear all
                  </Button>
                )}
                <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-secondary">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* List */}
            <ScrollArea className="max-h-80">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4">
                  <Bell className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No notifications yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Real-time alerts will appear here</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.map((notif) => {
                    const config = typeConfig[notif.type] || typeConfig.info;
                    const Icon = config.icon;
                    return (
                      <div key={notif.id} className="flex items-start gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors">
                        <div className={`mt-0.5 flex-shrink-0 h-8 w-8 rounded-lg ${config.bg} flex items-center justify-center`}>
                          <Icon className={`h-4 w-4 ${config.color}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">{notif.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{notif.body}</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1">
                            {formatDistanceToNow(notif.createdAt, { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </>
      )}
    </div>
  );
}
