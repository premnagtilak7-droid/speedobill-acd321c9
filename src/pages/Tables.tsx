import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Users, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Table {
  id: string;
  table_number: number;
  capacity: number;
  status: string;
  section_name: string;
}

const statusColors: Record<string, string> = {
  empty: "border-green-500 bg-green-500/10",
  occupied: "border-red-500 bg-red-500/10",
  reserved: "border-blue-500 bg-blue-500/10",
  cleaning: "border-yellow-500 bg-yellow-500/10",
};

const statusDots: Record<string, string> = {
  empty: "bg-green-500",
  occupied: "bg-red-500",
  reserved: "bg-blue-500",
  cleaning: "bg-yellow-500",
};

const Tables = () => {
  const { hotelId, role } = useAuth();
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newCount, setNewCount] = useState("1");
  const navigate = useNavigate();

  const fetchTables = useCallback(async () => {
    if (!hotelId) return;
    const { data } = await supabase
      .from("restaurant_tables")
      .select("id, table_number, capacity, status, section_name")
      .eq("hotel_id", hotelId)
      .order("table_number");
    setTables(data || []);
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { fetchTables(); }, [fetchTables]);

  // Realtime subscription
  useEffect(() => {
    if (!hotelId) return;
    const channel = supabase.channel("tables-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurant_tables", filter: `hotel_id=eq.${hotelId}` }, () => fetchTables())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [hotelId, fetchTables]);

  const addTables = async () => {
    const count = parseInt(newCount);
    if (!count || count < 1 || !hotelId) return;
    const maxNum = tables.length > 0 ? Math.max(...tables.map(t => t.table_number)) : 0;
    const inserts = Array.from({ length: count }, (_, i) => ({
      hotel_id: hotelId,
      table_number: maxNum + i + 1,
    }));
    const { error } = await supabase.from("restaurant_tables").insert(inserts);
    if (error) toast.error(error.message);
    else { toast.success(`${count} table(s) added`); fetchTables(); }
    setAddOpen(false);
    setNewCount("1");
  };

  const deleteTable = async (id: string) => {
    const { error } = await supabase.from("restaurant_tables").delete().eq("id", id);
    if (error) toast.error(error.message);
    else fetchTables();
  };

  const isOwner = role === "owner";

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Tables</h1>
        {isOwner && (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Tables
          </Button>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(statusDots).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className={`h-2.5 w-2.5 rounded-full ${color}`} />
            <span className="capitalize text-muted-foreground">{status}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : tables.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No tables yet. Add some to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {tables.map(table => (
            <div
              key={table.id}
              onClick={() => table.status !== "empty" ? null : null}
              className={`glass-card border-2 ${statusColors[table.status] || statusColors.empty} p-3 text-center cursor-pointer hover:scale-[1.02] transition-transform relative group`}
            >
              <p className="text-lg font-bold tnum text-foreground">T{table.table_number}</p>
              <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                <Users className="h-3 w-3" /> {table.capacity}
              </div>
              <p className="text-[10px] capitalize text-muted-foreground mt-1">{table.status}</p>
              {isOwner && (
                <button
                  onClick={e => { e.stopPropagation(); deleteTable(table.id); }}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 rounded bg-destructive/10 text-destructive transition-opacity"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle>Add Tables</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input type="number" placeholder="Number of tables" value={newCount} onChange={e => setNewCount(e.target.value)} min="1" max="50" />
            <Button className="w-full" onClick={addTables}>Add</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Tables;
