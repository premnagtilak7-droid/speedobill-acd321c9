import { useAuth } from "@/hooks/useAuth";
import { useGridDensity } from "@/hooks/useGridDensity";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Plus,
  Users,
  Trash2,
  Search,
  Minus,
  Printer,
  MessageCircle,
  Send,
  X,
  UtensilsCrossed,
  Grid3X3,
  Square,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";

interface Table {
  id: string;
  table_number: number;
  capacity: number;
  status: string;
  section_name: string;
}

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  image_url?: string | null;
  is_available: boolean;
}

interface OrderLine {
  key: string;
  name: string;
  price: number;
  quantity: number;
  source: "menu" | "custom";
}

interface HotelInfo {
  name: string;
  address: string | null;
  phone: string | null;
  tax_percent: number;
  gst_enabled: boolean;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

const statusStyles: Record<string, { card: React.CSSProperties; dot: React.CSSProperties }> = {
  empty: {
    card: {
      borderColor: "hsl(var(--success) / 0.35)",
      backgroundColor: "hsl(var(--success) / 0.08)",
    },
    dot: { backgroundColor: "hsl(var(--success))" },
  },
  occupied: {
    card: {
      borderColor: "hsl(var(--destructive) / 0.35)",
      backgroundColor: "hsl(var(--destructive) / 0.08)",
    },
    dot: { backgroundColor: "hsl(var(--destructive))" },
  },
  reserved: {
    card: {
      borderColor: "hsl(var(--primary) / 0.35)",
      backgroundColor: "hsl(var(--primary) / 0.08)",
    },
    dot: { backgroundColor: "hsl(var(--primary))" },
  },
  cleaning: {
    card: {
      borderColor: "hsl(var(--warning) / 0.45)",
      backgroundColor: "hsl(var(--warning) / 0.10)",
    },
    dot: { backgroundColor: "hsl(var(--warning))" },
  },
};

const Tables = () => {
  const { user, hotelId, role } = useAuth();
  const { density, setDensity } = useGridDensity("qb_tables_density");

  const [tables, setTables] = useState<Table[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [hotelInfo, setHotelInfo] = useState<HotelInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [panelLoading, setPanelLoading] = useState(false);
  const [savingMode, setSavingMode] = useState<"save" | "kds" | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [newCount, setNewCount] = useState("1");

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<OrderLine[]>([]);
  const [discountPercent, setDiscountPercent] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "upi">("cash");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");

  const isOwner = role === "owner";

  const fetchTables = useCallback(async () => {
    if (!hotelId) return;

    const { data, error } = await supabase
      .from("restaurant_tables")
      .select("id, table_number, capacity, status, section_name")
      .eq("hotel_id", hotelId)
      .order("table_number");

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    setTables(data || []);
    setLoading(false);
  }, [hotelId]);

  const fetchSetupData = useCallback(async () => {
    if (!hotelId) return;

    setLoading(true);
    const [tablesRes, menuRes, hotelRes] = await Promise.all([
      supabase
        .from("restaurant_tables")
        .select("id, table_number, capacity, status, section_name")
        .eq("hotel_id", hotelId)
        .order("table_number"),
      supabase
        .from("menu_items")
        .select("id, name, category, price, image_url, is_available")
        .eq("hotel_id", hotelId)
        .eq("is_available", true)
        .order("category")
        .order("name"),
      supabase
        .from("hotels")
        .select("name, address, phone, tax_percent, gst_enabled")
        .eq("id", hotelId)
        .maybeSingle(),
    ]);

    if (tablesRes.error) toast.error(tablesRes.error.message);
    if (menuRes.error) toast.error(menuRes.error.message);
    if (hotelRes.error) toast.error(hotelRes.error.message);

    setTables(tablesRes.data || []);
    setMenuItems((menuRes.data || []) as MenuItem[]);
    setHotelInfo((hotelRes.data as HotelInfo | null) || null);
    setLoading(false);
  }, [hotelId]);

  useEffect(() => {
    void fetchSetupData();
  }, [fetchSetupData]);

  useEffect(() => {
    if (!hotelId) return;

    const channel = supabase
      .channel("tables-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "restaurant_tables", filter: `hotel_id=eq.${hotelId}` },
        () => void fetchTables(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hotelId, fetchTables]);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(menuItems.map((item) => item.category).filter(Boolean)))],
    [menuItems],
  );

  const filteredMenu = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCategory = activeCategory === "all" || item.category === activeCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = !q || item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, activeCategory, searchQuery]);

  const itemCount = useMemo(
    () => orderItems.reduce((sum, item) => sum + item.quantity, 0),
    [orderItems],
  );

  const subtotal = useMemo(
    () => orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [orderItems],
  );

  const discountValue = useMemo(() => {
    const parsed = Number(discountPercent || 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [discountPercent]);

  const discountAmount = useMemo(
    () => subtotal * Math.min(Math.max(discountValue, 0), 100) / 100,
    [subtotal, discountValue],
  );

  const taxPercent = hotelInfo?.gst_enabled ? Number(hotelInfo.tax_percent || 0) : 0;
  const taxAmount = useMemo(() => ((subtotal - discountAmount) * taxPercent) / 100, [subtotal, discountAmount, taxPercent]);
  const grandTotal = useMemo(() => subtotal - discountAmount + taxAmount, [subtotal, discountAmount, taxAmount]);

  const resetPanelState = () => {
    setSelectedTable(null);
    setSearchQuery("");
    setActiveCategory("all");
    setActiveOrderId(null);
    setOrderItems([]);
    setDiscountPercent("0");
    setPaymentMethod("cash");
    setCustomerPhone("");
    setCustomName("");
    setCustomPrice("");
  };

  const loadTableWorkspace = useCallback(
    async (table: Table) => {
      if (!hotelId) return;

      setSelectedTable(table);
      setPanelLoading(true);
      setActiveOrderId(null);
      setOrderItems([]);
      setDiscountPercent("0");
      setPaymentMethod("cash");

      try {
        const { data: activeOrder, error: orderError } = await supabase
          .from("orders")
          .select("id, discount_percent, payment_method")
          .eq("hotel_id", hotelId)
          .eq("table_id", table.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (orderError) throw orderError;

        if (!activeOrder) {
          setPanelLoading(false);
          return;
        }

        const { data: items, error: itemsError } = await supabase
          .from("order_items")
          .select("id, name, price, quantity, is_custom")
          .eq("order_id", activeOrder.id);

        if (itemsError) throw itemsError;

        setActiveOrderId(activeOrder.id);
        setDiscountPercent(String(activeOrder.discount_percent ?? 0));
        setPaymentMethod(((activeOrder.payment_method as "cash" | "card" | "upi") || "cash"));
        setOrderItems(
          (items || []).map((item) => ({
            key: item.id,
            name: item.name,
            price: Number(item.price || 0),
            quantity: item.quantity || 1,
            source: item.is_custom ? "custom" : "menu",
          })),
        );
      } catch (error: any) {
        toast.error(error.message || "Failed to open table");
      } finally {
        setPanelLoading(false);
      }
    },
    [hotelId],
  );

  const addTables = async () => {
    const count = parseInt(newCount, 10);
    if (!count || count < 1 || !hotelId) return;

    const maxNum = tables.length > 0 ? Math.max(...tables.map((table) => table.table_number)) : 0;
    const inserts = Array.from({ length: count }, (_, index) => ({
      hotel_id: hotelId,
      table_number: maxNum + index + 1,
    }));

    const { error } = await supabase.from("restaurant_tables").insert(inserts);
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(`${count} table(s) added`);
    setAddOpen(false);
    setNewCount("1");
    await fetchTables();
  };

  const deleteTable = async (id: string) => {
    const { error } = await supabase.from("restaurant_tables").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Table deleted");
    await fetchTables();
  };

  const addMenuItemToOrder = (item: MenuItem) => {
    setOrderItems((prev) => {
      const existing = prev.find((line) => line.key === `menu-${item.id}`);
      if (existing) {
        return prev.map((line) =>
          line.key === `menu-${item.id}` ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }

      return [
        ...prev,
        {
          key: `menu-${item.id}`,
          name: item.name,
          price: Number(item.price || 0),
          quantity: 1,
          source: "menu",
        },
      ];
    });
  };

  const updateQuantity = (key: string, delta: number) => {
    setOrderItems((prev) =>
      prev
        .map((item) => (item.key === key ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0),
    );
  };

  const removeLineItem = (key: string) => {
    setOrderItems((prev) => prev.filter((item) => item.key !== key));
  };

  const addCustomItem = () => {
    const price = Number(customPrice);
    if (!customName.trim() || !Number.isFinite(price) || price <= 0) {
      toast.error("Enter custom item name and valid price");
      return;
    }

    setOrderItems((prev) => [
      ...prev,
      {
        key: `custom-${Date.now()}`,
        name: customName.trim(),
        price,
        quantity: 1,
        source: "custom",
      },
    ]);
    setCustomName("");
    setCustomPrice("");
  };

  const buildReceiptText = () => {
    if (!selectedTable) return "";

    const lines: string[] = [];
    lines.push("═".repeat(32));
    lines.push((hotelInfo?.name || "SPEEDOBILL").toUpperCase());
    if (hotelInfo?.address) lines.push(hotelInfo.address);
    if (hotelInfo?.phone) lines.push(`Tel: ${hotelInfo.phone}`);
    lines.push("═".repeat(32));
    lines.push(`Table: ${selectedTable.table_number}`);
    lines.push(`Date: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);
    lines.push(`Payment: ${paymentMethod.toUpperCase()}`);
    lines.push("─".repeat(32));
    lines.push("Item                 Qty  Amount");
    lines.push("─".repeat(32));

    orderItems.forEach((item) => {
      const name = item.name.slice(0, 20).padEnd(20, " ");
      const qty = String(item.quantity).padStart(3, " ");
      const amount = `₹${(item.price * item.quantity).toFixed(2)}`.padStart(8, " ");
      lines.push(`${name} ${qty} ${amount}`);
    });

    lines.push("─".repeat(32));
    lines.push(`Subtotal:           ${formatCurrency(subtotal)}`);
    if (discountValue > 0) lines.push(`Discount (${discountValue}%):    -${formatCurrency(discountAmount)}`);
    if (taxPercent > 0) lines.push(`GST (${taxPercent}%):         ${formatCurrency(taxAmount)}`);
    lines.push("═".repeat(32));
    lines.push(`TOTAL:              ${formatCurrency(grandTotal)}`);
    lines.push("═".repeat(32));
    lines.push("   Thank you! Visit again.");

    return lines.join("\n");
  };

  const handlePrint = () => {
    if (!selectedTable || orderItems.length === 0) {
      toast.error("Add items before printing");
      return;
    }

    const receipt = buildReceiptText();
    const popup = window.open("", "_blank", "width=380,height=700");
    if (!popup) {
      toast.error("Popup blocked. Please allow popups to print.");
      return;
    }

    popup.document.write(`
      <html>
        <head>
          <title>Receipt - Table ${selectedTable.table_number}</title>
          <style>
            body { font-family: 'Courier New', monospace; padding: 12px; white-space: pre-wrap; line-height: 1.45; font-size: 12px; }
            pre { margin: 0; }
          </style>
        </head>
        <body><pre>${receipt}</pre></body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  const handleWhatsApp = () => {
    if (!orderItems.length) {
      toast.error("Add items before sending");
      return;
    }

    const phone = customerPhone.replace(/\D/g, "");
    if (!phone) {
      toast.error("Enter customer WhatsApp number");
      return;
    }

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(buildReceiptText())}`, "_blank");
  };

  const handleSplitBill = async () => {
    if (!orderItems.length) {
      toast.error("Add items before splitting");
      return;
    }

    const splitInto = Number(window.prompt("Split into how many bills?", "2"));
    if (!splitInto || splitInto < 2) return;

    const perGuest = grandTotal / splitInto;
    const text = `Split bill for Table ${selectedTable?.table_number}: ${splitInto} guests × ${formatCurrency(perGuest)} each`;

    try {
      await navigator.clipboard.writeText(text);
      toast.success(`Split summary copied: ${formatCurrency(perGuest)} each`);
    } catch {
      toast.success(text);
    }
  };

  const persistOrder = async (sendToKds: boolean) => {
    if (!selectedTable || !hotelId || !user) return;
    if (!orderItems.length) {
      toast.error("Add at least one item first");
      return;
    }

    setSavingMode(sendToKds ? "kds" : "save");

    try {
      let orderId = activeOrderId;

      if (orderId) {
        const { error: updateError } = await supabase
          .from("orders")
          .update({
            total: grandTotal,
            discount_percent: discountValue,
            payment_method: paymentMethod,
          })
          .eq("id", orderId);

        if (updateError) throw updateError;

        const { error: deleteItemsError } = await supabase.from("order_items").delete().eq("order_id", orderId);
        if (deleteItemsError) throw deleteItemsError;
      } else {
        const { data: createdOrder, error: createError } = await supabase
          .from("orders")
          .insert({
            hotel_id: hotelId,
            table_id: selectedTable.id,
            waiter_id: user.id,
            total: grandTotal,
            discount_percent: discountValue,
            payment_method: paymentMethod,
            order_source: "dine-in",
            status: "active",
          })
          .select("id")
          .single();

        if (createError) throw createError;
        orderId = createdOrder.id;
        setActiveOrderId(orderId);
      }

      const orderPayload = orderItems.map((item) => ({
        order_id: orderId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        is_custom: item.source === "custom",
      }));

      const { error: orderItemsError } = await supabase.from("order_items").insert(orderPayload);
      if (orderItemsError) throw orderItemsError;

      const { error: tableError } = await supabase
        .from("restaurant_tables")
        .update({ status: "occupied" })
        .eq("id", selectedTable.id);
      if (tableError) throw tableError;

      if (sendToKds && orderId) {
        const { data: kot, error: kotError } = await supabase
          .from("kot_tickets")
          .insert({
            hotel_id: hotelId,
            order_id: orderId,
            table_id: selectedTable.id,
            status: "pending",
          })
          .select("id")
          .single();

        if (kotError) throw kotError;

        const kotPayload = orderItems.map((item) => ({
          kot_id: kot.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          special_instructions: "",
        }));

        const { error: kotItemsError } = await supabase.from("kot_items").insert(kotPayload);
        if (kotItemsError) throw kotItemsError;
      }

      toast.success(sendToKds ? "Order saved and sent to KDS" : "Order saved successfully");
      await fetchTables();
      setSelectedTable((prev) => (prev ? { ...prev, status: "occupied" } : prev));
    } catch (error: any) {
      toast.error(error.message || "Unable to save order");
    } finally {
      setSavingMode(null);
    }
  };

  const renderMenuCard = (item: MenuItem) => {
    const quantity = orderItems.find((line) => line.key === `menu-${item.id}`)?.quantity || 0;

    return (
      <button
        key={item.id}
        onClick={() => addMenuItemToOrder(item)}
        className={`group relative overflow-hidden rounded-2xl border border-primary/40 bg-card text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-lg ${
          density === "compact" ? "min-h-[148px] p-3" : "min-h-[192px] p-4"
        }`}
      >
        {quantity > 0 && (
          <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-md">
            {quantity}
          </div>
        )}
        <div className="flex h-full flex-col">
          <div className={`mb-3 flex items-center justify-center rounded-xl border border-border bg-muted/60 ${density === "compact" ? "h-20" : "h-28"}`}>
            {item.image_url ? (
              <img src={item.image_url} alt={item.name} className="h-full w-full rounded-xl object-cover" loading="lazy" />
            ) : (
              <UtensilsCrossed className="h-7 w-7 text-muted-foreground/50" />
            )}
          </div>
          <div className="mt-auto">
            <p className="truncate text-sm font-semibold text-foreground">{item.name}</p>
            <p className="text-xs text-muted-foreground">{item.category}</p>
            <p className="mt-1 text-sm font-bold text-primary">{formatCurrency(Number(item.price || 0))}</p>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Tables</h1>
          <p className="text-sm text-muted-foreground">Tap any table to open live ordering, billing, KDS, print, and WhatsApp.</p>
        </div>
        {isOwner && (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Add Tables
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(statusStyles).map(([status, styles]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full" style={styles.dot} />
            <span className="capitalize text-muted-foreground">{status}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      ) : tables.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <Users className="mx-auto mb-3 h-12 w-12 opacity-30" />
          <p className="text-sm">No tables yet. Add some to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
          {tables.map((table) => {
            const styles = statusStyles[table.status] || statusStyles.empty;

            return (
              <div
                key={table.id}
                onClick={() => void loadTableWorkspace(table)}
                className="group relative cursor-pointer rounded-2xl border-2 p-4 text-center shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                style={styles.card}
              >
                <p className="text-lg font-bold text-foreground">T{table.table_number}</p>
                <div className="mt-1 flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
                  <Users className="h-3 w-3" /> {table.capacity}
                </div>
                <p className="mt-1 text-[10px] capitalize text-muted-foreground">{table.status}</p>
                <p className="mt-2 truncate text-[10px] text-muted-foreground">{table.section_name || "Main"}</p>

                {isOwner && (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      void deleteTable(table.id);
                    }}
                    className="absolute right-2 top-2 rounded-lg bg-card/80 p-1 text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Add Tables</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="number"
              placeholder="Number of tables"
              value={newCount}
              onChange={(event) => setNewCount(event.target.value)}
              min="1"
              max="50"
            />
            <Button className="w-full" onClick={addTables}>
              Add Tables
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedTable)} onOpenChange={(open) => !open && resetPanelState()}>
        <DialogContent className="max-h-[92vh] max-w-[1220px] overflow-hidden border-border bg-card p-0 text-card-foreground">
          <DialogHeader className="sr-only">
            <DialogTitle>{selectedTable ? `Table ${selectedTable.table_number} order` : "Table order"}</DialogTitle>
          </DialogHeader>

          {selectedTable && (
            <div className="flex h-full max-h-[92vh] flex-col">
              <div className="border-b border-border bg-card px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-semibold text-foreground">Table {selectedTable.table_number} — Order</h2>
                      {activeOrderId && <Badge className="bg-primary text-primary-foreground">Active Order</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">Build the bill, send items to KDS, print receipt, or share on WhatsApp.</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                      {itemCount} items
                    </Badge>
                    <button
                      onClick={() => setDensity("compact")}
                      className={`rounded-xl border p-2 transition-colors ${density === "compact" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                      aria-label="Compact menu view"
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDensity("visual")}
                      className={`rounded-xl border p-2 transition-colors ${density === "visual" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                      aria-label="Visual menu view"
                    >
                      <Square className="h-4 w-4" />
                    </button>
                    <button
                      onClick={resetPanelState}
                      className="rounded-xl border border-border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {panelLoading ? (
                <div className="flex min-h-[60vh] items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : (
                <div className="grid flex-1 gap-0 overflow-hidden lg:grid-cols-[1.5fr_0.95fr]">
                  <div className="overflow-y-auto border-b border-border p-4 lg:border-b-0 lg:border-r">
                    <div className="sticky top-0 z-10 mb-4 space-y-3 bg-card pb-3">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={searchQuery}
                          onChange={(event) => setSearchQuery(event.target.value)}
                          placeholder="Search menu..."
                          className="pl-9"
                        />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {categories.map((category) => (
                          <button
                            key={category}
                            onClick={() => setActiveCategory(category)}
                            className={`rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                              activeCategory === category
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary text-secondary-foreground hover:bg-muted"
                            }`}
                          >
                            {category === "all" ? "All" : category}
                          </button>
                        ))}
                      </div>
                    </div>

                    {filteredMenu.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
                        No menu items match your search.
                      </div>
                    ) : (
                      <div className={`grid gap-3 ${density === "compact" ? "grid-cols-2 xl:grid-cols-3" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-2"}`}>
                        {filteredMenu.map(renderMenuCard)}
                      </div>
                    )}
                  </div>

                  <div className="overflow-y-auto bg-background/30 p-4">
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-border bg-card p-4">
                        <p className="mb-3 text-sm font-semibold text-foreground">Add Custom Item</p>
                        <div className="flex gap-2">
                          <Input
                            value={customName}
                            onChange={(event) => setCustomName(event.target.value)}
                            placeholder="Item name"
                            className="flex-1"
                          />
                          <Input
                            value={customPrice}
                            onChange={(event) => setCustomPrice(event.target.value)}
                            placeholder="Price"
                            type="number"
                            min="0"
                            className="w-28"
                          />
                          <Button type="button" variant="outline" size="icon" onClick={addCustomItem}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-border bg-card p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4 text-primary" />
                            <p className="text-sm font-semibold text-foreground">Order Items</p>
                            <Badge variant="secondary">{itemCount}</Badge>
                          </div>
                        </div>

                        {orderItems.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                            Tap menu items to start the bill.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {orderItems.map((item) => (
                              <div key={item.key} className="grid grid-cols-[1fr_auto] gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0">
                                <div>
                                  <p className="text-sm font-medium text-foreground">{item.name}</p>
                                  <p className="text-xs text-muted-foreground">{item.source === "custom" ? "Custom item" : "Menu item"}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => updateQuantity(item.key, -1)}
                                    className="rounded-md border border-border p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </button>
                                  <span className="w-6 text-center text-sm font-semibold text-foreground">{item.quantity}</span>
                                  <button
                                    onClick={() => updateQuantity(item.key, 1)}
                                    className="rounded-md border border-border p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                  <span className="w-20 text-right text-sm font-medium text-foreground">
                                    {formatCurrency(item.price * item.quantity)}
                                  </span>
                                  <button
                                    onClick={() => removeLineItem(item.key)}
                                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}

                            <div className="space-y-2 border-t border-border pt-3 text-sm">
                              <div className="flex items-center justify-between text-muted-foreground">
                                <span>Subtotal</span>
                                <span>{formatCurrency(subtotal)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-3 text-muted-foreground">
                                <span>Discount</span>
                                <div className="flex items-center gap-2">
                                  <Input
                                    value={discountPercent}
                                    onChange={(event) => setDiscountPercent(event.target.value)}
                                    type="number"
                                    min="0"
                                    max="100"
                                    className="h-9 w-20 text-right"
                                  />
                                  <span>%</span>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-muted-foreground">
                                <span>Tax ({taxPercent}%)</span>
                                <span>{formatCurrency(taxAmount)}</span>
                              </div>
                              <div className="flex items-center justify-between border-t border-border pt-2 text-lg font-bold text-foreground">
                                <span>Total</span>
                                <span>{formatCurrency(grandTotal)}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="rounded-2xl border border-border bg-card p-4">
                        <p className="mb-3 text-sm font-semibold text-foreground">Bill Actions</p>
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-2">
                            {(["cash", "card", "upi"] as const).map((method) => (
                              <button
                                key={method}
                                onClick={() => setPaymentMethod(method)}
                                className={`rounded-xl border px-3 py-2 text-xs font-medium capitalize transition-colors ${
                                  paymentMethod === method
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                                }`}
                              >
                                {method}
                              </button>
                            ))}
                          </div>

                          <div className="flex gap-2">
                            <Input
                              value={customerPhone}
                              onChange={(event) => setCustomerPhone(event.target.value)}
                              placeholder="WhatsApp number"
                              className="flex-1"
                            />
                            <Button type="button" variant="outline" onClick={handleWhatsApp}>
                              <MessageCircle className="mr-2 h-4 w-4" /> Send
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <Button type="button" className="gradient-btn-primary h-11" onClick={() => void persistOrder(false)} disabled={savingMode !== null}>
                              {savingMode === "save" ? "Saving..." : "Save Order"}
                            </Button>
                            <Button type="button" variant="outline" className="h-11" onClick={() => void persistOrder(true)} disabled={savingMode !== null}>
                              <Send className="mr-2 h-4 w-4" /> {savingMode === "kds" ? "Sending..." : "KDS"}
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <Button type="button" variant="outline" className="h-10" onClick={handlePrint}>
                              <Printer className="mr-2 h-4 w-4" /> Print
                            </Button>
                            <Button type="button" variant="ghost" className="h-10" onClick={handleSplitBill}>
                              Split Bill
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
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Tables;
