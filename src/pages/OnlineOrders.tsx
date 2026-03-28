import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShoppingBag, Bell, Check, Clock, Volume2 } from "lucide-react";
import { playLoudBell } from "@/lib/notification-sounds";

interface SimOrder {
  id: string;
  platform: "zomato" | "swiggy";
  items: { name: string; qty: number; price: number }[];
  total: number;
  customer: string;
  address: string;
  status: "incoming" | "accepted" | "preparing" | "ready" | "dispatched";
  created_at: string;
}

const PLATFORM_STYLE = {
  zomato: { bg: "bg-red-500/15", text: "text-red-600", border: "border-red-500/30", label: "Zomato", dot: "bg-red-500" },
  swiggy: { bg: "bg-orange-500/15", text: "text-orange-600", border: "border-orange-500/30", label: "Swiggy", dot: "bg-orange-500" },
};

const SAMPLE_ITEMS = [
  [{ name: "Butter Chicken", qty: 1, price: 280 }, { name: "Naan (2)", qty: 1, price: 60 }, { name: "Raita", qty: 1, price: 40 }],
  [{ name: "Paneer Tikka", qty: 2, price: 220 }, { name: "Dal Makhani", qty: 1, price: 180 }],
  [{ name: "Chicken Biryani", qty: 1, price: 250 }, { name: "Mirchi Ka Salan", qty: 1, price: 60 }],
  [{ name: "Veg Thali", qty: 1, price: 180 }, { name: "Lassi", qty: 2, price: 60 }],
  [{ name: "Masala Dosa", qty: 2, price: 120 }, { name: "Filter Coffee", qty: 2, price: 60 }],
];

const CUSTOMERS = ["Rahul Sharma", "Priya Patel", "Arjun Singh", "Sneha Verma", "Vikram Joshi"];
const ADDRESSES = [
  "Flat 302, Green Valley, Wakad",
  "House 15, Sunshine Colony, Hinjewadi",
  "A-404, Blue Ridge, Baner",
  "B-12, Rose Apartments, Aundh",
  "Plot 8, MG Road, Kothrud",
];

const OnlineOrders = () => {
  const { hotelId } = useAuth();
  const [orders, setOrders] = useState<SimOrder[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const generateOrder = useCallback(() => {
    const platform: "zomato" | "swiggy" = Math.random() > 0.5 ? "zomato" : "swiggy";
    const items = SAMPLE_ITEMS[Math.floor(Math.random() * SAMPLE_ITEMS.length)];
    const total = items.reduce((s, i) => s + i.price * i.qty, 0);
    const order: SimOrder = {
      id: `${platform.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
      platform,
      items,
      total,
      customer: CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)],
      address: ADDRESSES[Math.floor(Math.random() * ADDRESSES.length)],
      status: "incoming",
      created_at: new Date().toISOString(),
    };
    return order;
  }, []);

  const simulateIncoming = useCallback(() => {
    const order = generateOrder();
    setOrders(prev => [order, ...prev]);
    if (soundEnabled) {
      try { playNotificationSound("bell"); } catch {}
    }
    toast(`🔔 New ${order.platform === "zomato" ? "Zomato" : "Swiggy"} order!`, {
      description: `${order.customer} · ₹${order.total}`,
    });
  }, [generateOrder, soundEnabled]);

  const updateStatus = (orderId: string, newStatus: SimOrder["status"]) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    toast.success(`Order ${orderId} → ${newStatus}`);
  };

  const statusFlow: Record<string, SimOrder["status"] | null> = {
    incoming: "accepted",
    accepted: "preparing",
    preparing: "ready",
    ready: "dispatched",
    dispatched: null,
  };

  const incomingCount = orders.filter(o => o.status === "incoming").length;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingBag className="h-6 w-6" /> Online Orders
          </h1>
          <p className="text-sm text-muted-foreground">Simulated aggregator orders (Zomato & Swiggy)</p>
        </div>
        <div className="flex items-center gap-2">
          {incomingCount > 0 && (
            <Badge className="bg-destructive text-destructive-foreground animate-pulse gap-1">
              <Bell className="h-3 w-3" /> {incomingCount} incoming
            </Badge>
          )}
          <Button size="sm" variant="outline" onClick={() => setSoundEnabled(!soundEnabled)}>
            <Volume2 className={`h-4 w-4 ${soundEnabled ? "text-primary" : "text-muted-foreground"}`} />
          </Button>
          <Button size="sm" onClick={simulateIncoming} className="gap-1">
            <Bell className="h-4 w-4" /> Simulate Order
          </Button>
        </div>
      </div>

      {orders.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">No online orders yet. Click "Simulate Order" to test.</p>
            <p className="text-xs text-muted-foreground mt-1">In production, these will come from Zomato/Swiggy APIs.</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {orders.map(order => {
          const ps = PLATFORM_STYLE[order.platform];
          const nextStatus = statusFlow[order.status];
          const elapsed = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);

          return (
            <Card key={order.id} className={`overflow-hidden ${order.status === "incoming" ? "ring-2 ring-primary/50 animate-pulse" : ""}`}>
              <div className={`h-1 ${ps.dot}`} />
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Badge className={`${ps.bg} ${ps.text} border ${ps.border} font-bold text-xs`}>
                      {ps.label}
                    </Badge>
                    <span className="text-xs font-mono text-muted-foreground">{order.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={order.status === "incoming" ? "destructive" : order.status === "dispatched" ? "default" : "secondary"} className="text-xs capitalize">
                      {order.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {elapsed < 1 ? "Now" : `${elapsed}m`}
                    </span>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{order.customer}</p>
                    <p className="text-xs text-muted-foreground">{order.address}</p>
                  </div>
                  <div>
                    <div className="space-y-1">
                      {order.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span>{item.name} × {item.qty}</span>
                          <span className="font-medium">₹{item.price * item.qty}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm font-bold border-t pt-1">
                        <span>Total</span>
                        <span>₹{order.total}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {nextStatus && (
                  <div className="mt-3 flex justify-end">
                    <Button size="sm" onClick={() => updateStatus(order.id, nextStatus)}
                      className={order.status === "incoming" ? "bg-green-600 hover:bg-green-700 text-white" : ""}>
                      <Check className="mr-1 h-3.5 w-3.5" />
                      {order.status === "incoming" ? "Accept" : `Mark ${nextStatus}`}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default OnlineOrders;
