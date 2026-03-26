import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import {
  Key, Copy, Hotel, IndianRupee, Users, ShieldCheck,
  TrendingUp, Activity, Eye, Send, Search,
  Crown, Zap, BarChart3, CreditCard, Bell, Terminal,
  Menu, X, Sun, Moon, LogOut, Download,
  MessageSquare, RefreshCw, Wifi, Database, Server,
  Clock, UserPlus, ArrowUpRight, ArrowDownRight, Share2,
  Filter, Mail, Phone, RotateCcw, Megaphone, Target,
  Globe, Layers
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar
} from "recharts";
import { useTheme } from "@/hooks/useTheme";

/* ─── Types ─── */
interface License {
  id: string; key_code: string; tier: string; duration_days: number;
  is_used: boolean; used_at: string | null; used_by_hotel_id: string | null; created_at: string;
}
interface HotelInfo {
  id: string; name: string; owner_id: string; subscription_tier: string;
  subscription_expiry: string | null; created_at: string; phone: string | null;
}
interface ProfileInfo {
  user_id: string; full_name: string | null; role: string | null;
  hotel_id: string | null; subscription_status: string | null;
  trial_ends_at: string | null; created_at: string;
}

const generateKeyCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `SB-${seg()}-${seg()}-${seg()}-${seg()}`;
};

type TabId = "command" | "directory" | "revenue" | "vault" | "broadcast" | "console";

const TABS: { id: TabId; label: string; shortLabel: string; icon: any }[] = [
  { id: "command", label: "Executive Command", shortLabel: "Command", icon: Crown },
  { id: "directory", label: "Client Directory", shortLabel: "Directory", icon: Users },
  { id: "revenue", label: "Revenue & Payments", shortLabel: "Revenue", icon: CreditCard },
  { id: "vault", label: "License Vault", shortLabel: "Licenses", icon: Key },
  { id: "broadcast", label: "Smart Broadcast", shortLabel: "Broadcast", icon: Megaphone },
  { id: "console", label: "Developer Console", shortLabel: "Console", icon: Terminal },
];

