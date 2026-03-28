import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  format, subDays, startOfDay, endOfDay, eachDayOfInterval, eachHourOfInterval,
  isToday, isYesterday, parseISO, startOfWeek, endOfWeek, startOfMonth, isSameDay
} from "date-fns";
import {
  BarChart3, TrendingUp, TrendingDown, IndianRupee, ShoppingCart,
  Users, UtensilsCrossed, Clock, ArrowUpRight, ArrowDownRight,
  CreditCard, Banknote, Smartphone, Receipt, ChefHat, Star,
  CalendarDays, Filter
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

const COLORS = {
  primary: "hsl(25, 95%, 53%)",
  success: "hsl(142, 71%, 45%)",
  warning: "hsl(38, 92%, 50%)",
  danger: "hsl(0, 72%, 51%)",
  info: "hsl(187, 79%, 43%)",
  purple: "hsl(263, 70%, 58%)",
  indigo: "hsl(239, 84%, 67%)",
  pink: "hsl(330, 81%, 60%)",
  teal: "hsl(168, 76%, 42%)",
};

const PIE_COLORS = [COLORS.primary, COLORS.success, COLORS.info, COLORS.warning, COLORS.purple, COLORS.pink, COLORS.teal, COLORS.indigo];

type DateRange = "today" | "yesterday" | "7days" | "30days" | "this_month" | "this_week";

const DATE_RANGES: { value: DateRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This Week" },
  { value: "7days", label: "Last 7 Days" },
  { value: "this_month", label: "This Month" },
  { value: "30days", label: "Last 30 Days" },
];

function getDateBounds(range: DateRange) {
  const now = new Date();
  switch (range) {
    case "today": return { from: startOfDay(now), to: endOfDay(now) };
    case "yesterday": { const y = subDays(now, 1); return { from: startOfDay(y), to: endOfDay(y) }; }
    case "this_week": return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfDay(now) };
    case "7days": return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case "this_month": return { from: startOfMonth(now), to: endOfDay(now) };
    case "30days": return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
  }
}

