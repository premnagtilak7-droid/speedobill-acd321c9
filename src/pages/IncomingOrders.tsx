import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIncomingOrders, stopTitleFlash } from "@/hooks/useIncomingOrders";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Bell, Check, ChefHat, Clock, ShoppingCart, User } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface KOTTicket {
  id: string;
  order_id: string;
  table_id: string;
  status: string;
  created_at: string;
  claimed_by: string | null;
  claimed_at: string | null;
  ready_at: string | null;
  table_number: number;
  items: { name: string; quantity: number; special_instructions: string | null }[];
}

const IncomingOrders = () => {
  const { hotelId, user } = useAuth();
  const [tickets, setTickets] = useState<KOTTicket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = useCallback(async () => {
    if (!hotelId) return;
    const today = new Date().toISOString().split("T")[0];

    const { data: kotData } = await supabase
      .from("kot_tickets")
      .select("id, order_id, table_id, status, created_at, claimed_by, claimed_at, ready_at")
      .eq("hotel_id", hotelId)
      .gte("created_at", `${today}T00:00:00`)
      .order("created_at", { ascending: false });

    if (!kotData || kotData.length === 0) {
      setTickets([]);
      setLoading(false);
      return;
    }

    const tableIds = [...new Set(kotData.map((k) => k.table_id))];
    const kotIds = kotData.map((k) => k.id);

    const [tablesRes, itemsRes] = await Promise.all([
      supabase.from("restaurant_tables").select("id, table_number").in("id", tableIds),
      supabase.from("kot_items").select("kot_id, name, quantity, special_instructions").in("kot_id", kotIds),
    ]);

    const tableMap = new Map(tablesRes.data?.map((t) => [t.id, t.table_number]) || []);
    const itemsMap = new Map<string, { name: string; quantity: number; special_instructions: string | null }[]>();
    itemsRes.data?.forEach((item) => {
      if (!itemsMap.has(item.kot_id)) itemsMap.set(item.kot_id, []);
      itemsMap.get(item.kot_id)!.push({ name: item.name, quantity: item.quantity, special_instructions: item.special_instructions });
    });

    const enriched: KOTTicket[] = kotData.map((k: any) => ({
      ...k,
      table_number: tableMap.get(k.table_id) || 0,
      items: itemsMap.get(k.id) || [],
    }));

    setTickets(enriched);
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  useEffect(() => {
    if (!hotelId) return;
    const channel = supabase
      .channel("kot-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "kot_tickets", filter: `hotel_id=eq.${hotelId}` }, () => fetchTickets())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [hotelId, fetchTickets]);

  const updateStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === "preparing" && user) {
      updates.claimed_by = user.id;
      updates.claimed_at = new Date().toISOString();
    }
    if (status === "ready") {
      updates.ready_at = new Date().toISOString();
    }
    const { error } = await supabase.from("kot_tickets").update(updates).eq("id", id);
    if (error) toast.error("Update failed: " + error.message);
    else toast.success(`KOT marked as ${status}`);
  };

  const pending = tickets.filter((t) => t.status === "pending");
  const preparing = tickets.filter((t) => t.status === "preparing");
  const ready = tickets.filter((t) => t.status === "ready");

  const statusColor = (s: string) => {
    if (s === "pending") return "bg-amber-500/15 text-amber-600 border-amber-500/30";
    if (s === "preparing") return "bg-blue-500/15 text-blue-600 border-blue-500/30";
    if (s === "ready") return "bg-green-500/15 text-green-600 border-green-500/30";
    return "bg-muted text-muted-foreground";
  };

  const renderTicket = (ticket: KOTTicket) => (
    <Card key={ticket.id} className="overflow-hidden animate-pop-in">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">T{ticket.table_number}</span>
            </div>
            <div>
              <p className="text-sm font-semibold">Table {ticket.table_number}</p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(ticket.created_at), "hh:mm a")}
              </p>
            </div>
          </div>
          <Badge variant="outline" className={`text-[10px] ${statusColor(ticket.status)}`}>
            {ticket.status}
          </Badge>
        </div>

        <div className="space-y-1.5 border-t pt-2">
          {ticket.items.map((item, i) => (
            <div key={i} className="flex items-start justify-between text-sm">
              <div>
                <span className="font-medium">{item.name}</span>
                <span className="text-muted-foreground ml-1">×{item.quantity}</span>
                {item.special_instructions && (
                  <p className="text-[10px] text-amber-600 mt-0.5">⚡ {item.special_instructions}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-1">
          {ticket.status === "pending" && (
            <Button size="sm" className="flex-1 gap-1 gradient-btn-primary" onClick={() => updateStatus(ticket.id, "preparing")}>
              <ChefHat className="h-3.5 w-3.5" /> Start
            </Button>
          )}
          {ticket.status === "preparing" && (
            <Button size="sm" className="flex-1 gap-1" variant="default" onClick={() => updateStatus(ticket.id, "ready")}
              style={{ background: "linear-gradient(135deg, #10B981, #059669)", color: "white" }}>
              <Check className="h-3.5 w-3.5" /> Ready
            </Button>
          )}
          {ticket.status === "ready" && (
            <Button size="sm" className="flex-1 gap-1" variant="outline" onClick={() => updateStatus(ticket.id, "served")}>
              <Check className="h-3.5 w-3.5" /> Served
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" /> Incoming Orders (KOT)
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {tickets.length} ticket(s) today · {pending.length} pending
        </p>
      </div>

      {tickets.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ChefHat className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No incoming orders yet today</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-amber-600 flex items-center gap-1.5">
              <Clock className="h-4 w-4" /> Pending ({pending.length})
            </h2>
            {pending.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">All clear!</p>
            ) : pending.map(renderTicket)}
          </div>
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-blue-600 flex items-center gap-1.5">
              <ChefHat className="h-4 w-4" /> Preparing ({preparing.length})
            </h2>
            {preparing.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Nothing cooking</p>
            ) : preparing.map(renderTicket)}
          </div>
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-green-600 flex items-center gap-1.5">
              <Check className="h-4 w-4" /> Ready ({ready.length})
            </h2>
            {ready.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">None ready</p>
            ) : ready.map(renderTicket)}
          </div>
        </div>
      )}
    </div>
  );
};

export default IncomingOrders;
