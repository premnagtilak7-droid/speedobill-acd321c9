import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import {
  IndianRupee, ShoppingBag, Grid3X3, AlertTriangle,
  Plus, UtensilsCrossed, BarChart3, Wallet, ChefHat, Clock, Crown,
  TrendingUp, TrendingDown, Bell, Check as CheckIcon, Package, Flame
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useIncomingOrders } from "@/hooks/useIncomingOrders";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface LowStockItem {
  name: string;
  current_stock: number;
  min_stock: number;
}

interface LowStockIngredient {
  name: string;
  current_stock: number;
  min_threshold: number;
  unit: string;
}

const metricGradients = [
  { bar: "gradient-bar-violet", iconBg: "gradient-bar-violet" },
  { bar: "gradient-bar-cyan", iconBg: "gradient-bar-cyan" },
  { bar: "gradient-bar-emerald", iconBg: "gradient-bar-emerald" },
  { bar: "gradient-bar-amber", iconBg: "gradient-bar-amber" },
  { bar: "gradient-bar-rose", iconBg: "gradient-bar-rose" },
  { bar: "gradient-bar-teal", iconBg: "gradient-bar-teal" },
  { bar: "gradient-bar-cyan", iconBg: "gradient-bar-cyan" },
  { bar: "gradient-bar-amber", iconBg: "gradient-bar-amber" },
];

