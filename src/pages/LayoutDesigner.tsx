import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Save, Trash2, Layers, GripVertical, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface TableItem {
  id: string;
  table_number: number;
  capacity: number;
  status: string;
  section_name: string;
  position_x: number;
  position_y: number;
}

interface Section {
  id: string;
  name: string;
  color: string;
}

const statusColors: Record<string, string> = {
  empty: "border-table-empty bg-table-empty/20 dark:bg-table-empty/15",
  occupied: "border-table-occupied bg-table-occupied/20 dark:bg-table-occupied/15",
  reserved: "border-table-reserved bg-table-reserved/20 dark:bg-table-reserved/15",
  cleaning: "border-table-cleaning bg-table-cleaning/20 dark:bg-table-cleaning/15",
};

const statusDots: Record<string, string> = {
  empty: "bg-table-empty",
  occupied: "bg-table-occupied",
  reserved: "bg-table-reserved",
  cleaning: "bg-table-cleaning",
};

const LayoutDesigner = () => {
  const { hotelId } = useAuth();
  const canvasRef = useRef<HTMLDivElement>(null);

  const [tables, setTables] = useState<TableItem[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [activeSection, setActiveSection] = useState("All");
  const [loading, setLoading] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Add table dialog
  const [addOpen, setAddOpen] = useState(false);
  const [newCapacity, setNewCapacity] = useState("4");
  const [newSection, setNewSection] = useState("Main");

  // Add section dialog
  const [sectionOpen, setSectionOpen] = useState(false);
  const [sectionName, setSectionName] = useState("");
  const [sectionColor, setSectionColor] = useState("#F97316");

  const fetchData = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    const [tablesRes, sectionsRes] = await Promise.all([
      supabase.from("restaurant_tables")
        .select("id, table_number, capacity, status, section_name, position_x, position_y")
        .eq("hotel_id", hotelId).order("table_number"),
      supabase.from("floor_sections")
        .select("id, name, color")
        .eq("hotel_id", hotelId).order("sort_order"),
    ]);
    setTables(tablesRes.data || []);
    setSections(sectionsRes.data || []);
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  // Real-time subscription
  useEffect(() => {
    if (!hotelId) return;
    const ch = supabase
      .channel("layout-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurant_tables", filter: `hotel_id=eq.${hotelId}` }, () => void fetchData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [hotelId, fetchData]);

  const filteredTables = activeSection === "All" ? tables : tables.filter(t => t.section_name === activeSection);
  const allSectionNames = ["All", ...new Set(sections.map(s => s.name)), ...new Set(tables.map(t => t.section_name))].filter((v, i, a) => a.indexOf(v) === i);

  // Drag handlers
  const handlePointerDown = (e: React.PointerEvent, table: TableItem) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDraggingId(table.id);
    setDragOffset({
      x: e.clientX - rect.left - table.position_x,
      y: e.clientY - rect.top - table.position_y,
    });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width - 80, e.clientX - rect.left - dragOffset.x));
    const y = Math.max(0, Math.min(rect.height - 80, e.clientY - rect.top - dragOffset.y));
    setTables(prev => prev.map(t => t.id === draggingId ? { ...t, position_x: Math.round(x), position_y: Math.round(y) } : t));
  };

  const handlePointerUp = async () => {
    if (!draggingId) return;
    const table = tables.find(t => t.id === draggingId);
    if (table) {
      await supabase.from("restaurant_tables")
        .update({ position_x: table.position_x, position_y: table.position_y })
        .eq("id", table.id);
    }
    setDraggingId(null);
  };

  const addTable = async () => {
    if (!hotelId) return;
    const maxNum = tables.length > 0 ? Math.max(...tables.map(t => t.table_number)) : 0;
    const { error } = await supabase.from("restaurant_tables").insert({
      hotel_id: hotelId,
      table_number: maxNum + 1,
      capacity: Number(newCapacity) || 4,
      section_name: newSection || "Main",
      position_x: 50 + Math.random() * 300,
      position_y: 50 + Math.random() * 200,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`Table ${maxNum + 1} added`);
    setAddOpen(false);
    await fetchData();
  };

  const deleteTable = async (id: string) => {
    if (!confirm("Delete this table?")) return;
    await supabase.from("restaurant_tables").delete().eq("id", id);
    toast.success("Table deleted");
    await fetchData();
  };

  const addSection = async () => {
    if (!hotelId || !sectionName.trim()) return;
    const sortOrder = sections.length;
    const { error } = await supabase.from("floor_sections").insert({
      hotel_id: hotelId, name: sectionName.trim(), color: sectionColor, sort_order: sortOrder,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`Section "${sectionName}" added`);
    setSectionOpen(false); setSectionName(""); setSectionColor("#F97316");
    await fetchData();
  };

  const resetPositions = async () => {
    if (!confirm("Reset all table positions to grid layout?")) return;
    const cols = 6;
    const gap = 120;
    for (let i = 0; i < tables.length; i++) {
      const x = (i % cols) * gap + 30;
      const y = Math.floor(i / cols) * gap + 30;
      await supabase.from("restaurant_tables").update({ position_x: x, position_y: y }).eq("id", tables[i].id);
    }
    toast.success("Positions reset");
    await fetchData();
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            Layout Designer
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Drag tables to arrange your floor plan</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={resetPositions} className="glass-card border-border/50">
            <RotateCcw className="h-4 w-4 mr-1" /> Reset Grid
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSectionOpen(true)} className="glass-card border-border/50">
            <Layers className="h-4 w-4 mr-1" /> Add Section
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)} className="gradient-btn-primary">
            <Plus className="h-4 w-4 mr-1" /> Add Table
          </Button>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {allSectionNames.map(name => (
          <button
            key={name}
            onClick={() => setActiveSection(name)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
              activeSection === name
                ? "gradient-btn-primary text-white shadow-md"
                : "glass-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground glass-card px-4 py-2.5 w-fit">
        {[
          { label: "Available", color: "bg-table-empty" },
          { label: "Occupied", color: "bg-table-occupied" },
          { label: "Reserved", color: "bg-table-reserved" },
          { label: "Cleaning", color: "bg-table-cleaning" },
        ].map(s => (
          <span key={s.label} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
            {s.label}
          </span>
        ))}
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="relative w-full glass-panel overflow-hidden"
        style={{ minHeight: 500, height: "calc(100vh - 300px)" }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.06] dark:opacity-[0.04]" style={{
          backgroundImage: "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }} />

        {filteredTables.map(table => {
          const style = statusColors[table.status] || statusColors.empty;
          const dot = statusDots[table.status] || statusDots.empty;
          return (
            <motion.div
              key={table.id}
              className={`absolute cursor-grab active:cursor-grabbing select-none border-2 rounded-xl ${style} glass-card hover-lift flex flex-col items-center justify-center transition-shadow`}
              style={{
                left: table.position_x,
                top: table.position_y,
                width: 90,
                height: 80,
                zIndex: draggingId === table.id ? 50 : 1,
              }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onPointerDown={e => handlePointerDown(e, table)}
            >
              <GripVertical className="h-3 w-3 text-muted-foreground/40 absolute top-1 right-1" />
              <span className="text-lg font-bold text-foreground">{table.table_number}</span>
              <span className="text-[10px] text-muted-foreground">{table.capacity} seats</span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${dot}`} />
                <span className="text-[9px] capitalize text-muted-foreground">{table.status}</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deleteTable(table.id); }}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity shadow-sm"
                style={{ opacity: 0.7 }}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </motion.div>
          );
        })}

        {filteredTables.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <p>No tables in this section. Click "Add Table" to begin.</p>
          </div>
        )}
      </div>

      {/* Add Table Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="glass-panel border-border/40">
          <DialogHeader><DialogTitle>Add New Table</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Capacity</label>
              <Input value={newCapacity} onChange={e => setNewCapacity(e.target.value)} type="number" min="1" placeholder="4" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Section</label>
              <Select value={newSection} onValueChange={setNewSection}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Main", ...sections.map(s => s.name)].filter((v, i, a) => a.indexOf(v) === i).map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addTable} className="w-full gradient-btn-primary">Add Table</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Section Dialog */}
      <Dialog open={sectionOpen} onOpenChange={setSectionOpen}>
        <DialogContent className="glass-panel border-border/40">
          <DialogHeader><DialogTitle>Add Floor Section</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Section Name</label>
              <Input value={sectionName} onChange={e => setSectionName(e.target.value)} placeholder="e.g. Terrace, Hall, Patio" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Color</label>
              <input type="color" value={sectionColor} onChange={e => setSectionColor(e.target.value)} className="w-full h-10 rounded-lg cursor-pointer" />
            </div>
            <Button onClick={addSection} className="w-full gradient-btn-primary">Create Section</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LayoutDesigner;
