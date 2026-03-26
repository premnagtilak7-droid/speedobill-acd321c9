import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle2, ChefHat } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface KotTicket {
  id: string;
  order_id: string;
  table_id: string;
  status: string;
  created_at: string;
  items: { id: string; name: string; quantity: number; special_instructions?: string }[];
  tableNumber?: number;
}

const KitchenView = () => {
  const { hotelId, user } = useAuth();
  const [tickets, setTickets] = useState<KotTicket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = useCallback(async () => {
    if (!hotelId) return;
    const { data: kots } = await supabase
      .from("kot_tickets")
      .select("id, order_id, table_id, status, created_at")
      .eq("hotel_id", hotelId)
      .in("status", ["pending", "preparing"])
      .order("created_at", { ascending: true });

    if (!kots || kots.length === 0) { setTickets([]); setLoading(false); return; }

    const kotIds = kots.map(k => k.id);
    const tableIds = [...new Set(kots.map(k => k.table_id))];

    const [itemsRes, tablesRes] = await Promise.all([
      supabase.from("kot_items").select("id, kot_id, name, quantity, special_instructions").in("kot_id", kotIds),
      supabase.from("restaurant_tables").select("id, table_number").in("id", tableIds),
    ]);

    const tableMap = Object.fromEntries((tablesRes.data || []).map(t => [t.id, t.table_number]));
    const itemsMap: Record<string, any[]> = {};
    (itemsRes.data || []).forEach(item => {
      if (!itemsMap[item.kot_id]) itemsMap[item.kot_id] = [];
      itemsMap[item.kot_id].push(item);
    });

    setTickets(kots.map(k => ({
      ...k,
      items: itemsMap[k.id] || [],
      tableNumber: tableMap[k.table_id],
    })));
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  useEffect(() => {
    if (!hotelId) return;
    const channel = supabase.channel("kitchen-kots")
      .on("postgres_changes", { event: "*", schema: "public", table: "kot_tickets", filter: `hotel_id=eq.${hotelId}` }, () => fetchTickets())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [hotelId, fetchTickets]);

  const updateStatus = async (kotId: string, newStatus: string) => {
    const updates: any = { status: newStatus };
    if (newStatus === "preparing") { updates.claimed_by = user?.id; updates.claimed_at = new Date().toISOString(); }
    if (newStatus === "ready") { updates.ready_at = new Date().toISOString(); }
    const { error } = await supabase.from("kot_tickets").update(updates).eq("id", kotId);
    if (error) toast.error(error.message);
    else fetchTickets();
  };

  const pending = tickets.filter(t => t.status === "pending");
  const preparing = tickets.filter(t => t.status === "preparing");

  const KotCard = ({ ticket }: { ticket: KotTicket }) => (
    <div className={`glass-card p-4 space-y-3 rounded-2xl transition-all duration-200 ${ticket.status === "pending" ? "glow-border-pending" : "glow-border-preparing"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">Table {ticket.tableNumber}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${ticket.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
            {ticket.status}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
        </span>
      </div>
      <div className="space-y-1">
        {ticket.items.map(item => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-foreground">{item.quantity}× {item.name}</span>
            {item.special_instructions && (
              <span className="text-[10px] text-amber-600 italic">{item.special_instructions}</span>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        {ticket.status === "pending" && (
          <Button size="sm" variant="outline" className="flex-1" onClick={() => updateStatus(ticket.id, "preparing")}>
            Start Preparing
          </Button>
        )}
        {ticket.status === "preparing" && (
          <Button size="sm" className="flex-1" onClick={() => updateStatus(ticket.id, "ready")}>
            <CheckCircle2 className="h-4 w-4 mr-1" /> Mark Ready
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center gap-2">
        <ChefHat className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold text-foreground">Kitchen Display</h1>
        <span className="text-xs text-muted-foreground ml-auto">{tickets.length} active tickets</span>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-32 glass-card animate-pulse" />)}
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <ChefHat className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="text-sm">No pending orders. Kitchen is clear!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h2 className="label-caps">Pending ({pending.length})</h2>
            {pending.map(t => <KotCard key={t.id} ticket={t} />)}
          </div>
          <div className="space-y-3">
            <h2 className="label-caps">Preparing ({preparing.length})</h2>
            {preparing.map(t => <KotCard key={t.id} ticket={t} />)}
          </div>
        </div>
      )}
    </div>
  );
};

export default KitchenView;
