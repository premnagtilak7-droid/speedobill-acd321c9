import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollText, Clock, ChevronDown, ChevronUp, CalendarDays, Printer, MessageCircle, Share2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const SOURCE_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  "dine-in": { bg: "rgba(59,130,246,0.15)", text: "#3B82F6", label: "Dine-In" },
  "online-qr": { bg: "rgba(16,185,129,0.15)", text: "#10B981", label: "QR Order" },
  website: { bg: "rgba(139,92,246,0.15)", text: "#8B5CF6", label: "Website" },
  swiggy: { bg: "rgba(249,115,22,0.15)", text: "#F97316", label: "Swiggy" },
  zomato: { bg: "rgba(239,68,68,0.15)", text: "#EF4444", label: "Zomato" },
};

interface OrderWithItems {
  id: string;
  status: string;
  total: number;
  created_at: string;
  billed_at: string | null;
  table_number: number;
  waiter_id: string;
  waiter_name?: string;
  order_source?: string;
  items: { name: string; price: number; quantity: number }[];
}

const PAGE_SIZE = 30;

const OrderHistory = () => {
  const { hotelId, role, user } = useAuth();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [hotelInfo, setHotelInfo] = useState<{ name: string; address: string; phone: string; tax_percent: number; gst_enabled: boolean } | null>(null);

  const fetchOrders = useCallback(async (pageNum: number = 0) => {
    if (!hotelId) return;
    setLoading(true);

    const startOfDay = `${selectedDate}T00:00:00.000Z`;
    const endOfDay = `${selectedDate}T23:59:59.999Z`;

    let query = supabase
      .from("orders")
      .select("id, status, total, created_at, billed_at, table_id, waiter_id, order_source")
      .eq("hotel_id", hotelId)
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay)
      .order("created_at", { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

    if (role === "waiter" && user) {
      query = query.eq("waiter_id", user.id);
    }

    const { data: ordersData } = await query;

    if (!ordersData || ordersData.length === 0) {
      if (pageNum === 0) setOrders([]);
      setHasMore(false);
      setLoading(false);
      return;
    }

    setHasMore(ordersData.length === PAGE_SIZE);

    // Enrich in batch
    const tableIds = [...new Set(ordersData.map((o) => o.table_id))];
    const waiterIds = [...new Set(ordersData.map((o) => o.waiter_id))];
    const orderIds = ordersData.map((o) => o.id);

    const [tablesRes, profilesRes, itemsRes] = await Promise.all([
      supabase.from("restaurant_tables").select("id, table_number").in("id", tableIds),
      supabase.from("profiles").select("user_id, full_name").in("user_id", waiterIds),
      supabase.from("order_items").select("order_id, name, price, quantity").in("order_id", orderIds),
    ]);

    const tableMap = new Map(tablesRes.data?.map((t) => [t.id, t.table_number]) || []);
    const waiterMap = new Map(profilesRes.data?.map((p) => [p.user_id, p.full_name || "Unknown"]) || []);
    const itemsMap = new Map<string, { name: string; price: number; quantity: number }[]>();
    itemsRes.data?.forEach((item) => {
      if (!itemsMap.has(item.order_id)) itemsMap.set(item.order_id, []);
      itemsMap.get(item.order_id)!.push({ name: item.name, price: item.price, quantity: item.quantity });
    });

    const enriched: OrderWithItems[] = ordersData.map((o: any) => ({
      id: o.id,
      status: o.status,
      total: o.total,
      created_at: o.created_at,
      billed_at: o.billed_at,
      table_number: tableMap.get(o.table_id) || 0,
      waiter_id: o.waiter_id,
      waiter_name: waiterMap.get(o.waiter_id) || "Unknown",
      order_source: o.order_source || "dine-in",
      items: itemsMap.get(o.id) || [],
    }));

    setOrders(pageNum === 0 ? enriched : (prev) => [...prev, ...enriched]);
    setLoading(false);
  }, [hotelId, selectedDate, role, user]);

  useEffect(() => {
    if (!hotelId) return;
    supabase.from("hotels").select("name, address, phone, tax_percent, gst_enabled").eq("id", hotelId).maybeSingle().then(({ data }) => {
      if (data) setHotelInfo(data as any);
    });
  }, [hotelId]);

  useEffect(() => {
    setPage(0);
    setHasMore(true);
    fetchOrders(0);
  }, [fetchOrders]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchOrders(next);
  };

  const totalRevenue = orders.filter((o) => o.status === "billed").reduce((sum, o) => sum + Number(o.total), 0);

  const statusColor = (s: string) => {
    if (s === "billed") return "bg-green-500/15 text-green-600 border-green-500/30";
    if (s === "active") return "bg-blue-500/15 text-blue-600 border-blue-500/30";
    return "bg-muted text-muted-foreground";
  };

  const buildReceiptText = (order: OrderWithItems) => {
    const lines: string[] = [];
    lines.push(hotelInfo?.name || "Hotel");
    if (hotelInfo?.address) lines.push(hotelInfo.address);
    if (hotelInfo?.phone) lines.push(`Ph: ${hotelInfo.phone}`);
    lines.push("─".repeat(28));
    lines.push(`Table: ${order.table_number}`);
    lines.push(`Date: ${format(new Date(order.created_at), "dd/MM/yyyy hh:mm a")}`);
    if (order.waiter_name) lines.push(`Waiter: ${order.waiter_name}`);
    lines.push("─".repeat(28));
    order.items.forEach((item) => {
      lines.push(`${item.name} ×${item.quantity}  ₹${(item.price * item.quantity).toFixed(0)}`);
    });
    lines.push("─".repeat(28));
    const subtotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
    lines.push(`Subtotal: ₹${subtotal.toFixed(0)}`);
    if (hotelInfo?.gst_enabled && hotelInfo.tax_percent > 0) {
      const tax = subtotal * (hotelInfo.tax_percent / 100);
      lines.push(`GST (${hotelInfo.tax_percent}%): ₹${tax.toFixed(0)}`);
    }
    lines.push(`TOTAL: ₹${Number(order.total).toFixed(0)}`);
    lines.push("─".repeat(28));
    lines.push("Thank you! Visit again.");
    return lines.join("\n");
  };

  const handleWhatsAppShare = (order: OrderWithItems) => {
    const text = buildReceiptText(order);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handlePrint = (order: OrderWithItems) => {
    const text = buildReceiptText(order);
    const printWindow = window.open("", "_blank", "width=300,height=600");
    if (printWindow) {
      printWindow.document.write(`<html><head><title>Receipt</title><style>body{font-family:monospace;font-size:12px;white-space:pre-wrap;padding:10px;}</style></head><body>${text}</body></html>`);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleShare = async (order: OrderWithItems) => {
    const text = buildReceiptText(order);
    if (navigator.share) {
      try { await navigator.share({ title: `Receipt - Table ${order.table_number}`, text }); } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("Receipt copied to clipboard!");
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">
            {role === "waiter" ? "My Bills" : "Order History"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {role === "waiter" ? "Your bills for the selected date" : "View all orders by date"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-auto" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-display font-bold">{orders.length}</p><p className="text-xs text-muted-foreground">Total Orders</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-display font-bold">₹{totalRevenue.toFixed(0)}</p><p className="text-xs text-muted-foreground">Revenue (Billed)</p></CardContent></Card>
        <Card className="col-span-2 sm:col-span-1"><CardContent className="p-4 text-center"><p className="text-2xl font-display font-bold">{orders.filter((o) => o.status === "billed").length}</p><p className="text-xs text-muted-foreground">Completed Orders</p></CardContent></Card>
      </div>

      {loading && orders.length === 0 ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ScrollText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No orders found for {format(new Date(selectedDate), "dd MMM yyyy")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Card key={order.id} className="overflow-hidden">
              <CardContent className="p-0">
                <button
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                      <span className="text-sm font-bold text-primary">T{order.table_number}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">Table {order.table_number}</span>
                        <Badge variant="outline" className={`text-[10px] ${statusColor(order.status)}`}>{order.status}</Badge>
                        {order.order_source && order.order_source !== "dine-in" && (() => {
                          const src = SOURCE_BADGE[order.order_source] || SOURCE_BADGE["dine-in"];
                          return (
                            <Badge className="text-[9px] px-1.5 py-0" style={{ background: src.bg, color: src.text, border: "none" }}>
                              {src.label}
                            </Badge>
                          );
                        })()}
                        {role === "owner" && order.waiter_name && (
                          <span className="text-[10px] text-muted-foreground">by {order.waiter_name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(order.created_at), "hh:mm a")}
                        {order.billed_at && <span className="ml-2">→ Billed {format(new Date(order.billed_at), "hh:mm a")}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-display font-bold text-primary">₹{Number(order.total).toFixed(0)}</span>
                    {expandedOrder === order.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </button>
                {expandedOrder === order.id && (
                  <div className="px-4 pb-4 border-t">
                    {order.items.length > 0 && (
                      <div className="pt-3 space-y-1.5">
                        {order.items.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{item.name} × {item.quantity}</span>
                            <span className="font-medium">₹{(item.price * item.quantity).toFixed(0)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-dashed">
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={(e) => { e.stopPropagation(); handleWhatsAppShare(order); }}>
                        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={(e) => { e.stopPropagation(); handlePrint(order); }}>
                        <Printer className="h-3.5 w-3.5" /> Print
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={(e) => { e.stopPropagation(); handleShare(order); }}>
                        <Share2 className="h-3.5 w-3.5" /> Share
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {hasMore && (
            <div className="text-center pt-2">
              <Button variant="outline" onClick={loadMore} disabled={loading} className="gap-2">
                {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" /> : null}
                Load More
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OrderHistory;
