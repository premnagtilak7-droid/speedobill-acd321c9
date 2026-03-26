import { useAuth } from "@/hooks/useAuth";
import { useGridDensity } from "@/hooks/useGridDensity";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Users, Trash2, Search, Minus, Printer, MessageCircle, Send, X,
  UtensilsCrossed, Grid3X3, LayoutGrid, ShoppingCart, CalendarCheck, Check, Sparkles,
} from "lucide-react";
import { toast } from "sonner";

/* ────────── types ────────── */
interface Table { id: string; table_number: number; capacity: number; status: string; section_name: string; }
interface MenuItem { id: string; name: string; category: string; price: number; image_url?: string | null; is_available: boolean; }
interface OrderLine { key: string; name: string; price: number; quantity: number; source: "menu" | "custom"; }
interface HotelInfo { name: string; address: string | null; phone: string | null; tax_percent: number; gst_enabled: boolean; upi_qr_url: string | null; }

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(v);

/* Stroke-only table styles with subtle tint */
const tableStyles: Record<string, { border: string; dot: string; statusText: string; label: string; bg: string }> = {
  empty:    { border: "border-emerald-500", dot: "bg-emerald-500", statusText: "text-emerald-600 dark:text-emerald-400", label: "Empty",    bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  occupied: { border: "border-red-500",     dot: "bg-red-500",     statusText: "text-red-600 dark:text-red-400",         label: "Occupied", bg: "bg-red-50 dark:bg-red-950/30" },
  reserved: { border: "border-blue-500",    dot: "bg-blue-500",    statusText: "text-blue-600 dark:text-blue-400",       label: "Reserved", bg: "bg-blue-50 dark:bg-blue-950/30" },
  cleaning: { border: "border-yellow-500",  dot: "bg-yellow-500",  statusText: "text-yellow-600 dark:text-yellow-400",   label: "Cleaning", bg: "bg-yellow-50 dark:bg-yellow-950/30" },
};

const Tables = () => {
  const { user, hotelId, role } = useAuth();
  const { density, setDensity } = useGridDensity("qb_tables_density");
  const isOwner = role === "owner";

  /* ── data ── */
  const [tables, setTables] = useState<Table[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [hotelInfo, setHotelInfo] = useState<HotelInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [panelLoading, setPanelLoading] = useState(false);
  const [savingMode, setSavingMode] = useState<"save" | "kds" | "bill" | null>(null);

  /* ── dialogs ── */
  const [addOpen, setAddOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [newCount, setNewCount] = useState("1");
  const [reserveOpen, setReserveOpen] = useState(false);

  /* ── reservation form ── */
  const [resTableId, setResTableId] = useState("");
  const [resName, setResName] = useState("");
  const [resPhone, setResPhone] = useState("");
  const [resGuests, setResGuests] = useState("2");
  const [resNotes, setResNotes] = useState("");
  const [resTime, setResTime] = useState("");

  /* ── order state ── */
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<OrderLine[]>([]);
  const [discountPercent, setDiscountPercent] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi">("cash");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [tableSplit, setTableSplit] = useState("none");
  const [showUpiQr, setShowUpiQr] = useState(false);

  /* ────────── data fetching ────────── */
  const fetchTables = useCallback(async () => {
    if (!hotelId) return;
    const { data } = await supabase
      .from("restaurant_tables").select("id, table_number, capacity, status, section_name")
      .eq("hotel_id", hotelId).order("table_number");
    setTables(data || []);
    setLoading(false);
  }, [hotelId]);

  const fetchSetupData = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    const [tablesRes, menuRes, hotelRes] = await Promise.all([
      supabase.from("restaurant_tables").select("id, table_number, capacity, status, section_name").eq("hotel_id", hotelId).order("table_number"),
      supabase.from("menu_items").select("id, name, category, price, image_url, is_available").eq("hotel_id", hotelId).eq("is_available", true).order("category").order("name"),
      supabase.from("hotels").select("name, address, phone, tax_percent, gst_enabled, upi_qr_url").eq("id", hotelId).maybeSingle(),
    ]);
    setTables(tablesRes.data || []);
    setMenuItems((menuRes.data || []) as MenuItem[]);
    setHotelInfo((hotelRes.data as HotelInfo | null) || null);
    setLoading(false);
  }, [hotelId]);

  useEffect(() => { void fetchSetupData(); }, [fetchSetupData]);

  useEffect(() => {
    if (!hotelId) return;
    const ch = supabase
      .channel("tables-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurant_tables", filter: `hotel_id=eq.${hotelId}` }, () => void fetchTables())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [hotelId, fetchTables]);

  /* ────────── derived ────────── */
  const categories = useMemo(() => ["all", ...Array.from(new Set(menuItems.map((i) => i.category).filter(Boolean)))], [menuItems]);
  const filteredMenu = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return menuItems.filter((i) => {
      const cat = activeCategory === "all" || i.category === activeCategory;
      const search = !q || i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q);
      return cat && search;
    });
  }, [menuItems, activeCategory, searchQuery]);

  const itemCount = useMemo(() => orderItems.reduce((s, i) => s + i.quantity, 0), [orderItems]);
  const subtotal = useMemo(() => orderItems.reduce((s, i) => s + i.price * i.quantity, 0), [orderItems]);
  const discountValue = Number(discountPercent || 0) || 0;
  const discountAmount = subtotal * Math.min(Math.max(discountValue, 0), 100) / 100;
  const taxPercent = hotelInfo?.gst_enabled ? Number(hotelInfo.tax_percent || 0) : 0;
  const taxAmount = ((subtotal - discountAmount) * taxPercent) / 100;
  const grandTotal = subtotal - discountAmount + taxAmount;

  /* ────────── panel helpers ────────── */
  const resetPanelState = () => {
    setSelectedTable(null); setSearchQuery(""); setActiveCategory("all");
    setActiveOrderId(null); setOrderItems([]); setDiscountPercent("0");
    setPaymentMethod("cash"); setCustomerPhone(""); setCustomName(""); setCustomPrice("");
    setTableSplit("none"); setShowUpiQr(false);
  };

  const splitLabel = tableSplit === "none" ? null : tableSplit;

  const loadTableWorkspace = useCallback(async (table: Table) => {
    if (!hotelId) return;
    setSelectedTable(table); setPanelLoading(true);
    setActiveOrderId(null); setOrderItems([]); setDiscountPercent("0"); setPaymentMethod("cash"); setTableSplit("none");
    try {
      // Load order for the current split (default = no split)
      let query = supabase
        .from("orders").select("id, discount_percent, payment_method, split_label")
        .eq("hotel_id", hotelId).eq("table_id", table.id).eq("status", "active")
        .order("created_at", { ascending: false }).limit(1);
      // First try to load the "no split" order
      query = query.is("split_label", null);
      const { data: activeOrder } = await query.maybeSingle();
      if (!activeOrder) { setPanelLoading(false); return; }
      const { data: items } = await supabase.from("order_items").select("id, name, price, quantity, is_custom").eq("order_id", activeOrder.id);
      setActiveOrderId(activeOrder.id);
      setDiscountPercent(String(activeOrder.discount_percent ?? 0));
      setPaymentMethod((activeOrder.payment_method as "cash" | "upi") || "cash");
      setTableSplit(activeOrder.split_label || "none");
      setOrderItems((items || []).map((i) => ({ key: i.id, name: i.name, price: Number(i.price || 0), quantity: i.quantity || 1, source: i.is_custom ? "custom" as const : "menu" as const })));
    } catch (e: any) { toast.error(e.message || "Failed to open table"); } finally { setPanelLoading(false); }
  }, [hotelId]);

  /* Load a specific seat's order */
  const loadSeatOrder = useCallback(async (seat: string) => {
    if (!selectedTable || !hotelId) return;
    setTableSplit(seat);
    setActiveOrderId(null); setOrderItems([]); setDiscountPercent("0");
    const seatLabel = seat === "none" ? null : seat;
    try {
      let query = supabase
        .from("orders").select("id, discount_percent, payment_method, split_label")
        .eq("hotel_id", hotelId).eq("table_id", selectedTable.id).eq("status", "active")
        .order("created_at", { ascending: false }).limit(1);
      if (seatLabel) query = query.eq("split_label", seatLabel);
      else query = query.is("split_label", null);
      const { data: order } = await query.maybeSingle();
      if (!order) return;
      const { data: items } = await supabase.from("order_items").select("id, name, price, quantity, is_custom").eq("order_id", order.id);
      setActiveOrderId(order.id);
      setDiscountPercent(String(order.discount_percent ?? 0));
      setPaymentMethod((order.payment_method as "cash" | "upi") || "cash");
      setOrderItems((items || []).map((i) => ({ key: i.id, name: i.name, price: Number(i.price || 0), quantity: i.quantity || 1, source: i.is_custom ? "custom" as const : "menu" as const })));
    } catch {}
  }, [selectedTable, hotelId]);

  /* ────────── reservation ────────── */
  const handleReserve = async () => {
    if (!hotelId || !user || !resName.trim()) { toast.error("Enter customer name"); return; }
    const tableId = resTableId || null;
    const time = resTime || new Date().toISOString();
    const { error } = await supabase.from("reservations").insert({
      hotel_id: hotelId, customer_name: resName.trim(), customer_phone: resPhone,
      guest_count: Number(resGuests) || 2, table_id: tableId, notes: resNotes || null,
      reservation_time: time, created_by: user.id, status: "pending",
    });
    if (error) { toast.error(error.message); return; }
    if (tableId) {
      await supabase.from("restaurant_tables").update({ status: "reserved" }).eq("id", tableId);
    }
    toast.success("Table reserved!");
    setReserveOpen(false); setResTableId(""); setResName(""); setResPhone(""); setResGuests("2"); setResNotes(""); setResTime("");
    await fetchTables();
  };

  /* ────────── table actions ────────── */
  const addTables = async () => {
    const count = parseInt(newCount, 10);
    if (!count || count < 1 || !hotelId) return;
    const maxNum = tables.length > 0 ? Math.max(...tables.map((t) => t.table_number)) : 0;
    const inserts = Array.from({ length: count }, (_, i) => ({ hotel_id: hotelId, table_number: maxNum + i + 1 }));
    const { error } = await supabase.from("restaurant_tables").insert(inserts);
    if (error) { toast.error(error.message); return; }
    toast.success(`${count} table(s) added`);
    setAddOpen(false); setNewCount("1"); await fetchTables();
  };

  const deleteTable = async (id: string) => {
    const { error } = await supabase.from("restaurant_tables").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    // Auto-renumber all remaining tables sequentially
    if (hotelId) {
      const { data: remaining } = await supabase
        .from("restaurant_tables").select("id, table_number")
        .eq("hotel_id", hotelId).order("table_number");
      if (remaining) {
        const updates = remaining.map((t, idx) => ({ id: t.id, newNum: idx + 1 })).filter((u, idx) => remaining[idx].table_number !== u.newNum);
        for (const u of updates) {
          await supabase.from("restaurant_tables").update({ table_number: u.newNum }).eq("id", u.id);
        }
      }
    }
    toast.success("Table deleted & renumbered"); await fetchTables();
  };

  const markCleaningDone = async (tableId: string) => {
    await supabase.from("restaurant_tables").update({ status: "empty" }).eq("id", tableId);
    toast.success("Table is now empty"); await fetchTables();
  };

  /* ────────── order item helpers ────────── */
  const addMenuItemToOrder = (item: MenuItem) => {
    setOrderItems((prev) => {
      const k = `menu-${item.id}`;
      const existing = prev.find((l) => l.key === k);
      if (existing) return prev.map((l) => l.key === k ? { ...l, quantity: l.quantity + 1 } : l);
      return [...prev, { key: k, name: item.name, price: Number(item.price || 0), quantity: 1, source: "menu" as const }];
    });
  };
  const updateQuantity = (key: string, delta: number) => {
    setOrderItems((prev) => prev.map((i) => i.key === key ? { ...i, quantity: i.quantity + delta } : i).filter((i) => i.quantity > 0));
  };
  const removeLineItem = (key: string) => setOrderItems((prev) => prev.filter((i) => i.key !== key));
  const addCustomItem = () => {
    const price = Number(customPrice);
    if (!customName.trim() || !Number.isFinite(price) || price <= 0) { toast.error("Enter valid custom item"); return; }
    setOrderItems((prev) => [...prev, { key: `custom-${Date.now()}`, name: customName.trim(), price, quantity: 1, source: "custom" }]);
    setCustomName(""); setCustomPrice("");
  };

  /* ────────── receipt ────────── */
  const buildReceiptText = () => {
    if (!selectedTable) return "";
    const l: string[] = [];
    l.push("═".repeat(32));
    l.push((hotelInfo?.name || "SPEEDOBILL").toUpperCase());
    if (hotelInfo?.address) l.push(hotelInfo.address);
    if (hotelInfo?.phone) l.push(`Tel: ${hotelInfo.phone}`);
    l.push("═".repeat(32));
    l.push(`Table: ${selectedTable.table_number}${splitLabel ? ` (Seat ${splitLabel})` : ""}`);
    l.push(`Date: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);
    l.push(`Payment: ${paymentMethod.toUpperCase()}`);
    l.push("─".repeat(32));
    l.push("Item                 Qty  Amount");
    l.push("─".repeat(32));
    orderItems.forEach((i) => {
      l.push(`${i.name.slice(0, 20).padEnd(20)} ${String(i.quantity).padStart(3)} ${`₹${(i.price * i.quantity).toFixed(2)}`.padStart(8)}`);
    });
    l.push("─".repeat(32));
    l.push(`Subtotal:           ${formatCurrency(subtotal)}`);
    if (discountValue > 0) l.push(`Discount (${discountValue}%):    -${formatCurrency(discountAmount)}`);
    if (taxPercent > 0) l.push(`GST (${taxPercent}%):         ${formatCurrency(taxAmount)}`);
    l.push("═".repeat(32));
    l.push(`TOTAL:              ${formatCurrency(grandTotal)}`);
    l.push("═".repeat(32));
    l.push("   Thank you! Visit again.");
    return l.join("\n");
  };

  const handlePrint = () => {
    if (!orderItems.length) { toast.error("Add items first"); return; }
    const receipt = buildReceiptText();
    const popup = window.open("", "_blank", "width=380,height=700");
    if (!popup) { toast.error("Popup blocked"); return; }
    popup.document.write(`<html><head><title>Receipt</title><style>body{font-family:'Courier New',monospace;padding:12px;white-space:pre-wrap;font-size:12px;}</style></head><body><pre>${receipt}</pre></body></html>`);
    popup.document.close(); popup.focus(); popup.print();
  };

  const handleWhatsApp = () => {
    if (!orderItems.length) { toast.error("Add items first"); return; }
    const phone = customerPhone.replace(/\D/g, "");
    if (!phone) { toast.error("Enter WhatsApp number"); return; }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(buildReceiptText())}`, "_blank");
  };

  const handleSplitBill = () => {
    if (!orderItems.length) { toast.error("Add items first"); return; }
    const n = Number(window.prompt("Split into how many guests?", "2"));
    if (!n || n < 2) return;
    const each = grandTotal / n;
    toast.success(`Split: ${n} guests × ${formatCurrency(each)} each`);
  };

  /* ────────── persist order ────────── */
  const persistOrder = async (sendToKds: boolean) => {
    if (!selectedTable || !hotelId || !user || !orderItems.length) { toast.error("Add items first"); return; }
    setSavingMode(sendToKds ? "kds" : "save");
    try {
      let orderId = activeOrderId;
      if (orderId) {
        await supabase.from("orders").update({ total: grandTotal, discount_percent: discountValue, payment_method: paymentMethod, split_label: splitLabel }).eq("id", orderId);
        await supabase.from("order_items").delete().eq("order_id", orderId);
      } else {
        const { data: created, error } = await supabase.from("orders").insert({
          hotel_id: hotelId, table_id: selectedTable.id, waiter_id: user.id, total: grandTotal,
          discount_percent: discountValue, payment_method: paymentMethod, order_source: "dine-in", status: "active", split_label: splitLabel,
        }).select("id").single();
        if (error) throw error;
        orderId = created.id; setActiveOrderId(orderId);
      }
      await supabase.from("order_items").insert(orderItems.map((i) => ({ order_id: orderId, name: i.name, price: i.price, quantity: i.quantity, is_custom: i.source === "custom" })));
      await supabase.from("restaurant_tables").update({ status: "occupied" }).eq("id", selectedTable.id);
      if (sendToKds && orderId) {
        const { data: kot } = await supabase.from("kot_tickets").insert({ hotel_id: hotelId, order_id: orderId, table_id: selectedTable.id, status: "pending" }).select("id").single();
        if (kot) await supabase.from("kot_items").insert(orderItems.map((i) => ({ kot_id: kot.id, name: i.name, price: i.price, quantity: i.quantity })));
      }
      toast.success(sendToKds ? "Sent to KDS ✓" : "Order saved ✓");
      await fetchTables();
      setSelectedTable((p) => p ? { ...p, status: "occupied" } : p);
    } catch (e: any) { toast.error(e.message || "Save failed"); } finally { setSavingMode(null); }
  };

  /* ── settle / bill ── */
  const settleBill = async () => {
    if (!selectedTable || !activeOrderId || !hotelId) { toast.error("No active order to settle"); return; }
    setSavingMode("bill");
    try {
      await supabase.from("orders").update({ status: "billed", billed_at: new Date().toISOString() }).eq("id", activeOrderId);
      await supabase.from("sales").insert({ hotel_id: hotelId, order_id: activeOrderId, amount: grandTotal });
      // Check if any other active orders remain on this table (other seats)
      const { data: remaining } = await supabase.from("orders").select("id").eq("table_id", selectedTable.id).eq("status", "active").limit(1);
      if (!remaining || remaining.length === 0) {
        await supabase.from("restaurant_tables").update({ status: "cleaning" }).eq("id", selectedTable.id);
      }
      toast.success("Bill settled!");
      resetPanelState(); await fetchTables();
    } catch (e: any) { toast.error(e.message); } finally { setSavingMode(null); }
  };

  /* ────────── render menu card ────────── */
  const renderMenuCard = (item: MenuItem) => {
    const qty = orderItems.find((l) => l.key === `menu-${item.id}`)?.quantity || 0;
    if (density === "compact") {
      return (
        <button key={item.id} onClick={() => addMenuItemToOrder(item)}
          className="group relative flex flex-col items-center justify-center gap-1 rounded-xl border border-border bg-card p-3 text-center transition-all hover:border-primary hover:shadow-md aspect-square">
          {qty > 0 && <div className="absolute -right-1 -top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground animate-qty-badge-in">{qty}</div>}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
            {item.image_url ? <img src={item.image_url} alt="" className="h-full w-full rounded-lg object-cover" /> : <UtensilsCrossed className="h-4 w-4 text-muted-foreground/50" />}
          </div>
          <p className="w-full text-[11px] font-semibold text-foreground leading-tight line-clamp-2">{item.name}</p>
          <p className="text-xs font-bold text-primary">{formatCurrency(Number(item.price))}</p>
        </button>
      );
    }
    return (
      <button key={item.id} onClick={() => addMenuItemToOrder(item)}
        className="group relative overflow-hidden rounded-2xl border border-border bg-card p-3 text-center transition-all hover:border-primary hover:shadow-lg aspect-square flex flex-col items-center justify-center gap-1.5">
        {qty > 0 && <div className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow animate-qty-badge-in">{qty}</div>}
        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-muted">
          {item.image_url ? <img src={item.image_url} alt="" className="h-full w-full rounded-xl object-cover" /> : <UtensilsCrossed className="h-6 w-6 text-muted-foreground/40" />}
        </div>
        <p className="w-full text-sm font-semibold text-foreground leading-tight line-clamp-2">{item.name}</p>
        <p className="text-[10px] text-muted-foreground">{item.category}</p>
        <p className="text-sm font-bold text-primary">{formatCurrency(Number(item.price))}</p>
      </button>
    );
  };

  /* ════════════════════ RENDER ════════════════════ */
  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 md:p-6">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Tables</h1>
          <p className="text-sm text-muted-foreground">Tap a table to order · Cleaning → tap to mark empty</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setReserveOpen(true)}>
            <CalendarCheck className="mr-1 h-4 w-4" /> Reserve
          </Button>
          {isOwner && (
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Add Tables
            </Button>
          )}
        </div>
      </div>

      {/* status legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        {Object.entries(tableStyles).map(([status, s]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className={`h-3 w-3 rounded-full ${s.dot}`} />
            <span className="capitalize text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>

      {/* table grid */}
      {loading ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-secondary" />)}
        </div>
      ) : tables.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <Users className="mx-auto mb-3 h-12 w-12 opacity-30" />
          <p className="text-sm">No tables yet. Add some to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {tables.map((table) => {
            const s = tableStyles[table.status] || tableStyles.empty;
            return (
              <div key={table.id}
                onClick={() => table.status === "cleaning" ? markCleaningDone(table.id) : void loadTableWorkspace(table)}
                className={`group relative cursor-pointer rounded-2xl border-2 ${s.border} bg-card p-4 text-center shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}>
                <p className="text-2xl font-extrabold text-foreground">{table.table_number}</p>
                <div className="mt-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" /> {table.capacity}
                </div>
                <p className={`mt-1.5 text-[11px] font-semibold uppercase tracking-wider ${s.statusText}`}>{s.label}</p>
                {table.status === "cleaning" && (
                  <div className={`mt-2 flex items-center justify-center gap-1 text-xs font-bold ${s.statusText}`}>
                    <Check className="h-3.5 w-3.5" /> Tap = Empty
                  </div>
                )}
                {isOwner && (
                  <button onClick={(e) => { e.stopPropagation(); void deleteTable(table.id); }}
                    className="absolute right-1.5 top-1.5 rounded-full bg-muted p-1 text-destructive opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/10">
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add Tables Dialog ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle>Add Tables</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input type="number" placeholder="Number of tables" value={newCount} onChange={(e) => setNewCount(e.target.value)} min="1" max="50" />
            <Button className="w-full" onClick={addTables}>Add Tables</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Reservation Dialog ── */}
      <Dialog open={reserveOpen} onOpenChange={setReserveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Reserve a Table</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={resTableId} onValueChange={setResTableId}>
              <SelectTrigger><SelectValue placeholder="Select table (optional)" /></SelectTrigger>
              <SelectContent>
                {tables.filter((t) => t.status === "empty").map((t) => (
                  <SelectItem key={t.id} value={t.id}>Table {t.table_number}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Customer Name *" value={resName} onChange={(e) => setResName(e.target.value)} />
            <Input placeholder="Phone Number" value={resPhone} onChange={(e) => setResPhone(e.target.value)} />
            <Input placeholder="Guests" type="number" min="1" value={resGuests} onChange={(e) => setResGuests(e.target.value)} />
            <Input type="datetime-local" value={resTime} onChange={(e) => setResTime(e.target.value)} />
            <Input placeholder="Notes (optional)" value={resNotes} onChange={(e) => setResNotes(e.target.value)} />
            <Button className="w-full" onClick={handleReserve}>Confirm Reservation</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Order Panel (Sheet) ── */}
      <Sheet open={Boolean(selectedTable)} onOpenChange={(open) => !open && resetPanelState()}>
        <SheetContent side="right" className="w-full max-w-full p-0 sm:max-w-full md:max-w-[92vw] lg:max-w-[1200px] [&>button]:hidden">
          {selectedTable && (
            <div className="flex h-full flex-col">
              {/* header */}
              <div className="border-b border-border px-4 py-3 md:px-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-foreground">Table {selectedTable.table_number}</h2>
                      {splitLabel && <Badge className="bg-blue-500/15 text-blue-600 text-[10px]">Seat {splitLabel}</Badge>}
                      {activeOrderId && <Badge className="bg-primary/15 text-primary text-[10px]">Active</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">Select seat → add items → save/KDS → settle</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {/* Seat selector */}
                    <div className="flex items-center rounded-lg border border-border overflow-hidden">
                      {["none", "A", "B", "C", "D"].map((s) => (
                        <button key={s} onClick={() => void loadSeatOrder(s)}
                          className={`px-2.5 py-1.5 text-[11px] font-medium transition-colors ${tableSplit === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                          {s === "none" ? "All" : s}
                        </button>
                      ))}
                    </div>
                    <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-xs">{itemCount}</Badge>
                    <button onClick={() => setDensity("compact")} aria-label="Compact"
                      className={`rounded-lg border p-1.5 transition-colors ${density === "compact" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
                      <Grid3X3 className="h-4 w-4" />
                    </button>
                    <button onClick={() => setDensity("visual")} aria-label="Visual"
                      className={`rounded-lg border p-1.5 transition-colors ${density === "visual" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
                      <LayoutGrid className="h-4 w-4" />
                    </button>
                    <button onClick={resetPanelState} className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted" aria-label="Close">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {panelLoading ? (
                <div className="flex flex-1 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
              ) : (
                <div className="grid flex-1 gap-0 overflow-hidden lg:grid-cols-[1.5fr_1fr]">
                  {/* LEFT: menu */}
                  <div className="overflow-y-auto border-b border-border p-3 lg:border-b-0 lg:border-r md:p-4">
                    <div className="sticky top-0 z-10 mb-3 space-y-2 bg-card pb-2">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search menu..." className="pl-9 h-9" />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {categories.map((cat) => (
                          <button key={cat} onClick={() => setActiveCategory(cat)}
                            className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors ${activeCategory === cat ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted"}`}>
                            {cat === "all" ? "All" : cat}
                          </button>
                        ))}
                      </div>
                    </div>
                    {filteredMenu.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No items match.</div>
                    ) : (
                      <div className={`grid gap-2.5 ${density === "compact" ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" : "grid-cols-2 md:grid-cols-3"}`}>
                        {filteredMenu.map(renderMenuCard)}
                      </div>
                    )}
                  </div>

                  {/* RIGHT: order & billing */}
                  <div className="overflow-y-auto bg-background/30 p-3 md:p-4">
                    <div className="space-y-3">
                      {/* custom item */}
                      <div className="rounded-xl border border-border bg-card p-3">
                        <p className="mb-2 text-xs font-semibold text-foreground">Custom Item</p>
                        <div className="flex gap-2">
                          <Input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Name" className="flex-1 h-8 text-xs" />
                          <Input value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} placeholder="₹" type="number" className="w-20 h-8 text-xs" />
                          <Button size="icon" variant="outline" className="h-8 w-8" onClick={addCustomItem}><Plus className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>

                      {/* order items */}
                      <div className="rounded-xl border border-border bg-card p-3">
                        <div className="mb-2 flex items-center gap-2">
                          <ShoppingCart className="h-4 w-4 text-primary" />
                          <p className="text-xs font-semibold text-foreground">Order {splitLabel ? `(Seat ${splitLabel})` : ""}</p>
                          <Badge variant="secondary" className="text-[10px]">{itemCount}</Badge>
                        </div>
                        {orderItems.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">Tap menu items to start.</div>
                        ) : (
                          <div className="space-y-2">
                            {orderItems.map((item) => (
                              <div key={item.key} className="flex items-center justify-between gap-2 border-b border-border pb-2 last:border-0 last:pb-0">
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs font-medium text-foreground">{item.name}</p>
                                  <p className="text-[10px] text-muted-foreground">{item.source === "custom" ? "Custom" : "Menu"}</p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button onClick={() => updateQuantity(item.key, -1)} className="rounded border border-border p-0.5 text-muted-foreground hover:bg-muted"><Minus className="h-3 w-3" /></button>
                                  <span className="w-5 text-center text-xs font-bold">{item.quantity}</span>
                                  <button onClick={() => updateQuantity(item.key, 1)} className="rounded border border-border p-0.5 text-muted-foreground hover:bg-muted"><Plus className="h-3 w-3" /></button>
                                  <span className="w-16 text-right text-xs font-medium">{formatCurrency(item.price * item.quantity)}</span>
                                  <button onClick={() => removeLineItem(item.key)} className="p-0.5 text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
                                </div>
                              </div>
                            ))}
                            {/* totals */}
                            <div className="space-y-1 border-t border-border pt-2 text-xs">
                              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                              <div className="flex items-center justify-between text-muted-foreground">
                                <span>Discount</span>
                                <div className="flex items-center gap-1"><Input value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} type="number" min="0" max="100" className="h-7 w-16 text-right text-xs" /><span>%</span></div>
                              </div>
                              <div className="flex justify-between text-muted-foreground"><span>Tax ({taxPercent}%)</span><span>{formatCurrency(taxAmount)}</span></div>
                              <div className="flex justify-between border-t border-border pt-1.5 text-base font-bold text-foreground"><span>Total</span><span>{formatCurrency(grandTotal)}</span></div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* bill actions */}
                      <div className="rounded-xl border border-border bg-card p-3">
                        <p className="mb-2 text-xs font-semibold text-foreground">Bill Actions</p>
                        <div className="space-y-2">
                          {/* payment method */}
                          <div className="grid grid-cols-2 gap-2">
                            {(["cash", "upi"] as const).map((m) => (
                              <button key={m} onClick={() => { setPaymentMethod(m); setShowUpiQr(m === "upi"); }}
                                className={`rounded-lg border px-3 py-2 text-xs font-medium capitalize transition-colors ${paymentMethod === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
                                {m === "upi" ? "UPI / QR" : m}
                              </button>
                            ))}
                          </div>

                          {showUpiQr && hotelInfo?.upi_qr_url && (
                            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-center">
                              <p className="mb-2 text-xs font-medium text-foreground">Scan to Pay</p>
                              <img src={hotelInfo.upi_qr_url} alt="UPI QR" className="mx-auto h-40 w-40 rounded-lg object-contain" />
                            </div>
                          )}
                          {showUpiQr && !hotelInfo?.upi_qr_url && (
                            <div className="rounded-lg border border-dashed border-border p-3 text-center text-[11px] text-muted-foreground">
                              No UPI QR uploaded. Go to Settings → add UPI QR image.
                            </div>
                          )}

                          {/* WhatsApp */}
                          <div className="flex gap-2">
                            <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="WhatsApp number" className="flex-1 h-8 text-xs" />
                            <Button size="sm" variant="outline" className="h-8" onClick={handleWhatsApp}><MessageCircle className="mr-1 h-3.5 w-3.5" /> Send</Button>
                          </div>

                          {/* save / kds */}
                          <div className="grid grid-cols-2 gap-2">
                            <Button size="sm" className="h-9" onClick={() => void persistOrder(false)} disabled={savingMode !== null}>
                              {savingMode === "save" ? "Saving..." : "Save Order"}
                            </Button>
                            <Button size="sm" variant="outline" className="h-9" onClick={() => void persistOrder(true)} disabled={savingMode !== null}>
                              <Send className="mr-1 h-3.5 w-3.5" /> {savingMode === "kds" ? "Sending..." : "KDS"}
                            </Button>
                          </div>

                          {/* print / split / settle */}
                          <div className="grid grid-cols-3 gap-2">
                            <Button size="sm" variant="outline" className="h-9" onClick={handlePrint}><Printer className="mr-1 h-3.5 w-3.5" /> Print</Button>
                            <Button size="sm" variant="ghost" className="h-9" onClick={handleSplitBill}><Sparkles className="mr-1 h-3.5 w-3.5" /> Split</Button>
                            <Button size="sm" variant="default" className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={settleBill} disabled={!activeOrderId || savingMode !== null}>
                              {savingMode === "bill" ? "..." : "Settle"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Tables;