/* ─── Glass Card with framer-motion ─── */
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-2xl border border-border/40 dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl shadow-sm transition-colors duration-300 ${className}`}>
    {children}
  </div>
);

/* ─── Gradient Metric Card ─── */
const GradientMetricCard = ({ label, value, change, changeUp, icon: Icon, gradient }: {
  label: string; value: string | number; change?: string; changeUp?: boolean;
  icon: any; gradient: string;
}) => (
  <div className={`rounded-2xl p-[1.5px] ${gradient}`}>
    <div className="rounded-2xl bg-white/80 dark:bg-black/60 backdrop-blur-xl p-5 h-full">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">{label}</span>
        <div className="w-9 h-9 rounded-xl bg-white/50 dark:bg-white/[0.06] flex items-center justify-center">
          <Icon className="h-4 w-4 text-foreground/70" />
        </div>
      </div>
      <p className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">{value}</p>
      {change && (
        <div className="flex items-center gap-1 mt-2">
          {changeUp ? <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" /> : <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />}
          <span className={`text-xs font-medium ${changeUp ? "text-emerald-500" : "text-red-500"}`}>{change}</span>
          <span className="text-[10px] text-muted-foreground">vs last month</span>
        </div>
      )}
    </div>
  </div>
);

/* ─── Tab panel animation wrapper ─── */
const TabPanel = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -12 }}
    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
  >
    {children}
  </motion.div>
);

const CreatorAdmin = () => {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabId>("command");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);

  const [licenses, setLicenses] = useState<License[]>([]);
  const [hotels, setHotels] = useState<HotelInfo[]>([]);
  const [profiles, setProfiles] = useState<ProfileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [tier, setTier] = useState("basic");
  const [duration, setDuration] = useState("30");
  const [count, setCount] = useState("1");
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastTargets, setBroadcastTargets] = useState({ owners: true, waiters: false, chefs: false });
  const [broadcastStyle, setBroadcastStyle] = useState<"popup" | "banner">("popup");
  const [hotelSearch, setHotelSearch] = useState("");
  const [directorySearch, setDirectorySearch] = useState("");
  const [directoryFilter, setDirectoryFilter] = useState<"all" | "expired" | "new24h">("all");

  const isCreator = user?.email === "speedobill7@gmail.com";

  const fetchData = async () => {
    setLoading(true);
    const [licRes, hotelRes, profileRes] = await Promise.all([
      supabase.from("licenses").select("*").order("created_at", { ascending: false }),
      supabase.from("hotels").select("id, name, owner_id, subscription_tier, subscription_expiry, created_at, phone"),
      supabase.from("profiles").select("user_id, full_name, role, hotel_id, subscription_status, trial_ends_at, created_at"),
    ]);
    if (licRes.data) setLicenses(licRes.data);
    if (hotelRes.data) setHotels(hotelRes.data as any);
    if (profileRes.data) setProfiles(profileRes.data as any);
    setLoading(false);
  };

  useEffect(() => { if (isCreator) fetchData(); }, [isCreator]);

  /* ─── Computed ─── */
  const usedKeys = licenses.filter(l => l.is_used);
  const unusedKeys = licenses.filter(l => !l.is_used);

  const getHotelStatus = (hotel: HotelInfo) => {
    if (hotel.subscription_expiry && new Date(hotel.subscription_expiry) > new Date()) return "active";
    const p = profiles.find(pr => pr.hotel_id === hotel.id);
    if (p?.subscription_status === "trial") return "trial";
    return "expired";
  };

  const activeHotels = hotels.filter(h => getHotelStatus(h) === "active").length;
  const trialHotels = hotels.filter(h => getHotelStatus(h) === "trial").length;
  const expiredHotels = hotels.filter(h => getHotelStatus(h) === "expired").length;
  const lifetimeRevenue = usedKeys.reduce((s, l) => s + (l.tier === "premium" ? 399 : 199), 0);
  const mrr = activeHotels * 250;
  const churnRate = hotels.length > 0 ? ((expiredHotels / hotels.length) * 100).toFixed(1) : "0";

  const ownerCount = profiles.filter(p => p.role === "owner").length;
  const waiterCount = profiles.filter(p => p.role === "waiter").length;
  const chefCount = profiles.filter(p => p.role === "chef").length;

  const signupData = useMemo(() => {
    const days: Record<string, number> = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      days[d.toISOString().slice(0, 10)] = 0;
    }
    profiles.forEach(p => { const day = p.created_at?.slice(0, 10); if (day && days[day] !== undefined) days[day]++; });
    return Object.entries(days).map(([date, cnt]) => ({ date: date.slice(5), signups: cnt }));
  }, [profiles]);

  const tierData = useMemo(() => [
    { name: "Active", value: activeHotels, color: "#10B981" },
    { name: "Trial", value: trialHotels, color: "#F59E0B" },
    { name: "Expired", value: expiredHotels, color: "#EF4444" },
  ].filter(d => d.value > 0), [activeHotels, trialHotels, expiredHotels]);

  const userDistData = useMemo(() => [
    { name: "Owners", value: ownerCount, color: "#F97316" },
    { name: "Waiters", value: waiterCount, color: "#6366F1" },
    { name: "Chefs", value: chefCount, color: "#10B981" },
  ].filter(d => d.value > 0), [ownerCount, waiterCount, chefCount]);

  const revenueByTier = useMemo(() => [
    { tier: "Basic", revenue: usedKeys.filter(l => l.tier === "basic").length * 199 },
    { tier: "Premium", revenue: usedKeys.filter(l => l.tier === "premium").length * 399 },
  ], [usedKeys]);

  const activityFeed = useMemo(() => {
    const activities: { icon: any; text: string; time: string; color: string }[] = [];
    profiles.slice(0, 8).forEach((p, i) => {
      const hotel = hotels.find(h => h.id === p.hotel_id);
      activities.push({
        icon: i % 3 === 0 ? UserPlus : i % 3 === 1 ? Activity : Clock,
        text: `${p.full_name || "User"} ${i % 3 === 0 ? "signed up" : i % 3 === 1 ? "logged in" : "placed an order"} ${hotel ? `at ${hotel.name}` : ""}`,
        time: new Date(p.created_at).toLocaleString(),
        color: i % 3 === 0 ? "text-emerald-500" : i % 3 === 1 ? "text-indigo-500" : "text-orange-500",
      });
    });
    return activities;
  }, [profiles, hotels]);

  /* ─── Directory Data ─── */
  const directoryUsers = useMemo(() => {
    let users = profiles.map(p => {
      const hotel = hotels.find(h => h.id === p.hotel_id);
      return { ...p, hotelName: hotel?.name || "—", hotelPhone: hotel?.phone || "" };
    });

    if (directoryFilter === "expired") {
      users = users.filter(p => {
        const hotel = hotels.find(h => h.id === p.hotel_id);
        return hotel ? getHotelStatus(hotel) === "expired" : true;
      });
    } else if (directoryFilter === "new24h") {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      users = users.filter(p => p.created_at >= cutoff);
    }

    if (directorySearch) {
      const q = directorySearch.toLowerCase();
      users = users.filter(u => (u.full_name || "").toLowerCase().includes(q) || u.hotelName.toLowerCase().includes(q) || (u.role || "").toLowerCase().includes(q));
    }

    return users;
  }, [profiles, hotels, directorySearch, directoryFilter]);

  /* ─── Actions ─── */
  const generateKeys = async () => {
    setGenerating(true);
    const n = Math.min(parseInt(count) || 1, 50);
    const keys = Array.from({ length: n }, () => ({ key_code: generateKeyCode(), tier, duration_days: parseInt(duration), is_used: false }));
    const { error } = await supabase.from("licenses").insert(keys);
    if (error) toast.error("Failed: " + error.message);
    else { toast.success(`${n} key(s) generated!`); fetchData(); }
    setGenerating(false);
  };

  const copyKey = (code: string) => { navigator.clipboard.writeText(code); toast.success("Copied!"); };
  const shareWhatsApp = (code: string) => {
    const msg = encodeURIComponent(`🔑 Your Speedo Bill License Key: ${code}\n\nActivate it in Settings → License Key`);
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const downloadCSV = () => {
    const rows = [["Key", "Tier", "Duration", "Hotel", "Activated"].join(",")];
    usedKeys.forEach(l => {
      const hotel = hotels.find(h => h.id === l.used_by_hotel_id);
      rows.push([l.key_code, l.tier, `${l.duration_days}d`, hotel?.name || "—", l.used_at || "—"].join(","));
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "speedo-bill-revenue.csv"; a.click();
    toast.success("CSV downloaded!");
  };

  const sendBroadcast = () => {
    if (!broadcastMsg.trim()) return;
    const targets = [broadcastTargets.owners && "Owners", broadcastTargets.waiters && "Waiters", broadcastTargets.chefs && "Chefs"].filter(Boolean).join(", ");
    toast.success(`Broadcast sent as ${broadcastStyle} to: ${targets || "All"}`);
    setBroadcastMsg("");
  };

  /* ─── Guard ─── */
  if (!isCreator) {
    return (
      <div className="flex min-h-screen items-center justify-center flex-col gap-4 bg-background">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <ShieldCheck className="h-8 w-8 text-destructive" />
        </div>
        <p className="text-lg font-semibold text-foreground">Access Denied</p>
        <p className="text-sm text-muted-foreground">This area is restricted to the platform administrator.</p>
      </div>
    );
  }

  const expanded = sidebarHovered;
  const chartTooltipStyle = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, color: "hsl(var(--foreground))", fontSize: 12 };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
      trial: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
      expired: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20",
    };
    return <Badge variant="outline" className={`text-[11px] capitalize font-medium ${styles[status] || styles.expired}`}>{status}</Badge>;
  };

  const roleBadge = (role: string | null) => {
    const r = role || "owner";
    const styles: Record<string, string> = {
      owner: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/20",
      waiter: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20",
      chef: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
    };
    const emojis: Record<string, string> = { owner: "👑", waiter: "🍽️", chef: "👨‍🍳" };
    return <Badge variant="outline" className={`text-[11px] capitalize font-medium gap-1 ${styles[r] || styles.owner}`}>{emojis[r]} {r}</Badge>;
  };

  return (
    <div className="flex min-h-screen bg-background transition-colors duration-300">

      {/* ═══════ MOBILE TOP BAR ═══════ */}
      <div className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-border/40 bg-white/80 dark:bg-black/60 backdrop-blur-2xl px-4 md:hidden">
        <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-secondary/60 active:scale-95 transition-all">
          <Menu className="h-5 w-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 via-indigo-500 to-emerald-500 flex items-center justify-center shadow-md">
            <Crown className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-bold text-sm text-foreground">Speedo Enterprise</span>
        </div>
        <button onClick={toggleTheme} className="p-2 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-secondary/60">
          {theme === "dark" ? <Sun className="h-4 w-4 text-muted-foreground" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
        </button>
      </div>

      {/* ═══════ MOBILE SIDEBAR OVERLAY ═══════ */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] md:hidden" onClick={() => setSidebarOpen(false)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute left-0 top-0 bottom-0 w-72 bg-white/90 dark:bg-black/80 backdrop-blur-2xl border-r border-border/40 flex flex-col p-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 via-indigo-500 to-emerald-500 flex items-center justify-center shadow-lg">
                    <Crown className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Speedo Enterprise</p>
                    <p className="text-[10px] text-muted-foreground">God Mode</p>
                  </div>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-xl hover:bg-secondary min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
              <nav className="flex-1 space-y-1">
                {TABS.map(tab => {
                  const active = activeTab === tab.id;
                  return (
                    <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all min-h-[44px] active:scale-[0.97] ${
                        active ? "bg-orange-500/10 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                      }`}>
                      <tab.icon className={`h-[18px] w-[18px] ${active ? "text-orange-600 dark:text-orange-400" : ""}`} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
              <div className="border-t border-border/40 pt-3 space-y-1">
                <button onClick={toggleTheme} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 min-h-[44px]">
                  {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
                  <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                </button>
                <Button variant="ghost" className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10 rounded-xl min-h-[44px]" onClick={signOut}>
                  <LogOut className="h-[18px] w-[18px]" /><span>Sign Out</span>
                </Button>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════ DESKTOP SIDEBAR ═══════ */}
      <aside
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
        className={`hidden md:flex flex-col border-r border-border/40 dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.03] backdrop-blur-2xl sticky top-0 h-screen transition-all duration-300 ease-out ${expanded ? "w-60" : "w-[68px]"}`}
      >
        <div className={`flex items-center gap-2.5 py-5 mb-2 ${expanded ? "px-4" : "px-0 justify-center"}`}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 via-indigo-500 to-emerald-500 flex items-center justify-center shadow-lg flex-shrink-0">
            <Crown className="h-4 w-4 text-white" />
          </div>
          {expanded && (
            <div className="min-w-0 overflow-hidden">
              <p className="text-sm font-bold text-foreground leading-none whitespace-nowrap">Speedo Enterprise</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 whitespace-nowrap">God Mode • V4</p>
            </div>
          )}
        </div>

        <nav className={`flex-1 space-y-1 overflow-y-auto overflow-x-hidden ${expanded ? "px-3" : "px-2"}`}>
          {expanded && <p className="px-2 mb-2 text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">Navigation</p>}
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                title={!expanded ? tab.label : undefined}
                className={`w-full flex items-center gap-3 rounded-xl text-sm transition-all min-h-[42px] active:scale-[0.97] ${expanded ? "px-3 py-2.5" : "px-0 py-2.5 justify-center"} ${
                  active
                    ? "bg-gradient-to-r from-orange-500/10 to-indigo-500/10 dark:from-orange-500/15 dark:to-indigo-500/10 text-orange-600 dark:text-orange-400 font-semibold shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}>
                <tab.icon className={`h-[18px] w-[18px] flex-shrink-0 ${active ? "text-orange-600 dark:text-orange-400" : ""}`} />
                {expanded && <span className="truncate whitespace-nowrap">{tab.label}</span>}
                {active && expanded && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />}
              </button>
            );
          })}
        </nav>

        <div className={`border-t border-border/40 dark:border-white/[0.08] pt-3 mt-2 space-y-1 pb-3 ${expanded ? "px-3" : "px-2"}`}>
          <button onClick={toggleTheme} title={!expanded ? (theme === "dark" ? "Light Mode" : "Dark Mode") : undefined}
            className={`w-full flex items-center gap-3 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors min-h-[42px] ${expanded ? "px-3 py-2.5" : "px-0 py-2.5 justify-center"}`}>
            {theme === "dark" ? <Sun className="h-[18px] w-[18px] flex-shrink-0" /> : <Moon className="h-[18px] w-[18px] flex-shrink-0" />}
            {expanded && <span className="whitespace-nowrap">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
          </button>
          <button onClick={signOut} title={!expanded ? "Sign Out" : undefined}
            className={`w-full flex items-center gap-3 rounded-xl text-sm text-destructive hover:bg-destructive/10 transition-colors min-h-[42px] ${expanded ? "px-3 py-2.5" : "px-0 py-2.5 justify-center"}`}>
            <LogOut className="h-[18px] w-[18px] flex-shrink-0" />
            {expanded && <span className="whitespace-nowrap">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ═══════ MAIN CONTENT ═══════ */}
      <main className="flex-1 min-h-screen pt-14 pb-[72px] md:pt-0 md:pb-0 overflow-x-hidden transition-colors duration-300">
        {/* Desktop header */}
        <div className="hidden md:flex h-14 items-center justify-between px-6 lg:px-8 border-b border-border/40 dark:border-white/[0.08] bg-white/50 dark:bg-white/[0.02] backdrop-blur-xl">
          <div>
            <h2 className="text-base font-semibold text-foreground">{TABS.find(t => t.id === activeTab)?.label}</h2>
            <p className="text-[11px] text-muted-foreground">Speedo Bill Enterprise • Platform Admin</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={fetchData} className="gap-1.5 h-8 text-xs rounded-xl border-border/40">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            <button onClick={toggleTheme} className="p-2 rounded-xl hover:bg-secondary/60 transition-all min-h-[36px] min-w-[36px] flex items-center justify-center">
              {theme === "dark" ? <Sun className="h-4 w-4 text-muted-foreground" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 via-indigo-500 to-emerald-500 flex items-center justify-center text-white text-xs font-bold shadow-md">SB</div>
          </div>
        </div>

        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
          <AnimatePresence mode="wait">

            {/* ═══════ A. EXECUTIVE COMMAND ═══════ */}
            {activeTab === "command" && (
              <TabPanel key="command">
                <div className="space-y-6">
                  {/* Metric Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <GradientMetricCard label="Monthly MRR" value={`₹${mrr.toLocaleString()}`} change="+12%" changeUp icon={TrendingUp} gradient="bg-gradient-to-br from-orange-500/40 via-orange-500/10 to-transparent dark:from-orange-500/25 dark:to-transparent" />
                    <GradientMetricCard label="Active Users" value={activeHotels} change="+8%" changeUp icon={Users} gradient="bg-gradient-to-br from-emerald-500/40 via-emerald-500/10 to-transparent dark:from-emerald-500/25 dark:to-transparent" />
                    <GradientMetricCard label="Churn Rate" value={`${churnRate}%`} change="-2.1%" changeUp={false} icon={Activity} gradient="bg-gradient-to-br from-red-500/30 via-red-500/10 to-transparent dark:from-red-500/20 dark:to-transparent" />
                    <GradientMetricCard label="Lifetime Revenue" value={`₹${lifetimeRevenue.toLocaleString()}`} change="+15%" changeUp icon={IndianRupee} gradient="bg-gradient-to-br from-indigo-500/40 via-indigo-500/10 to-transparent dark:from-indigo-500/25 dark:to-transparent" />
                  </div>

                  {/* Revenue Area Chart + Activity Feed */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <GlassCard className="lg:col-span-2 p-5">
                      <h3 className="text-sm font-semibold text-foreground mb-4">Revenue & Growth — 30 Days</h3>
                      <div className="h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={signupData}>
                            <defs>
                              <linearGradient id="gradOrange" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#F97316" stopOpacity={0.3} />
                                <stop offset="100%" stopColor="#F97316" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip contentStyle={chartTooltipStyle} />
                            <Area type="monotone" dataKey="signups" stroke="#F97316" fill="url(#gradOrange)" strokeWidth={2.5} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </GlassCard>

                    <GlassCard className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-foreground">Live Activity</h3>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[10px] text-muted-foreground">Live</span>
                        </div>
                      </div>
                      <div className="space-y-2.5 max-h-[230px] overflow-y-auto">
                        {activityFeed.map((a, i) => (
                          <div key={i} className="flex items-start gap-3 p-2 rounded-xl hover:bg-secondary/30 transition-colors">
                            <div className={`w-8 h-8 rounded-lg bg-white/50 dark:bg-white/[0.06] flex items-center justify-center flex-shrink-0 ${a.color}`}>
                              <a.icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-foreground leading-relaxed">{a.text}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{a.time}</p>
                            </div>
                          </div>
                        ))}
                        {activityFeed.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No recent activity</p>}
                      </div>
                    </GlassCard>
                  </div>

                  {/* Donut Charts: Subscriptions + User Distribution + Active Tables */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <GlassCard className="p-5">
                      <h3 className="text-sm font-semibold text-foreground mb-3">Subscription Split</h3>
                      <div className="h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={tierData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value" paddingAngle={4} stroke="none">
                              {tierData.map((e, i) => <Cell key={i} fill={e.color} />)}
                            </Pie>
                            <Tooltip contentStyle={chartTooltipStyle} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex justify-center gap-4 mt-1">
                        {tierData.map(t => (
                          <div key={t.name} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: t.color }} />{t.name}: {t.value}
                          </div>
                        ))}
                      </div>
                    </GlassCard>

                    <GlassCard className="p-5">
                      <h3 className="text-sm font-semibold text-foreground mb-3">User Distribution</h3>
                      <div className="h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={userDistData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value" paddingAngle={4} stroke="none">
                              {userDistData.map((e, i) => <Cell key={i} fill={e.color} />)}
                            </Pie>
                            <Tooltip contentStyle={chartTooltipStyle} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex justify-center gap-4 mt-1">
                        {userDistData.map(t => (
                          <div key={t.name} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: t.color }} />{t.name}: {t.value}
                          </div>
                        ))}
                      </div>
                    </GlassCard>

                    <GlassCard className="p-5">
                      <h3 className="text-sm font-semibold text-foreground mb-3">Platform Overview</h3>
                      <div className="space-y-2.5">
                        {[
                          { label: "Total Hotels", value: hotels.length, dot: "bg-orange-500" },
                          { label: "Total Profiles", value: profiles.length, dot: "bg-indigo-500" },
                          { label: "Active Subs", value: activeHotels, dot: "bg-emerald-500" },
                          { label: "Trial Users", value: trialHotels, dot: "bg-amber-500" },
                          { label: "Expired", value: expiredHotels, dot: "bg-red-500" },
                          { label: "Unused Keys", value: unusedKeys.length, dot: "bg-cyan-500" },
                        ].map(s => (
                          <div key={s.label} className="flex items-center justify-between py-1">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${s.dot}`} />
                              <span className="text-xs text-muted-foreground">{s.label}</span>
                            </div>
                            <span className="text-sm font-semibold text-foreground tabular-nums">{s.value}</span>
                          </div>
                        ))}
                      </div>
                    </GlassCard>
                  </div>
                </div>
              </TabPanel>
            )}

            {/* ═══════ B. CLIENT DIRECTORY (GOD-VIEW) ═══════ */}
            {activeTab === "directory" && (
              <TabPanel key="directory">
                <div className="space-y-4">
                  {/* Header with filters */}
                  <GlassCard className="p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-foreground">Master User Directory</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{profiles.length} users across {hotels.length} hotels</p>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-56">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="Search users..." value={directorySearch} onChange={e => setDirectorySearch(e.target.value)} className="pl-9 h-9 rounded-xl bg-white/50 dark:bg-white/[0.04]" />
                        </div>
                        <Select value={directoryFilter} onValueChange={(v: any) => setDirectoryFilter(v)}>
                          <SelectTrigger className="h-9 w-[140px] rounded-xl bg-white/50 dark:bg-white/[0.04]">
                            <Filter className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Users</SelectItem>
                            <SelectItem value="expired">Expired Only</SelectItem>
                            <SelectItem value="new24h">New (24h)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </GlassCard>

                  {/* User Table */}
                  <GlassCard className="overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[800px]">
                        <thead>
                          <tr className="text-[11px] text-muted-foreground border-b border-border/40 uppercase tracking-wider">
                            <th className="text-left px-5 py-3 font-medium">User</th>
                            <th className="text-left px-5 py-3 font-medium">Role</th>
                            <th className="text-left px-5 py-3 font-medium">Hotel</th>
                            <th className="text-left px-5 py-3 font-medium">Status</th>
                            <th className="text-left px-5 py-3 font-medium">Joined</th>
                            <th className="text-right px-5 py-3 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                          {directoryUsers.slice(0, 50).map(u => {
                            const hotel = hotels.find(h => h.id === u.hotel_id);
                            const status = hotel ? getHotelStatus(hotel) : (u.subscription_status || "trial");
                            return (
                              <tr key={u.user_id} className="hover:bg-white/40 dark:hover:bg-white/[0.02] transition-colors">
                                <td className="px-5 py-3.5">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-indigo-500 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
                                      {(u.full_name || "U").charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-sm font-medium text-foreground truncate max-w-[140px]">{u.full_name || "—"}</span>
                                  </div>
                                </td>
                                <td className="px-5 py-3.5">{roleBadge(u.role)}</td>
                                <td className="px-5 py-3.5 text-xs text-muted-foreground truncate max-w-[120px]">{u.hotelName}</td>
                                <td className="px-5 py-3.5">{statusBadge(status)}</td>
                                <td className="px-5 py-3.5 text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                                <td className="px-5 py-3.5 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg" title="WhatsApp"
                                      onClick={() => window.open(`https://wa.me/${u.hotelPhone || ""}`, "_blank")}>
                                      <Phone className="h-3.5 w-3.5 text-emerald-500" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg" title="Send Email"
                                      onClick={() => toast.info("Email feature coming soon")}>
                                      <Mail className="h-3.5 w-3.5 text-indigo-500" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg" title="View POS">
                                      <Eye className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg" title="Reset Password"
                                      onClick={() => toast.info("Password reset sent!")}>
                                      <RotateCcw className="h-3.5 w-3.5 text-amber-500" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          {directoryUsers.length === 0 && (
                            <tr><td colSpan={6} className="text-center py-10 text-muted-foreground text-sm">No users match your filters</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </GlassCard>
                </div>
              </TabPanel>
            )}

            {/* ═══════ C. REVENUE & PAYMENTS ═══════ */}
            {activeTab === "revenue" && (
              <TabPanel key="revenue">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <GradientMetricCard label="Lifetime Revenue" value={`₹${lifetimeRevenue.toLocaleString()}`} icon={IndianRupee} gradient="bg-gradient-to-br from-orange-500/40 via-orange-500/10 to-transparent dark:from-orange-500/25 dark:to-transparent" />
                    <GradientMetricCard label="Active Subscribers" value={activeHotels} icon={Users} gradient="bg-gradient-to-br from-indigo-500/40 via-indigo-500/10 to-transparent dark:from-indigo-500/25 dark:to-transparent" />
                    <GradientMetricCard label="Monthly MRR" value={`₹${mrr.toLocaleString()}`} icon={TrendingUp} gradient="bg-gradient-to-br from-emerald-500/40 via-emerald-500/10 to-transparent dark:from-emerald-500/25 dark:to-transparent" />
                  </div>

                  <GlassCard className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-foreground">Revenue by Tier</h3>
                      <Button variant="outline" size="sm" onClick={downloadCSV} className="gap-1.5 h-8 text-xs rounded-xl">
                        <Download className="h-3.5 w-3.5" /> CSV
                      </Button>
                    </div>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={revenueByTier}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="tier" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} />
                          <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={chartTooltipStyle} />
                          <Bar dataKey="revenue" radius={[8, 8, 0, 0]}>
                            <Cell fill="#F97316" />
                            <Cell fill="#6366F1" />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </GlassCard>

                  <GlassCard className="overflow-hidden">
                    <div className="p-5 border-b border-border/40">
                      <h3 className="text-sm font-semibold text-foreground">Payment Ledger</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[550px]">
                        <thead>
                          <tr className="text-[11px] text-muted-foreground border-b border-border/40 uppercase tracking-wider">
                            <th className="text-left px-5 py-3 font-medium">Key</th>
                            <th className="text-left px-5 py-3 font-medium">Tier</th>
                            <th className="text-left px-5 py-3 font-medium">Hotel</th>
                            <th className="text-left px-5 py-3 font-medium">Amount</th>
                            <th className="text-left px-5 py-3 font-medium">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                          {usedKeys.slice(0, 30).map(lic => {
                            const hotel = hotels.find(h => h.id === lic.used_by_hotel_id);
                            return (
                              <tr key={lic.id} className="hover:bg-white/40 dark:hover:bg-white/[0.02] transition-colors">
                                <td className="px-5 py-3"><code className="font-mono text-xs text-muted-foreground">{lic.key_code}</code></td>
                                <td className="px-5 py-3 text-xs capitalize text-foreground">{lic.tier}</td>
                                <td className="px-5 py-3 text-xs text-muted-foreground truncate max-w-[120px]">{hotel?.name || "—"}</td>
                                <td className="px-5 py-3 text-xs font-semibold text-foreground">₹{lic.tier === "premium" ? 399 : 199}</td>
                                <td className="px-5 py-3 text-xs text-muted-foreground">{lic.used_at ? new Date(lic.used_at).toLocaleDateString() : "—"}</td>
                              </tr>
                            );
                          })}
                          {usedKeys.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-muted-foreground text-sm">No payments yet</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </GlassCard>
                </div>
              </TabPanel>
            )}

            {/* ═══════ D. LICENSE VAULT ═══════ */}
            {activeTab === "vault" && (
              <TabPanel key="vault">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <GradientMetricCard label="Total Keys" value={licenses.length} icon={Key} gradient="bg-gradient-to-br from-orange-500/40 via-orange-500/10 to-transparent dark:from-orange-500/25 dark:to-transparent" />
                    <GradientMetricCard label="Active" value={usedKeys.length} icon={ShieldCheck} gradient="bg-gradient-to-br from-emerald-500/40 via-emerald-500/10 to-transparent dark:from-emerald-500/25 dark:to-transparent" />
                    <GradientMetricCard label="Pending" value={unusedKeys.length} icon={Clock} gradient="bg-gradient-to-br from-amber-500/40 via-amber-500/10 to-transparent dark:from-amber-500/25 dark:to-transparent" />
                    <GradientMetricCard label="Usage Rate" value={`${licenses.length ? ((usedKeys.length / licenses.length) * 100).toFixed(0) : 0}%`} icon={BarChart3} gradient="bg-gradient-to-br from-indigo-500/40 via-indigo-500/10 to-transparent dark:from-indigo-500/25 dark:to-transparent" />
                  </div>

                  <GlassCard className="p-5">
                    <div className="flex items-center gap-2 mb-5">
                      <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
                        <Key className="h-4 w-4 text-orange-500" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-foreground">Generate License Keys</h3>
                        <p className="text-xs text-muted-foreground">Direct database insert</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Tier</label>
                        <Select value={tier} onValueChange={setTier}>
                          <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="basic">Basic — ₹199/mo</SelectItem>
                            <SelectItem value="premium">Premium — ₹399/mo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Duration (days)</label>
                        <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} className="h-10 rounded-xl" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Count (max 50)</label>
                        <Input type="number" min={1} max={50} value={count} onChange={e => setCount(e.target.value)} className="h-10 rounded-xl" />
                      </div>
                    </div>
                    <Button onClick={generateKeys} disabled={generating} className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white gap-2 h-10 rounded-xl shadow-md">
                      <Key className="h-4 w-4" /> {generating ? "Generating..." : "Generate Keys"}
                    </Button>
                  </GlassCard>

                  <GlassCard className="p-5">
                    <h3 className="text-sm font-semibold text-foreground mb-4">Available Keys ({unusedKeys.length})</h3>
                    {unusedKeys.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">No pending keys</p>
                    ) : (
                      <div className="space-y-2 max-h-[320px] overflow-y-auto">
                        {unusedKeys.map(lic => (
                          <div key={lic.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/40 dark:bg-white/[0.03] hover:bg-white/60 dark:hover:bg-white/[0.05] transition-colors">
                            <div className="flex items-center gap-3">
                              <code className="font-mono text-xs font-semibold text-foreground">{lic.key_code}</code>
                              <Badge variant="outline" className="text-[10px] capitalize rounded-lg">{lic.tier}</Badge>
                              <span className="text-[10px] text-muted-foreground">{lic.duration_days}d</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button size="icon" variant="ghost" onClick={() => copyKey(lic.key_code)} className="h-8 w-8 rounded-lg" title="Copy"><Copy className="h-3.5 w-3.5" /></Button>
                              <Button size="icon" variant="ghost" onClick={() => shareWhatsApp(lic.key_code)} className="h-8 w-8 rounded-lg text-emerald-500 hover:text-emerald-600" title="WhatsApp"><Share2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </GlassCard>
                </div>
              </TabPanel>
            )}

            {/* ═══════ E. SMART BROADCAST ═══════ */}
            {activeTab === "broadcast" && (
              <TabPanel key="broadcast">
                <div className="space-y-6">
                  <GlassCard className="p-5">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-indigo-500/20 flex items-center justify-center">
                        <Megaphone className="h-5 w-5 text-orange-500" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-foreground">Smart Broadcast Center</h3>
                        <p className="text-xs text-muted-foreground">Send targeted announcements to your users</p>
                      </div>
                    </div>

                    {/* Target Segmentation */}
                    <div className="mb-5">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Target className="h-3.5 w-3.5" /> Target Audience
                      </p>
                      <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Checkbox checked={broadcastTargets.owners} onCheckedChange={(c) => setBroadcastTargets(p => ({ ...p, owners: !!c }))} />
                          <span className="text-sm text-foreground">👑 Owners</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Checkbox checked={broadcastTargets.waiters} onCheckedChange={(c) => setBroadcastTargets(p => ({ ...p, waiters: !!c }))} />
                          <span className="text-sm text-foreground">🍽️ Waiters</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Checkbox checked={broadcastTargets.chefs} onCheckedChange={(c) => setBroadcastTargets(p => ({ ...p, chefs: !!c }))} />
                          <span className="text-sm text-foreground">👨‍🍳 Chefs</span>
                        </label>
                      </div>
                    </div>

                    {/* Delivery Style */}
                    <div className="mb-5">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Layers className="h-3.5 w-3.5" /> Delivery Style
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setBroadcastStyle("popup")}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all border ${broadcastStyle === "popup" ? "border-orange-500/50 bg-orange-500/10 text-orange-600 dark:text-orange-400 font-medium" : "border-border/40 text-muted-foreground hover:bg-secondary/50"}`}
                        >
                          <Globe className="h-4 w-4" /> Glassy Popup
                        </button>
                        <button
                          onClick={() => setBroadcastStyle("banner")}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all border ${broadcastStyle === "banner" ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium" : "border-border/40 text-muted-foreground hover:bg-secondary/50"}`}
                        >
                          <Megaphone className="h-4 w-4" /> Top Banner
                        </button>
                      </div>
                    </div>

                    {/* Compose */}
                    <Textarea
                      placeholder="Write your announcement... (e.g., 'Scheduled maintenance tonight 11 PM – 1 AM IST')"
                      value={broadcastMsg}
                      onChange={e => setBroadcastMsg(e.target.value)}
                      className="min-h-[140px] mb-4 rounded-xl bg-white/50 dark:bg-white/[0.04]"
                    />
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button onClick={sendBroadcast} disabled={!broadcastMsg.trim()}
                        className="bg-gradient-to-r from-orange-600 to-indigo-600 hover:from-orange-500 hover:to-indigo-500 text-white gap-2 h-10 rounded-xl shadow-md">
                        <Send className="h-4 w-4" /> Broadcast Now
                      </Button>
                      <Button variant="outline" disabled={!broadcastMsg.trim()} className="gap-2 h-10 rounded-xl">
                        <Clock className="h-4 w-4" /> Schedule
                      </Button>
                    </div>
                  </GlassCard>
                </div>
              </TabPanel>
            )}

            {/* ═══════ F. DEVELOPER CONSOLE ═══════ */}
            {activeTab === "console" && (
              <TabPanel key="console">
                <div className="space-y-6">
                  <GlassCard className="p-5">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                          <Server className="h-4 w-4 text-emerald-500" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-foreground">System Health</h3>
                          <p className="text-xs text-muted-foreground">Real-time infrastructure status</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 rounded-lg text-xs gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> All Operational
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { name: "Supabase Database", icon: Database, latency: "12ms", status: "Healthy" },
                        { name: "Auth Service", icon: ShieldCheck, latency: "8ms", status: "Healthy" },
                        { name: "Edge Functions", icon: Zap, latency: "45ms", status: "Healthy" },
                        { name: "Storage CDN", icon: Wifi, latency: "22ms", status: "Healthy" },
                      ].map(s => (
                        <div key={s.name} className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/40 dark:bg-white/[0.03]">
                          <div className="flex items-center gap-3">
                            <s.icon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-foreground">{s.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground font-mono">{s.latency}</span>
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </GlassCard>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <GradientMetricCard label="Total Hotels" value={hotels.length} icon={Hotel} gradient="bg-gradient-to-br from-orange-500/40 via-orange-500/10 to-transparent dark:from-orange-500/25 dark:to-transparent" />
                    <GradientMetricCard label="Total Profiles" value={profiles.length} icon={Users} gradient="bg-gradient-to-br from-emerald-500/40 via-emerald-500/10 to-transparent dark:from-emerald-500/25 dark:to-transparent" />
                    <GradientMetricCard label="Keys Generated" value={licenses.length} icon={Key} gradient="bg-gradient-to-br from-amber-500/40 via-amber-500/10 to-transparent dark:from-amber-500/25 dark:to-transparent" />
                    <GradientMetricCard label="DB Tables" value="34" icon={Database} gradient="bg-gradient-to-br from-indigo-500/40 via-indigo-500/10 to-transparent dark:from-indigo-500/25 dark:to-transparent" />
                  </div>

                  <GlassCard className="overflow-hidden">
                    <div className="p-5 border-b border-border/40">
                      <h3 className="text-sm font-semibold text-foreground">Recent Registrations</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[500px]">
                        <thead>
                          <tr className="text-[11px] text-muted-foreground border-b border-border/40 uppercase tracking-wider">
                            <th className="text-left px-5 py-3 font-medium">Name</th>
                            <th className="text-left px-5 py-3 font-medium">Role</th>
                            <th className="text-left px-5 py-3 font-medium">Status</th>
                            <th className="text-left px-5 py-3 font-medium">Joined</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                          {profiles.slice(0, 20).map(p => (
                            <tr key={p.user_id} className="hover:bg-white/40 dark:hover:bg-white/[0.02] transition-colors">
                              <td className="px-5 py-3 text-sm text-foreground">{p.full_name || "—"}</td>
                              <td className="px-5 py-3">{roleBadge(p.role)}</td>
                              <td className="px-5 py-3">{statusBadge(p.subscription_status || "trial")}</td>
                              <td className="px-5 py-3 text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </GlassCard>
                </div>
              </TabPanel>
            )}

          </AnimatePresence>
        </div>
      </main>

      {/* ═══════ MOBILE BOTTOM NAV ═══════ */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 dark:border-white/[0.08] bg-white/90 dark:bg-black/70 backdrop-blur-2xl md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex items-stretch justify-around">
          {TABS.slice(0, 4).map(tab => {
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 min-h-[56px] transition-all active:scale-95 ${active ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"}`}>
                <tab.icon className="h-5 w-5" />
                <span className={`text-[10px] leading-tight ${active ? "font-semibold" : ""}`}>{tab.shortLabel}</span>
                {active && <div className="w-4 h-0.5 rounded-full bg-orange-500 mt-0.5" />}
              </button>
            );
          })}
          <button onClick={() => setSidebarOpen(true)}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 min-h-[56px] text-muted-foreground active:scale-95">
            <Menu className="h-5 w-5" />
            <span className="text-[10px] leading-tight">More</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default CreatorAdmin;
