import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import {
  Key, Copy, Hotel, IndianRupee, Users, ShieldCheck,
  TrendingUp, Activity, Eye, AlertTriangle, Send, Search,
  Crown, Zap, BarChart3, CreditCard, Bell, ServerCrash,
  ChevronLeft, Menu, X, Sun, Moon, LogOut
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
  subscription_expiry: string | null; created_at: string;
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

type TabId = "analytics" | "clients" | "licenses" | "finance" | "broadcast" | "logs";

const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: "analytics", label: "Analytics Hub", icon: BarChart3 },
  { id: "clients", label: "Client Directory", icon: Hotel },
  { id: "licenses", label: "License Generator", icon: Key },
  { id: "finance", label: "Finance & Billing", icon: CreditCard },
  { id: "broadcast", label: "Broadcast Center", icon: Bell },
  { id: "logs", label: "System & Logs", icon: ServerCrash },
];

const CreatorAdmin = () => {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabId>("analytics");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const [licenses, setLicenses] = useState<License[]>([]);
  const [hotels, setHotels] = useState<HotelInfo[]>([]);
  const [profiles, setProfiles] = useState<ProfileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [tier, setTier] = useState("basic");
  const [duration, setDuration] = useState("30");
  const [count, setCount] = useState("1");
  const [globalNotice, setGlobalNotice] = useState("");
  const [hotelSearch, setHotelSearch] = useState("");

  const isCreator = user?.email === "speedobill7@gmail.com";

  const fetchData = async () => {
    setLoading(true);
    const [licRes, hotelRes, profileRes] = await Promise.all([
      supabase.from("licenses").select("*").order("created_at", { ascending: false }),
      supabase.from("hotels").select("id, name, owner_id, subscription_tier, subscription_expiry, created_at"),
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

  const signupData = useMemo(() => {
    const days: Record<string, number> = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      days[d.toISOString().slice(0, 10)] = 0;
    }
    profiles.forEach(p => { const day = p.created_at?.slice(0, 10); if (day && days[day] !== undefined) days[day]++; });
    return Object.entries(days).map(([date, count]) => ({ date: date.slice(5), signups: count }));
  }, [profiles]);

  const tierData = useMemo(() => [
    { name: "Active", value: activeHotels, color: "hsl(var(--success))" },
    { name: "Trial", value: trialHotels, color: "hsl(var(--amber))" },
    { name: "Expired", value: expiredHotels, color: "hsl(var(--destructive))" },
  ].filter(d => d.value > 0), [activeHotels, trialHotels, expiredHotels]);

  const revenueByTier = useMemo(() => [
    { tier: "Basic", revenue: usedKeys.filter(l => l.tier === "basic").length * 199 },
    { tier: "Premium", revenue: usedKeys.filter(l => l.tier === "premium").length * 399 },
  ], [usedKeys]);

  const filteredHotels = hotels.filter(h => h.name.toLowerCase().includes(hotelSearch.toLowerCase()));

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

  const sendBroadcast = () => {
    if (!globalNotice.trim()) return;
    toast.success("Notice broadcast sent to all active hotel owners.");
    setGlobalNotice("");
  };

  /* ─── Guard ─── */
  if (!isCreator) {
    return (
      <div className="flex min-h-screen items-center justify-center flex-col gap-3 bg-background">
        <ShieldCheck className="h-12 w-12 text-destructive" />
        <p className="text-lg font-semibold text-foreground">Access Denied — Creator Only</p>
      </div>
    );
  }

  /* ─── Sidebar Nav Item ─── */
  const NavItem = ({ tab, onClick }: { tab: typeof TABS[0]; onClick?: () => void }) => {
    const active = activeTab === tab.id;
    return (
      <button
        onClick={() => { setActiveTab(tab.id); onClick?.(); }}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all min-h-[44px] active:scale-[0.97] ${
          active
            ? "bg-indigo-500/15 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 font-semibold"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
        }`}
      >
        <tab.icon className={`h-[18px] w-[18px] flex-shrink-0 ${active ? "text-indigo-600 dark:text-indigo-400" : ""}`} />
        {!collapsed && <span className="truncate">{tab.label}</span>}
        {active && !collapsed && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500" />}
      </button>
    );
  };

  const SidebarContent = ({ onItemClick }: { onItemClick?: () => void }) => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 py-4 mb-2">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-amber-500 flex items-center justify-center shadow-lg">
          <Crown className="h-4.5 w-4.5 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground leading-none" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Command Center</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">God Mode</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
        {!collapsed && <p className="px-3 mb-1 text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">Navigation</p>}
        {TABS.map(tab => <NavItem key={tab.id} tab={tab} onClick={onItemClick} />)}
      </nav>

      {/* Footer */}
      <div className="border-t border-border pt-3 mt-3 px-2 space-y-1 pb-2">
        <button onClick={toggleTheme} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors min-h-[44px]">
          {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          {!collapsed && <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
        </button>
        <Button variant="ghost" className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10 rounded-xl min-h-[44px]" onClick={signOut}>
          <LogOut className="h-[18px] w-[18px]" />
          {!collapsed && <span>Sign Out</span>}
        </Button>
      </div>
    </>
  );

  /* ─── Chart tooltip ─── */
  const chartTooltipStyle = {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    color: "hsl(var(--foreground))",
  };

  /* ─── Metric Card ─── */
  const MetricCard = ({ label, value, icon: Icon, accent }: { label: string; value: string | number; icon: any; accent: string }) => (
    <Card className="border-border bg-card">
      <CardContent className="p-4 flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground mb-1">{label}</p>
          <p className="text-2xl md:text-3xl font-bold text-foreground">{value}</p>
        </div>
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* ─── Mobile Top Bar ─── */}
      <div className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-border bg-card/95 backdrop-blur-xl px-4 md:hidden">
        <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-1 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center">
          <Menu className="h-5 w-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-amber-500 flex items-center justify-center">
            <Crown className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Command Center</span>
        </div>
        <button onClick={toggleTheme} className="p-2 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center">
          {theme === "dark" ? <Sun className="h-4 w-4 text-muted-foreground" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
        </button>
      </div>

      {/* ─── Mobile Sidebar Overlay ─── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[60] md:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-card border-r border-border flex flex-col p-3 animate-slide-in-right" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-end mb-2">
              <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-xl hover:bg-secondary min-h-[44px] min-w-[44px] flex items-center justify-center">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <SidebarContent onItemClick={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* ─── Desktop Sidebar ─── */}
      <aside className={`hidden md:flex flex-col border-r border-border bg-card sticky top-0 h-screen transition-all duration-200 ${collapsed ? "w-16" : "w-56 lg:w-60"}`}>
        <div className="flex items-center justify-end px-3 py-3 mb-1">
          <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground min-h-[36px] min-w-[36px] flex items-center justify-center">
            <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          </button>
        </div>
        <SidebarContent />
      </aside>

      {/* ─── Main Content ─── */}
      <main className="flex-1 min-h-screen pt-14 md:pt-0 overflow-x-hidden">
        {/* Desktop header */}
        <div className="hidden md:flex h-12 items-center justify-between px-6 border-b border-border bg-card/50">
          <h2 className="text-sm font-semibold text-foreground">{TABS.find(t => t.id === activeTab)?.label}</h2>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-secondary/60 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center">
              {theme === "dark" ? <Sun className="h-4 w-4 text-muted-foreground" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-amber-500 flex items-center justify-center text-white text-xs font-bold">SB</div>
          </div>
        </div>

        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">

          {/* ═══════ A. ANALYTICS HUB ═══════ */}
          {activeTab === "analytics" && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard label="Total Hotels" value={hotels.length} icon={Hotel} accent="bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400" />
                <MetricCard label="Active" value={activeHotels} icon={Activity} accent="bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" />
                <MetricCard label="Total Cash Flow" value={`₹${lifetimeRevenue.toLocaleString()}`} icon={IndianRupee} accent="bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400" />
                <MetricCard label="Est. MRR" value={`₹${mrr.toLocaleString()}`} icon={TrendingUp} accent="bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400" />
              </div>

              {/* User Growth Chart */}
              <Card className="border-border bg-card">
                <CardContent className="p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-4">User Growth — Last 30 Days</h3>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={signupData}>
                        <defs>
                          <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--indigo))" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="hsl(var(--indigo))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={chartTooltipStyle} />
                        <Area type="monotone" dataKey="signups" stroke="hsl(var(--indigo))" fill="url(#signupGrad)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Subscription Pie */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-border bg-card">
                  <CardContent className="p-5">
                    <h3 className="text-sm font-semibold text-foreground mb-4">Market Penetration</h3>
                    <div className="h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={tierData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={4} stroke="none">
                            {tierData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <Tooltip contentStyle={chartTooltipStyle} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-5 mt-2">
                      {tierData.map(t => (
                        <div key={t.name} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: t.color }} />
                          {t.name}: {t.value}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border bg-card">
                  <CardContent className="p-5">
                    <h3 className="text-sm font-semibold text-foreground mb-4">Quick Stats</h3>
                    <div className="space-y-4">
                      {[
                        { label: "Trial Users", value: trialHotels, color: "bg-amber-500" },
                        { label: "Expired Users", value: expiredHotels, color: "bg-destructive" },
                        { label: "Unused Keys", value: unusedKeys.length, color: "bg-indigo-500" },
                        { label: "Total Users", value: profiles.length, color: "bg-emerald-500" },
                      ].map(s => (
                        <div key={s.label} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${s.color}`} />
                            <span className="text-sm text-muted-foreground">{s.label}</span>
                          </div>
                          <span className="text-sm font-semibold text-foreground">{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* ═══════ B. CLIENT DIRECTORY ═══════ */}
          {activeTab === "clients" && (
            <Card className="border-border bg-card overflow-hidden">
              <div className="p-4 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-foreground">All Registered Hotels</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{hotels.length} hotels registered</p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search hotels..." value={hotelSearch} onChange={e => setHotelSearch(e.target.value)} className="pl-9 h-9" />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="text-xs text-muted-foreground border-b border-border">
                      <th className="text-left px-4 py-3 font-medium">Hotel</th>
                      <th className="text-left px-4 py-3 font-medium">Tier</th>
                      <th className="text-left px-4 py-3 font-medium">Status</th>
                      <th className="text-left px-4 py-3 font-medium">License Expiry</th>
                      <th className="text-left px-4 py-3 font-medium">Created</th>
                      <th className="text-right px-4 py-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredHotels.map(hotel => {
                      const status = getHotelStatus(hotel);
                      return (
                        <tr key={hotel.id} className="hover:bg-secondary/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/15 flex items-center justify-center">
                                <Hotel className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                              </div>
                              <span className="text-sm font-medium text-foreground truncate max-w-[160px]">{hotel.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3"><Badge variant="outline" className="text-xs capitalize">{hotel.subscription_tier}</Badge></td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={`text-xs capitalize ${
                              status === "active" ? "text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30" :
                              status === "trial" ? "text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-500/30" :
                              "text-destructive border-destructive/30"
                            }`}>{status}</Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {hotel.subscription_expiry ? new Date(hotel.subscription_expiry).toLocaleDateString() : "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(hotel.created_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-right">
                            <Button size="sm" variant="outline" className="gap-1 h-8 text-xs"><Eye className="h-3.5 w-3.5" /> Manage</Button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredHotels.length === 0 && (
                      <tr><td colSpan={6} className="text-center py-8 text-muted-foreground text-sm">No hotels found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* ═══════ C. LICENSE GENERATOR ═══════ */}
          {activeTab === "licenses" && (
            <>
              <Card className="border-border bg-card">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Key className="h-5 w-5 text-amber-500" />
                    <h3 className="text-base font-semibold text-foreground">Generate New Keys</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Tier</label>
                      <Select value={tier} onValueChange={setTier}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basic">Basic — ₹199/mo</SelectItem>
                          <SelectItem value="premium">Premium — ₹399/mo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Duration (days)</label>
                      <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} className="h-10" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Count (max 50)</label>
                      <Input type="number" min={1} max={50} value={count} onChange={e => setCount(e.target.value)} className="h-10" />
                    </div>
                  </div>
                  <Button onClick={generateKeys} disabled={generating} className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 h-10">
                    <Key className="h-4 w-4" /> {generating ? "Generating..." : "Generate Keys"}
                  </Button>
                </CardContent>
              </Card>

              {/* Unused */}
              <Card className="border-border bg-card">
                <CardContent className="p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Unused Keys ({unusedKeys.length})</h3>
                  {unusedKeys.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No unused keys</p>
                  ) : (
                    <div className="space-y-1 max-h-[300px] overflow-y-auto">
                      {unusedKeys.map(lic => (
                        <div key={lic.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-secondary/30 transition-colors">
                          <div className="flex items-center gap-2">
                            <code className="font-mono text-xs font-semibold text-foreground">{lic.key_code}</code>
                            <Badge variant="outline" className="text-[10px] capitalize">{lic.tier}</Badge>
                            <span className="text-[10px] text-muted-foreground">{lic.duration_days}d</span>
                          </div>
                          <Button size="icon" variant="ghost" onClick={() => copyKey(lic.key_code)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Used */}
              <Card className="border-border bg-card">
                <CardContent className="p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Activated Keys ({usedKeys.length})</h3>
                  {usedKeys.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No activated keys</p>
                  ) : (
                    <div className="space-y-1 max-h-[300px] overflow-y-auto">
                      {usedKeys.map(lic => {
                        const hotel = hotels.find(h => h.id === lic.used_by_hotel_id);
                        return (
                          <div key={lic.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-secondary/30 transition-colors">
                            <div className="flex items-center gap-2">
                              <code className="font-mono text-xs text-muted-foreground line-through">{lic.key_code}</code>
                              <span className="text-[10px] text-muted-foreground">{lic.tier}</span>
                              {hotel && <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">• {hotel.name}</span>}
                            </div>
                            <span className="text-[10px] text-muted-foreground">{lic.used_at ? new Date(lic.used_at).toLocaleDateString() : ""}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* ═══════ D. FINANCE & BILLING ═══════ */}
          {activeTab === "finance" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard label="Lifetime Revenue" value={`₹${lifetimeRevenue.toLocaleString()}`} icon={IndianRupee} accent="bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400" />
                <MetricCard label="Active Subscriptions" value={activeHotels} icon={Users} accent="bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400" />
                <MetricCard label="Monthly MRR" value={`₹${mrr.toLocaleString()}`} icon={TrendingUp} accent="bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" />
              </div>

              <Card className="border-border bg-card">
                <CardContent className="p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Revenue by Subscription Type</h3>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueByTier}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="tier" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} />
                        <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={chartTooltipStyle} />
                        <Bar dataKey="revenue" fill="hsl(var(--indigo))" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Payment log */}
              <Card className="border-border bg-card">
                <CardContent className="p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Payment Log (Activated Keys)</h3>
                  {usedKeys.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No payments recorded</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[500px]">
                        <thead>
                          <tr className="text-xs text-muted-foreground border-b border-border">
                            <th className="text-left px-3 py-2 font-medium">Key</th>
                            <th className="text-left px-3 py-2 font-medium">Tier</th>
                            <th className="text-left px-3 py-2 font-medium">Hotel</th>
                            <th className="text-left px-3 py-2 font-medium">Amount</th>
                            <th className="text-left px-3 py-2 font-medium">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {usedKeys.slice(0, 30).map(lic => {
                            const hotel = hotels.find(h => h.id === lic.used_by_hotel_id);
                            return (
                              <tr key={lic.id} className="hover:bg-secondary/30 transition-colors">
                                <td className="px-3 py-2"><code className="font-mono text-xs text-muted-foreground">{lic.key_code}</code></td>
                                <td className="px-3 py-2 text-xs capitalize text-foreground">{lic.tier}</td>
                                <td className="px-3 py-2 text-xs text-muted-foreground truncate max-w-[120px]">{hotel?.name || "—"}</td>
                                <td className="px-3 py-2 text-xs font-semibold text-foreground">₹{lic.tier === "premium" ? 399 : 199}</td>
                                <td className="px-3 py-2 text-xs text-muted-foreground">{lic.used_at ? new Date(lic.used_at).toLocaleDateString() : "—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {/* ═══════ E. BROADCAST CENTER ═══════ */}
          {activeTab === "broadcast" && (
            <Card className="border-border bg-card">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Send className="h-5 w-5 text-amber-500" />
                  <h3 className="text-base font-semibold text-foreground">Global Notice Broadcast</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-4">Send a popup/notification to every active hotel owner. Use for maintenance, updates, or announcements.</p>
                <Textarea
                  placeholder="Type your broadcast message here..."
                  value={globalNotice}
                  onChange={e => setGlobalNotice(e.target.value)}
                  className="min-h-[120px] mb-4"
                />
                <Button onClick={sendBroadcast} disabled={!globalNotice.trim()} className="bg-amber-600 hover:bg-amber-500 text-white gap-2 h-10">
                  <Send className="h-4 w-4" /> Broadcast to All Owners
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ═══════ F. SYSTEM STATUS & LOGS ═══════ */}
          {activeTab === "logs" && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard label="Total Hotels" value={hotels.length} icon={Hotel} accent="bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400" />
                <MetricCard label="Total Profiles" value={profiles.length} icon={Users} accent="bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" />
                <MetricCard label="Keys Generated" value={licenses.length} icon={Key} accent="bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400" />
                <MetricCard label="Keys Used" value={usedKeys.length} icon={ShieldCheck} accent="bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400" />
              </div>

              <Card className="border-border bg-card">
                <CardContent className="p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Recent User Registrations</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[500px]">
                      <thead>
                        <tr className="text-xs text-muted-foreground border-b border-border">
                          <th className="text-left px-3 py-2 font-medium">Name</th>
                          <th className="text-left px-3 py-2 font-medium">Role</th>
                          <th className="text-left px-3 py-2 font-medium">Status</th>
                          <th className="text-left px-3 py-2 font-medium">Joined</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {profiles.slice(0, 25).map(p => (
                          <tr key={p.user_id} className="hover:bg-secondary/30 transition-colors">
                            <td className="px-3 py-2 text-sm text-foreground">{p.full_name || "—"}</td>
                            <td className="px-3 py-2"><Badge variant="outline" className="text-xs capitalize">{p.role || "owner"}</Badge></td>
                            <td className="px-3 py-2">
                              <Badge variant="outline" className={`text-xs capitalize ${
                                p.subscription_status === "active" ? "text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30" :
                                p.subscription_status === "trial" ? "text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-500/30" :
                                "text-destructive border-destructive/30"
                              }`}>{p.subscription_status || "trial"}</Badge>
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-foreground">System Health</h3>
                    <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30 text-xs">All Systems Operational</Badge>
                  </div>
                  <div className="space-y-3">
                    {[
                      { name: "Supabase Database", status: "Healthy" },
                      { name: "Auth Service", status: "Healthy" },
                      { name: "Edge Functions", status: "Healthy" },
                      { name: "Storage Buckets", status: "Healthy" },
                    ].map(s => (
                      <div key={s.name} className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/30">
                        <span className="text-sm text-foreground">{s.name}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-xs text-muted-foreground">{s.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>

      {/* ─── Mobile Bottom Nav ─── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-xl md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex items-stretch justify-around">
          {TABS.slice(0, 4).map(tab => {
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 min-h-[56px] transition-colors active:scale-95 ${active ? "text-indigo-600 dark:text-indigo-400" : "text-muted-foreground"}`}>
                <tab.icon className="h-5 w-5" />
                <span className={`text-[10px] leading-tight ${active ? "font-semibold" : ""}`}>{tab.label.split(" ")[0]}</span>
                {active && <div className="w-4 h-0.5 rounded-full bg-indigo-500 mt-0.5" />}
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