function fmtCurrency(n: number) {
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function pctChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

// ─── Stat Card ───
function StatCard({ title, value, icon: Icon, change, prefix = "", suffix = "", loading }: {
  title: string; value: number | string; icon: any; change?: number;
  prefix?: string; suffix?: string; loading?: boolean;
}) {
  const isUp = (change ?? 0) >= 0;
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        {loading ? (
          <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-7 w-32" /></div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
              <div className="p-1.5 rounded-lg bg-primary/10"><Icon className="h-4 w-4 text-primary" /></div>
            </div>
            <p className="text-2xl font-bold">{prefix}{typeof value === "number" ? value.toLocaleString("en-IN") : value}{suffix}</p>
            {change !== undefined && (
              <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${isUp ? "text-green-500" : "text-red-500"}`}>
                {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(change)}% vs previous period
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Custom Tooltip ───
function CustomTooltip({ active, payload, label, prefix = "₹" }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/50 bg-card p-3 shadow-lg">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>
          {p.name}: {prefix}{Number(p.value).toLocaleString("en-IN")}
        </p>
      ))}
    </div>
  );
}

// ─── Main Component ───
const Analytics = () => {
  const { hotelId } = useAuth();
  const [range, setRange] = useState<DateRange>("7days");
  const { from, to } = getDateBounds(range);
  const fromISO = from.toISOString();
  const toISO = to.toISOString();

  // Previous period for comparison
  const diffMs = to.getTime() - from.getTime();
  const prevFrom = new Date(from.getTime() - diffMs).toISOString();
  const prevTo = fromISO;

  // ─── Orders ───
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["analytics-orders", hotelId, fromISO, toISO],
    queryFn: async () => {
      if (!hotelId) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("id, total, status, payment_method, order_source, created_at, waiter_id, table_id, discount_percent, billed_at")
        .eq("hotel_id", hotelId)
        .gte("created_at", fromISO)
        .lte("created_at", toISO)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!hotelId,
  });

  // Previous period orders (for comparison)
  const { data: prevOrders } = useQuery({
    queryKey: ["analytics-prev-orders", hotelId, prevFrom, prevTo],
    queryFn: async () => {
      if (!hotelId) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("id, total, status, created_at")
        .eq("hotel_id", hotelId)
        .gte("created_at", prevFrom)
        .lt("created_at", prevTo);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!hotelId,
  });

  // ─── Order Items (for top items) ───
  const orderIds = useMemo(() => (orders ?? []).map((o) => o.id), [orders]);
  const { data: orderItems, isLoading: itemsLoading } = useQuery({
    queryKey: ["analytics-items", orderIds],
    queryFn: async () => {
      if (!orderIds.length) return [];
      // Fetch in chunks of 100
      const chunks: any[] = [];
      for (let i = 0; i < orderIds.length; i += 100) {
        const batch = orderIds.slice(i, i + 100);
        const { data, error } = await supabase
          .from("order_items")
          .select("name, price, quantity, order_id")
          .in("order_id", batch);
        if (error) throw error;
        if (data) chunks.push(...data);
      }
      return chunks;
    },
    enabled: orderIds.length > 0,
  });

  // ─── Sales ───
  const { data: sales } = useQuery({
    queryKey: ["analytics-sales", hotelId, fromISO, toISO],
    queryFn: async () => {
      if (!hotelId) return [];
      const { data, error } = await supabase
        .from("sales")
        .select("amount, sale_date, created_at")
        .eq("hotel_id", hotelId)
        .gte("created_at", fromISO)
        .lte("created_at", toISO);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!hotelId,
  });

  // ─── Expenses ───
  const { data: expenses } = useQuery({
    queryKey: ["analytics-expenses", hotelId, fromISO, toISO],
    queryFn: async () => {
      if (!hotelId) return [];
      const { data, error } = await supabase
        .from("daily_expenses")
        .select("amount, category, expense_date")
        .eq("hotel_id", hotelId)
        .gte("expense_date", format(from, "yyyy-MM-dd"))
        .lte("expense_date", format(to, "yyyy-MM-dd"));
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!hotelId,
  });

  // ─── Counter Orders ───
  const { data: counterOrders } = useQuery({
    queryKey: ["analytics-counter", hotelId, fromISO, toISO],
    queryFn: async () => {
      if (!hotelId) return [];
      const { data, error } = await supabase
        .from("counter_orders")
        .select("total_amount, created_at")
        .eq("hotel_id", hotelId)
        .gte("created_at", fromISO)
        .lte("created_at", toISO);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!hotelId,
  });

  // ─── Profiles (for staff names) ───
  const { data: profiles } = useQuery({
    queryKey: ["analytics-profiles", hotelId],
    queryFn: async () => {
      if (!hotelId) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, role")
        .eq("hotel_id", hotelId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!hotelId,
  });

  const staffMap = useMemo(() => {
    const m = new Map<string, string>();
    (profiles ?? []).forEach((p) => m.set(p.user_id, p.full_name || "Unknown"));
    return m;
  }, [profiles]);

  // ═══════════════ COMPUTED DATA ═══════════════

  const billedOrders = useMemo(() => (orders ?? []).filter((o) => o.status === "billed"), [orders]);
  const prevBilled = useMemo(() => (prevOrders ?? []).filter((o) => o.status === "billed"), [prevOrders]);

  const totalRevenue = useMemo(() => billedOrders.reduce((s, o) => s + Number(o.total), 0), [billedOrders]);
  const prevRevenue = useMemo(() => prevBilled.reduce((s, o) => s + Number(o.total), 0), [prevBilled]);
  const counterTotal = useMemo(() => (counterOrders ?? []).reduce((s, o) => s + Number(o.total_amount), 0), [counterOrders]);
  const totalExpenses = useMemo(() => (expenses ?? []).reduce((s, e) => s + Number(e.amount), 0), [expenses]);
  const avgOrderValue = billedOrders.length > 0 ? totalRevenue / billedOrders.length : 0;
  const prevAvg = prevBilled.length > 0 ? prevRevenue / prevBilled.length : 0;
  const netProfit = totalRevenue + counterTotal - totalExpenses;

  // ─── Revenue Over Time ───
  const revenueTimeline = useMemo(() => {
    const isShortRange = range === "today" || range === "yesterday";
    if (isShortRange) {
      const hours = eachHourOfInterval({ start: from, end: to });
      return hours.map((h) => {
        const label = format(h, "ha");
        const rev = billedOrders
          .filter((o) => { const d = new Date(o.created_at); return d.getHours() === h.getHours() && isSameDay(d, h); })
          .reduce((s, o) => s + Number(o.total), 0);
        const cnt = (counterOrders ?? [])
          .filter((o) => { const d = new Date(o.created_at); return d.getHours() === h.getHours() && isSameDay(d, h); })
          .reduce((s, o) => s + Number(o.total_amount), 0);
        return { label, "Dine-in": rev, Counter: cnt, Total: rev + cnt };
      });
    }
    const days = eachDayOfInterval({ start: from, end: to });
    return days.map((d) => {
      const label = format(d, "dd MMM");
      const rev = billedOrders
        .filter((o) => isSameDay(new Date(o.created_at), d))
        .reduce((s, o) => s + Number(o.total), 0);
      const cnt = (counterOrders ?? [])
        .filter((o) => isSameDay(new Date(o.created_at), d))
        .reduce((s, o) => s + Number(o.total_amount), 0);
      return { label, "Dine-in": rev, Counter: cnt, Total: rev + cnt };
    });
  }, [billedOrders, counterOrders, from, to, range]);

  // ─── Order Count Over Time ───
  const orderCountTimeline = useMemo(() => {
    const days = eachDayOfInterval({ start: from, end: to });
    return days.map((d) => ({
      label: format(d, "dd MMM"),
      Orders: (orders ?? []).filter((o) => isSameDay(new Date(o.created_at), d)).length,
      Billed: billedOrders.filter((o) => isSameDay(new Date(o.created_at), d)).length,
    }));
  }, [orders, billedOrders, from, to]);

  // ─── Payment Method Breakdown ───
  const paymentBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    billedOrders.forEach((o) => {
      const m = o.payment_method || "cash";
      map[m] = (map[m] || 0) + Number(o.total);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
      .sort((a, b) => b.value - a.value);
  }, [billedOrders]);

  // ─── Order Source Breakdown ───
  const sourceBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    billedOrders.forEach((o) => {
      const s = o.order_source || "dine-in";
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name: name.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), value }))
      .sort((a, b) => b.value - a.value);
  }, [billedOrders]);

  // ─── Top Selling Items ───
  const topItems = useMemo(() => {
    const map: Record<string, { qty: number; revenue: number }> = {};
    (orderItems ?? []).forEach((i) => {
      if (!map[i.name]) map[i.name] = { qty: 0, revenue: 0 };
      map[i.name].qty += i.quantity;
      map[i.name].revenue += i.price * i.quantity;
    });
    return Object.entries(map)
      .map(([name, { qty, revenue }]) => ({ name, qty, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [orderItems]);

  // ─── Staff Performance ───
  const staffPerf = useMemo(() => {
    const map: Record<string, { orders: number; revenue: number }> = {};
    billedOrders.forEach((o) => {
      const wid = o.waiter_id;
      if (!map[wid]) map[wid] = { orders: 0, revenue: 0 };
      map[wid].orders += 1;
      map[wid].revenue += Number(o.total);
    });
    return Object.entries(map)
      .map(([uid, d]) => ({ name: staffMap.get(uid) || uid.slice(0, 8), ...d }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [billedOrders, staffMap]);

  // ─── Expense Categories ───
  const expenseCategories = useMemo(() => {
    const map: Record<string, number> = {};
    (expenses ?? []).forEach((e) => {
      map[e.category] = (map[e.category] || 0) + Number(e.amount);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  // ─── Peak Hours ───
  const peakHours = useMemo(() => {
    const hourMap = Array.from({ length: 24 }, (_, i) => ({ hour: i, label: format(new Date(2000, 0, 1, i), "ha"), orders: 0, revenue: 0 }));
    billedOrders.forEach((o) => {
      const h = new Date(o.created_at).getHours();
      hourMap[h].orders += 1;
      hourMap[h].revenue += Number(o.total);
    });
    return hourMap.filter((h) => h.orders > 0 || (h.hour >= 8 && h.hour <= 23));
  }, [billedOrders]);

  // ─── Discount Stats ───
  const discountedOrders = useMemo(() => billedOrders.filter((o) => Number(o.discount_percent) > 0), [billedOrders]);
  const avgDiscount = discountedOrders.length > 0
    ? discountedOrders.reduce((s, o) => s + Number(o.discount_percent), 0) / discountedOrders.length
    : 0;

  const isLoading = ordersLoading;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-sm text-muted-foreground">Business insights & performance metrics</p>
          </div>
        </div>
        <Select value={range} onValueChange={(v) => setRange(v as DateRange)}>
          <SelectTrigger className="w-[180px] gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGES.map((d) => (
              <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Total Revenue" value={fmtCurrency(totalRevenue + counterTotal)} icon={IndianRupee} change={pctChange(totalRevenue, prevRevenue)} loading={isLoading} />
        <StatCard title="Total Orders" value={billedOrders.length + (counterOrders ?? []).length} icon={ShoppingCart} change={pctChange(billedOrders.length, prevBilled.length)} loading={isLoading} />
        <StatCard title="Avg Order Value" value={fmtCurrency(avgOrderValue)} icon={Receipt} change={pctChange(avgOrderValue, prevAvg)} loading={isLoading} />
        <StatCard title="Net Profit" value={fmtCurrency(netProfit)} icon={TrendingUp} loading={isLoading} />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10"><Banknote className="h-4 w-4 text-green-500" /></div>
            <div><p className="text-xs text-muted-foreground">Dine-in Sales</p><p className="font-semibold">{fmtCurrency(totalRevenue)}</p></div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10"><Receipt className="h-4 w-4 text-cyan-500" /></div>
            <div><p className="text-xs text-muted-foreground">Counter Sales</p><p className="font-semibold">{fmtCurrency(counterTotal)}</p></div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10"><TrendingDown className="h-4 w-4 text-red-500" /></div>
            <div><p className="text-xs text-muted-foreground">Expenses</p><p className="font-semibold">{fmtCurrency(totalExpenses)}</p></div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10"><Star className="h-4 w-4 text-amber-500" /></div>
            <div><p className="text-xs text-muted-foreground">Avg Discount</p><p className="font-semibold">{avgDiscount.toFixed(1)}%</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Revenue Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-[300px] w-full" /> : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueTimeline}>
                <defs>
                  <linearGradient id="gradDineIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradCounter" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.info} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.info} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area type="monotone" dataKey="Dine-in" stroke={COLORS.primary} fill="url(#gradDineIn)" strokeWidth={2} />
                <Area type="monotone" dataKey="Counter" stroke={COLORS.info} fill="url(#gradCounter)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid md:grid-cols-2 gap-5">
        {/* Order Count Chart */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" /> Orders Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={orderCountTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip content={<CustomTooltip prefix="" />} />
                <Legend />
                <Bar dataKey="Orders" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Billed" fill={COLORS.success} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Peak Hours */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Peak Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={peakHours}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip content={<CustomTooltip prefix="" />} />
                <Bar dataKey="orders" name="Orders" fill={COLORS.warning} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" /> Payment Methods
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            {paymentBreakdown.length === 0 ? (
              <p className="text-muted-foreground text-sm py-12">No payment data</p>
            ) : (
              <div className="flex items-center gap-6 w-full">
                <ResponsiveContainer width="50%" height={220}>
                  <PieChart>
                    <Pie data={paymentBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                      {paymentBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmtCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 flex-1">
                  {paymentBreakdown.map((p, i) => (
                    <div key={p.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span>{p.name}</span>
                      </div>
                      <span className="font-medium">{fmtCurrency(p.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Sources */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4 text-primary" /> Order Sources
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            {sourceBreakdown.length === 0 ? (
              <p className="text-muted-foreground text-sm py-12">No source data</p>
            ) : (
              <div className="flex items-center gap-6 w-full">
                <ResponsiveContainer width="50%" height={220}>
                  <PieChart>
                    <Pie data={sourceBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                      {sourceBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 flex-1">
                  {sourceBreakdown.map((s, i) => (
                    <div key={s.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span>{s.name}</span>
                      </div>
                      <Badge variant="secondary">{s.value}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Items & Staff Performance */}
      <div className="grid md:grid-cols-2 gap-5">
        {/* Top Selling Items */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" /> Top 10 Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topItems.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">No item data available</p>
            ) : (
              <div className="space-y-3">
                {topItems.map((item, i) => {
                  const maxRev = topItems[0]?.revenue ?? 1;
                  const pct = (item.revenue / maxRev) * 100;
                  return (
                    <div key={item.name} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground font-mono w-5">#{i + 1}</span>
                          <span className="font-medium truncate max-w-[180px]">{item.name}</span>
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {item.qty} sold · {fmtCurrency(item.revenue)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-primary/70 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Staff Performance */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Staff Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {staffPerf.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">No staff data available</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={staffPerf} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={80} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" name="Revenue" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expense Breakdown */}
      {expenseCategories.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" /> Expense Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={expenseCategories} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3}>
                    {expenseCategories.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmtCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex items-center">
                <div className="space-y-2 w-full">
                  {expenseCategories.map((e, i) => (
                    <div key={e.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span>{e.name}</span>
                      </div>
                      <span className="font-medium">{fmtCurrency(e.value)}</span>
                    </div>
                  ))}
                  <div className="border-t border-border/50 pt-2 mt-2 flex justify-between text-sm font-semibold">
                    <span>Total</span>
                    <span>{fmtCurrency(totalExpenses)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Analytics;
