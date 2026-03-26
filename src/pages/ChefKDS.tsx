import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChefHat, Clock, CheckCircle2, Flame, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface KotTicket {
  id: string;
  order_id: string;
  table_id: string;
  status: string;
  created_at: string;
  claimed_by: string | null;
  claimed_at: string | null;
  ready_at: string | null;
}

interface KotItem {
  id: string;
  kot_id: string;
  name: string;
  quantity: number;
  price: number;
  special_instructions: string | null;
}

interface TableInfo {
  id: string;
  table_number: number;
}

const URGENT_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

const ChefKDS = () => {
  const { hotelId, user } = useAuth();
  const [tickets, setTickets] = useState<KotTicket[]>([]);
  const [items, setItems] = useState<Record<string, KotItem[]>>({});
  const [tables, setTables] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  // Tick every 30s to update urgency
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(iv);
  }, []);

  const fetchData = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    const { data: kots } = await supabase
      .from("kot_tickets")
      .select("*")
      .eq("hotel_id", hotelId)
      .in("status", ["pending", "preparing", "ready"])
      .order("created_at", { ascending: true });

    const kotList = (kots || []) as KotTicket[];
    setTickets(kotList);

    // Fetch items for all tickets
    if (kotList.length > 0) {
      const ids = kotList.map(k => k.id);
      const { data: allItems } = await supabase
        .from("kot_items")
        .select("*")
        .in("kot_id", ids);
      const grouped: Record<string, KotItem[]> = {};
      (allItems || []).forEach(item => {
        if (!grouped[item.kot_id]) grouped[item.kot_id] = [];
        grouped[item.kot_id].push(item as KotItem);
      });
      setItems(grouped);
    }

    // Fetch table numbers
    const tableIds = [...new Set(kotList.map(k => k.table_id))];
    if (tableIds.length > 0) {
      const { data: tbls } = await supabase
        .from("restaurant_tables")
        .select("id, table_number")
        .in("id", tableIds);
      const map: Record<string, number> = {};
      (tbls || []).forEach(t => { map[t.id] = t.table_number; });
      setTables(map);
    }

    setLoading(false);
  }, [hotelId]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  // Real-time
  useEffect(() => {
    if (!hotelId) return;
    const ch = supabase
      .channel("kds-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "kot_tickets", filter: `hotel_id=eq.${hotelId}` }, () => void fetchData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [hotelId, fetchData]);

  const updateStatus = async (kotId: string, newStatus: string) => {
    const updates: any = { status: newStatus };
    if (newStatus === "preparing") {
      updates.claimed_by = user?.id;
      updates.claimed_at = new Date().toISOString();
    }
    if (newStatus === "ready") {
      updates.ready_at = new Date().toISOString();
    }
    await supabase.from("kot_tickets").update(updates).eq("id", kotId);
    toast.success(`Marked as ${newStatus}`);
    await fetchData();
  };

  const dismissReady = async (kotId: string) => {
    await supabase.from("kot_tickets").update({ status: "served" }).eq("id", kotId);
    toast.success("Served & dismissed");
    await fetchData();
  };

  const pending = tickets.filter(t => t.status === "pending");
  const preparing = tickets.filter(t => t.status === "preparing");
  const ready = tickets.filter(t => t.status === "ready");

  const getElapsedMin = (createdAt: string) => Math.floor((now - new Date(createdAt).getTime()) / 60000);
  const isUrgent = (createdAt: string) => (now - new Date(createdAt).getTime()) > URGENT_THRESHOLD_MS;

  const KotCard = ({ ticket }: { ticket: KotTicket }) => {
    const elapsed = getElapsedMin(ticket.created_at);
    const urgent = isUrgent(ticket.created_at);
    const kotItems = items[ticket.id] || [];
    const tableNum = tables[ticket.table_id] || "?";

    const borderClass = ticket.status === "ready"
      ? "glow-border-ready"
      : ticket.status === "preparing"
        ? "glow-border-preparing"
        : urgent
          ? "animate-pulse-glow border-destructive"
          : "glow-border-pending";

    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={`glass-card p-4 space-y-3 ${borderClass} ${urgent && ticket.status === "pending" ? "animate-pulse-glow" : ""}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-foreground">T-{tableNum}</span>
            {urgent && ticket.status !== "ready" && (
              <Badge className="bg-destructive text-destructive-foreground text-[10px] animate-pulse gap-1">
                <AlertTriangle className="h-3 w-3" /> URGENT
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span className={`font-mono ${urgent ? "text-destructive font-bold" : ""}`}>{elapsed}m</span>
          </div>
        </div>

        {/* Items */}
        <div className="space-y-1.5">
          {kotItems.map(item => (
            <div key={item.id} className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{item.quantity}×</span>
                  <span className="text-sm text-foreground truncate">{item.name}</span>
                </div>
                {item.special_instructions && (
                  <p className="text-[11px] text-warning italic ml-6">⚠ {item.special_instructions}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          {ticket.status === "pending" && (
            <Button size="sm" className="flex-1 h-9 gradient-btn-primary" onClick={() => updateStatus(ticket.id, "preparing")}>
              <Flame className="h-4 w-4 mr-1" /> Start Cooking
            </Button>
          )}
          {ticket.status === "preparing" && (
            <Button size="sm" className="flex-1 h-9 bg-success hover:bg-success/90 text-success-foreground" onClick={() => updateStatus(ticket.id, "ready")}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Mark Ready
            </Button>
          )}
          {ticket.status === "ready" && (
            <Button size="sm" variant="outline" className="flex-1 h-9" onClick={() => dismissReady(ticket.id)}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Served
            </Button>
          )}
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen mesh-gradient-bg p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-btn-primary flex items-center justify-center">
            <ChefHat className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Kitchen Display</h1>
            <p className="text-xs text-muted-foreground">{tickets.length} active ticket{tickets.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} className="glass-card">
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* Pending */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <div className="w-3 h-3 rounded-full bg-warning" />
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Pending</h2>
            <Badge variant="secondary" className="text-[10px]">{pending.length}</Badge>
          </div>
          <AnimatePresence>
            {pending.map(t => <KotCard key={t.id} ticket={t} />)}
          </AnimatePresence>
          {pending.length === 0 && (
            <div className="glass-card p-8 text-center text-sm text-muted-foreground">No pending orders</div>
          )}
        </div>

        {/* Preparing */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Preparing</h2>
            <Badge variant="secondary" className="text-[10px]">{preparing.length}</Badge>
          </div>
          <AnimatePresence>
            {preparing.map(t => <KotCard key={t.id} ticket={t} />)}
          </AnimatePresence>
          {preparing.length === 0 && (
            <div className="glass-card p-8 text-center text-sm text-muted-foreground">None cooking</div>
          )}
        </div>

        {/* Ready */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <div className="w-3 h-3 rounded-full bg-success" />
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Ready</h2>
            <Badge variant="secondary" className="text-[10px]">{ready.length}</Badge>
          </div>
          <AnimatePresence>
            {ready.map(t => <KotCard key={t.id} ticket={t} />)}
          </AnimatePresence>
          {ready.length === 0 && (
            <div className="glass-card p-8 text-center text-sm text-muted-foreground">Nothing ready yet</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChefKDS;
