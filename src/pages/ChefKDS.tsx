import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChefHat, Clock, CheckCircle2, Flame, AlertTriangle, RefreshCw, Package, XCircle } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

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

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  min_threshold: number;
}

interface MenuItem {
  id: string;
  name: string;
  is_available: boolean;
}

const URGENT_THRESHOLD_MS = 15 * 60 * 1000;

const ChefKDS = () => {
  const { hotelId, user } = useAuth();
  const [tickets, setTickets] = useState<KotTicket[]>([]);
  const [items, setItems] = useState<Record<string, KotItem[]>>({});
  const [tables, setTables] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [activeTab, setActiveTab] = useState("orders");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [ingredientsLoading, setIngredientsLoading] = useState(false);
  const [togglingItem, setTogglingItem] = useState<string | null>(null);

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

  const fetchIngredients = useCallback(async () => {
    if (!hotelId) return;
    setIngredientsLoading(true);
    const [ingRes, menuRes] = await Promise.all([
      supabase.from("ingredients").select("id, name, unit, current_stock, min_threshold").eq("hotel_id", hotelId).order("name"),
      supabase.from("menu_items").select("id, name, is_available").eq("hotel_id", hotelId).order("name"),
    ]);
    setIngredients((ingRes.data || []) as Ingredient[]);
    setMenuItems((menuRes.data || []) as MenuItem[]);
    setIngredientsLoading(false);
  }, [hotelId]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  useEffect(() => {
    if (activeTab === "inventory") void fetchIngredients();
  }, [activeTab, fetchIngredients]);

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

  const toggleMenuAvailability = async (itemId: string, currentlyAvailable: boolean) => {
    setTogglingItem(itemId);
    const { error } = await supabase.from("menu_items").update({ is_available: !currentlyAvailable }).eq("id", itemId);
    if (error) {
      toast.error("Failed to update. Only owners can change availability.");
    } else {
      toast.success(!currentlyAvailable ? "Item back in stock" : "Item marked Out of Stock");
      setMenuItems(prev => prev.map(m => m.id === itemId ? { ...m, is_available: !currentlyAvailable } : m));
    }
    setTogglingItem(null);
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

  const lowStockIngredients = ingredients.filter(i => i.current_stock <= i.min_threshold);
  const oosMenuItems = menuItems.filter(m => !m.is_available);

  return (
    <div className="min-h-screen mesh-gradient-bg p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-btn-primary flex items-center justify-center">
            <ChefHat className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Kitchen Display</h1>
            <p className="text-xs text-muted-foreground">{tickets.length} active ticket{tickets.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => activeTab === "orders" ? fetchData() : fetchIngredients()} className="glass-card">
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="glass-card">
          <TabsTrigger value="orders" className="gap-1.5">
            <ChefHat className="h-4 w-4" /> Orders
            {tickets.length > 0 && <Badge variant="secondary" className="text-[10px] ml-1">{tickets.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-1.5">
            <Package className="h-4 w-4" /> Stock
            {lowStockIngredients.length > 0 && (
              <Badge className="bg-destructive text-destructive-foreground text-[10px] ml-1">{lowStockIngredients.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Orders Tab */}
        <TabsContent value="orders">
          {loading ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
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
          )}
        </TabsContent>

        {/* Inventory / Stock Tab */}
        <TabsContent value="inventory">
          {ingredientsLoading ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Ingredient Stock Levels */}
              <div className="space-y-3">
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2 px-1">
                  <Package className="h-4 w-4 text-primary" /> Ingredient Stock
                </h2>
                {ingredients.length === 0 ? (
                  <div className="glass-card p-8 text-center text-sm text-muted-foreground">No ingredients configured</div>
                ) : (
                  <div className="space-y-2">
                    {ingredients.map(ing => {
                      const isLow = ing.current_stock <= ing.min_threshold;
                      return (
                        <div key={ing.id} className={`glass-card p-3 flex items-center justify-between ${isLow ? "border-destructive/50 border" : ""}`}>
                          <div>
                            <p className="text-sm font-medium text-foreground">{ing.name}</p>
                            <p className="text-xs text-muted-foreground">{ing.current_stock} {ing.unit} remaining</p>
                          </div>
                          {isLow && (
                            <Badge className="bg-destructive/10 text-destructive text-[10px] gap-1">
                              <AlertTriangle className="h-3 w-3" /> LOW
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Menu Item OOS Toggle */}
              <div className="space-y-3">
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2 px-1">
                  <XCircle className="h-4 w-4 text-destructive" /> Menu Availability
                  {oosMenuItems.length > 0 && <Badge className="bg-destructive text-destructive-foreground text-[10px]">{oosMenuItems.length} OOS</Badge>}
                </h2>
                {menuItems.length === 0 ? (
                  <div className="glass-card p-8 text-center text-sm text-muted-foreground">No menu items found</div>
                ) : (
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {menuItems.map(item => (
                      <div key={item.id} className={`glass-card p-3 flex items-center justify-between ${!item.is_available ? "border-destructive/40 border opacity-70" : ""}`}>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-sm font-medium truncate ${!item.is_available ? "line-through text-muted-foreground" : "text-foreground"}`}>
                            {item.name}
                          </span>
                          {!item.is_available && (
                            <Badge variant="destructive" className="text-[10px] shrink-0">OOS</Badge>
                          )}
                        </div>
                        <Switch
                          checked={item.is_available}
                          disabled={togglingItem === item.id}
                          onCheckedChange={() => toggleMenuAvailability(item.id, item.is_available)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ChefKDS;