const Dashboard = () => {
  const { role, hotelId } = useAuth();
  const navigate = useNavigate();
  const { incomingCount } = useIncomingOrders();
  const { status: subStatus, daysLeft, plan: subPlan, expiresAt } = useSubscription();
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [activeTables, setActiveTables] = useState(0);
  const [totalTables, setTotalTables] = useState(0);
  const [pendingKOT, setPendingKOT] = useState(0);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [tableTurnover, setTableTurnover] = useState<string>("—");
  const [noShows, setNoShows] = useState(0);
  const [lowStockIngredients, setLowStockIngredients] = useState<LowStockIngredient[]>([]);
  const [totalIngredients, setTotalIngredients] = useState(0);
  const [wastageCount30d, setWastageCount30d] = useState(0);

  useEffect(() => {
    if (!hotelId) return;
    const fetchStats = async () => {
      const now = new Date();
      const istDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      const today = istDate.toISOString().split("T")[0];
      const [salesRes, ordersRes, tablesRes, menuRes, kotRes, hotelRes, totalRevenueRes, ingredientsRes] = await Promise.all([
        supabase.from("sales").select("amount").eq("hotel_id", hotelId).eq("sale_date", today),
        supabase.from("orders").select("id").eq("hotel_id", hotelId).eq("status", "billed").gte("created_at", `${today}T00:00:00`).lt("created_at", `${today}T23:59:59.999`),
        supabase.from("restaurant_tables").select("id, status").eq("hotel_id", hotelId),
        supabase.from("menu_items").select("name, current_stock, min_stock").eq("hotel_id", hotelId),
        supabase.from("kot_tickets").select("id").eq("hotel_id", hotelId).eq("status", "pending"),
        supabase.from("hotels").select("subscription_tier, subscription_expiry").eq("id", hotelId).maybeSingle(),
        supabase.from("orders").select("total").eq("hotel_id", hotelId).eq("status", "billed"),
        supabase.from("ingredients").select("name, current_stock, min_threshold, unit").eq("hotel_id", hotelId),
      ]);
      if (salesRes.data) setTodayEarnings(salesRes.data.reduce((sum, s) => sum + Number(s.amount), 0));
      if (ordersRes.data) setTotalOrders(ordersRes.data.length);
      if (tablesRes.data) {
        setTotalTables(tablesRes.data.length);
        setActiveTables(tablesRes.data.filter((t) => t.status === "occupied").length);
      }
      if (menuRes.data) {
        const low = (menuRes.data as LowStockItem[]).filter(
          (item) => item.min_stock > 0 && item.current_stock <= item.min_stock
        );
        setLowStockItems(low);
      }
      if (kotRes.data) setPendingKOT(kotRes.data.length);
      if (totalRevenueRes.data) setTotalRevenue(totalRevenueRes.data.reduce((sum, o) => sum + Number(o.total), 0));
      if (ingredientsRes.data) {
        const allIngs = ingredientsRes.data as LowStockIngredient[];
        setTotalIngredients(allIngs.length);
        const lowIng = allIngs.filter(i => i.min_threshold > 0 && i.current_stock <= i.min_threshold);
        setLowStockIngredients(lowIng);
      }

      // Wastage count (30d)
      if (role === "owner") {
        const thirtyAgo = new Date();
        thirtyAgo.setDate(thirtyAgo.getDate() - 30);
        const wRes = await supabase.from("wastage_logs").select("id", { count: "exact", head: true })
          .eq("hotel_id", hotelId).gte("created_at", thirtyAgo.toISOString());
        setWastageCount30d(wRes.count || 0);
      }

      // Table Turnover Rate (avg time occupied today)
      const billedToday = await supabase
        .from("orders")
        .select("created_at, billed_at")
        .eq("hotel_id", hotelId)
        .eq("status", "billed")
        .gte("created_at", `${today}T00:00:00`)
        .not("billed_at", "is", null);
      if (billedToday.data && billedToday.data.length > 0) {
        const avgMs = billedToday.data.reduce((sum, o) => {
          const diff = new Date(o.billed_at!).getTime() - new Date(o.created_at).getTime();
          return sum + diff;
        }, 0) / billedToday.data.length;
        const avgMin = Math.round(avgMs / 60000);
        setTableTurnover(avgMin < 60 ? `${avgMin}m` : `${Math.floor(avgMin / 60)}h ${avgMin % 60}m`);
      } else {
        setTableTurnover("—");
      }

      // Reservation No-Shows (last 7 days)
      const weekAgo = new Date(istDate);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const noShowRes = await supabase
        .from("reservations")
        .select("id", { count: "exact", head: true })
        .eq("hotel_id", hotelId)
        .eq("status", "no-show")
        .gte("reservation_time", weekAgo.toISOString());
      setNoShows(noShowRes.count || 0);
    };
    fetchStats();

    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => fetchStats())
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurant_tables" }, () => fetchStats())
      .on("postgres_changes", { event: "*", schema: "public", table: "kot_tickets" }, () => fetchStats())
      .on("postgres_changes", { event: "*", schema: "public", table: "sales" }, () => fetchStats())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [hotelId]);

  const userName = "there";

  const quickStats = [
    { label: "Today's Sale", value: `₹${todayEarnings.toFixed(0)}`, icon: IndianRupee, trend: "+12%" as string | null, up: true },
    { label: "Total Revenue", value: `₹${totalRevenue.toFixed(0)}`, icon: IndianRupee, trend: null, up: true },
    { label: "Active Tables", value: `${activeTables}/${totalTables}`, icon: Grid3X3, trend: null, up: true },
    { label: "Pending KOT", value: String(pendingKOT), icon: Clock, trend: null, up: false },
    { label: "Orders Today", value: String(totalOrders), icon: ShoppingBag, trend: null, up: true },
    ...(incomingCount > 0 ? [{ label: "Incoming Orders", value: String(incomingCount), icon: Bell, trend: "NEW" as string | null, up: true }] : []),
    ...(role === "owner" ? [
      { label: "Avg Turnover", value: tableTurnover, icon: Clock, trend: null, up: true },
      { label: "No-Shows (7d)", value: String(noShows), icon: AlertTriangle, trend: null, up: false },
    ] : []),
  ];

  const actionCards = [
    { label: "New Order", desc: "Start a new table order", icon: Plus, gradient: "gradient-bar-violet", to: "/tables" },
    { label: "Table Map", desc: "View all tables", icon: Grid3X3, gradient: "gradient-bar-emerald", to: "/tables" },
    { label: "Menu", desc: "Manage menu items", icon: UtensilsCrossed, gradient: "gradient-bar-cyan", to: "/menu" },
    { label: "Kitchen", desc: "Kitchen display", icon: ChefHat, gradient: "gradient-bar-amber", to: "/kitchen" },
    { label: "Expenses", desc: "Track daily costs", icon: Wallet, gradient: "gradient-bar-teal", to: "/expenses" },
    { label: "Reports", desc: "Analytics & insights", icon: BarChart3, gradient: "gradient-bar-rose", to: "/analytics" },
  ];

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
  const dateStr = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

  return (
    <div className="p-5 md:p-6 space-y-5 max-w-[1400px] mx-auto">
      {/* Welcome banner */}
      <div
        className="rounded-2xl p-5 md:p-6 relative overflow-hidden animate-pop-in"
        style={{
          background: "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)",
          border: "1px solid hsl(var(--primary) / 0.3)",
        }}
      >
        <div className="absolute -top-10 -right-10 w-[200px] h-[200px] pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.12), transparent 70%)" }}
        />
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 relative z-10">
          <div>
            <h1 className="text-xl md:text-[22px] font-bold text-foreground">
              Good {now.getHours() < 12 ? "morning" : now.getHours() < 17 ? "afternoon" : "evening"}, {userName} 👋
            </h1>
            <p className="text-[13px] text-muted-foreground mt-1">Here's what's happening at your canteen today</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-muted-foreground/70 tnum">{timeStr}</p>
            <p className="text-xs text-muted-foreground/50">{dateStr}</p>
          </div>
        </div>
      </div>

      {/* Subscription Status Card */}
      {(() => {
        const formattedExpiry = expiresAt
          ? new Date(expiresAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
          : null;
        const expiringWithin3 = subStatus === "active" && daysLeft !== null && daysLeft <= 3;

        if (subStatus === "active" && subPlan === "premium") {
          return (
            <div className="rounded-xl p-4 animate-pop-in"
              style={{ background: "hsl(var(--card))", border: `1px solid ${expiringWithin3 ? "rgba(245,158,11,0.3)" : "rgba(124,58,237,0.2)"}` }}
            >
              <div className="flex items-center gap-3 mb-2">
                {expiringWithin3
                  ? <AlertTriangle className="h-5 w-5" style={{ color: "#F59E0B" }} />
                  : <Crown className="h-5 w-5" style={{ color: "#7C3AED" }} />
                }
                <Badge style={{ background: "rgba(124,58,237,0.15)", color: "#7C3AED", border: "none" }}>Premium Plan</Badge>
              </div>
              {expiringWithin3 ? (
                <>
                  <p className="text-sm text-foreground font-medium">Renews in {daysLeft} day{daysLeft !== 1 ? "s" : ""}</p>
                  <Button size="sm" className="mt-2 font-bold text-xs text-white" style={{ background: "#F59E0B" }}
                    onClick={() => navigate("/settings")}>Renew Now</Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Active until {formattedExpiry}</p>
              )}
            </div>
          );
        }

        if (subStatus === "active" && subPlan === "basic") {
          return (
            <div className="rounded-xl p-4 animate-pop-in"
              style={{ background: "hsl(var(--card))", border: `1px solid ${expiringWithin3 ? "rgba(245,158,11,0.3)" : "rgba(6,182,212,0.2)"}` }}
            >
              <div className="flex items-center gap-3 mb-2">
                {expiringWithin3
                  ? <AlertTriangle className="h-5 w-5" style={{ color: "#F59E0B" }} />
                  : <CheckIcon className="h-5 w-5" style={{ color: "#22C55E" }} />
                }
                <Badge style={{ background: "rgba(6,182,212,0.15)", color: "#06B6D4", border: "none" }}>Basic Plan</Badge>
              </div>
              {expiringWithin3 ? (
                <>
                  <p className="text-sm text-foreground font-medium">Renews in {daysLeft} day{daysLeft !== 1 ? "s" : ""}</p>
                  <Button size="sm" className="mt-2 font-bold text-xs text-white" style={{ background: "#F59E0B" }}
                    onClick={() => navigate("/settings")}>Renew Now</Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">Active until {formattedExpiry}</p>
                  <Button size="sm" variant="ghost" className="mt-2 text-xs" style={{ color: "#7C3AED" }}
                    onClick={() => navigate("/settings")}>Upgrade to Premium →</Button>
                </>
              )}
            </div>
          );
        }

        if (subStatus === "trial") {
          const dayUsed = daysLeft !== null ? 7 - daysLeft : 0;
          return (
            <div className="rounded-xl p-4 animate-pop-in"
              style={{ background: "hsl(var(--card))", border: "1px solid rgba(245,158,11,0.2)" }}
            >
              <div className="flex items-center gap-3 mb-3">
                <Crown className="h-5 w-5" style={{ color: "#F59E0B" }} />
                <Badge style={{ background: "rgba(245,158,11,0.15)", color: "#F59E0B", border: "none" }}>Free Trial</Badge>
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">{daysLeft} <span className="text-sm font-normal text-muted-foreground">days remaining</span></p>
              <Progress value={(dayUsed / 7) * 100} className="h-1.5 mb-3" />
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" className="text-white font-bold text-xs" style={{ background: "#06B6D4" }}
                  onClick={() => navigate("/settings")}>Basic ₹199/mo</Button>
                <Button size="sm" className="text-white font-bold text-xs" style={{ background: "linear-gradient(135deg, #7C3AED, #6366F1)" }}
                  onClick={() => navigate("/settings")}>Premium ₹399/mo</Button>
              </div>
            </div>
          );
        }

        if (subStatus === "free") {
          return (
            <div className="rounded-xl p-4 animate-pop-in"
              style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
            >
              <div className="flex items-center gap-3 mb-2">
                <Crown className="h-5 w-5 text-muted-foreground" />
                <Badge variant="secondary">Free Version</Badge>
              </div>
              <p className="text-sm text-muted-foreground">You're on the free plan with limited features.</p>
              <Button size="sm" className="mt-2 font-bold text-xs text-white" style={{ background: "linear-gradient(135deg, #7C3AED, #6366F1)" }}
                onClick={() => navigate("/pricing")}>Upgrade Now</Button>
            </div>
          );
        }

        return null;
      })()}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {quickStats.map((stat, i) => (
          <div
            key={stat.label}
            className="rounded-xl overflow-hidden animate-pop-in"
            style={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border) / 0.5)",
              animationDelay: `${i * 40}ms`,
            }}
          >
            <div className={`h-[2.5px] ${metricGradients[i]?.bar || "gradient-bar-violet"}`} />
            <div className="px-3 py-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <div className={`h-6 w-6 rounded-md flex items-center justify-center ${metricGradients[i]?.iconBg || "gradient-bar-violet"}`}>
                  <stat.icon size={12} className="text-white" />
                </div>
                {stat.trend && (
                  <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                    stat.up ? "bg-emerald/[0.12] text-emerald" : "bg-destructive/[0.12] text-destructive"
                  }`}>
                    {stat.up ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                    {stat.trend}
                  </span>
                )}
              </div>
              <p className="text-lg md:text-xl font-bold text-foreground tnum leading-tight">{stat.value}</p>
              <p className="label-caps text-[9px] mt-0.5 tracking-wider">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>


      {/* Low Stock */}
      {role === "owner" && lowStockItems.length > 0 && (
        <div className="rounded-xl p-4 animate-pop-in"
          style={{ background: "hsl(var(--card))", border: "1px solid rgba(245,158,11,0.2)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span className="text-sm font-semibold">Low Stock Alert</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockItems.map((item) => (
              <Badge key={item.name} variant="outline" className="text-warning border-warning/30 gap-1 text-xs">
                {item.name}: {item.current_stock}/{item.min_stock}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Ingredient Low Stock */}
      {role === "owner" && lowStockIngredients.length > 0 && (
        <div className="rounded-xl p-4 animate-pop-in cursor-pointer"
          style={{ background: "hsl(var(--card))", border: "1px solid rgba(239,68,68,0.2)" }}
          onClick={() => navigate("/inventory")}
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-sm font-semibold">Ingredient Low Stock</span>
            <Badge className="text-[9px] ml-auto" style={{ background: "rgba(239,68,68,0.15)", color: "#EF4444", border: "none" }}>{lowStockIngredients.length}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockIngredients.map((item) => (
              <Badge key={item.name} variant="outline" className="text-destructive border-destructive/30 gap-1 text-xs">
                {item.name}: {item.current_stock}/{item.min_threshold} {item.unit}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Inventory Overview */}
      {role === "owner" && (
        <div className="rounded-xl p-4 animate-pop-in cursor-pointer"
          style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.5)" }}
          onClick={() => navigate("/stock-analytics")}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-lg flex items-center justify-center gradient-bar-emerald">
              <Package size={13} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-foreground">Inventory Overview</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-lg font-bold text-foreground">{totalIngredients}</p>
              <p className="text-[10px] text-muted-foreground">Ingredients</p>
            </div>
            <div>
              <p className="text-lg font-bold text-warning">{lowStockIngredients.length}</p>
              <p className="text-[10px] text-muted-foreground">Low Stock</p>
            </div>
            <div>
              <p className="text-lg font-bold text-destructive">{wastageCount30d}</p>
              <p className="text-[10px] text-muted-foreground">Wastage (30d)</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-[13px] font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Quick Actions</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {actionCards.map((card, i) => (
            <button
              key={card.label}
              className="rounded-xl p-3 text-left transition-all duration-200 hover:-translate-y-0.5 animate-pop-in group btn-press"
              style={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border) / 0.5)",
                animationDelay: `${(i + 5) * 40}ms`,
              }}
              onClick={() => navigate(card.to)}
            >
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${card.gradient} mb-2 transition-transform duration-200 group-hover:scale-110`}>
                <card.icon size={15} className="text-white" />
              </div>
              <p className="text-xs font-semibold text-foreground leading-tight">{card.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight hidden md:block">{card.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
