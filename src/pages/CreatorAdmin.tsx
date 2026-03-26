import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import {
  Key, Copy, RefreshCw, Hotel, IndianRupee, Users, ShieldCheck,
  TrendingUp, Activity, Eye, AlertTriangle, Send, Search,
  Crown, Zap, BarChart3, ScrollText
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell
} from "recharts";

interface License {
  id: string;
  key_code: string;
  tier: string;
  duration_days: number;
  is_used: boolean;
  used_at: string | null;
  used_by_hotel_id: string | null;
  created_at: string;
}

interface HotelInfo {
  id: string;
  name: string;
  owner_id: string;
  subscription_tier: string;
  subscription_expiry: string | null;
  created_at: string;
}

interface ProfileInfo {
  user_id: string;
  full_name: string | null;
  role: string | null;
  hotel_id: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  created_at: string;
}

const generateKeyCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const segments = Array.from({ length: 4 }, () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
  );
  return `SB-${segments.join("-")}`;
};

const CHART_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"];

const CreatorAdmin = () => {
  const { user } = useAuth();
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
  const [activeTab, setActiveTab] = useState("overview");

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

  useEffect(() => {
    if (isCreator) fetchData();
  }, [isCreator]);

  // Computed stats
  const usedKeys = licenses.filter((l) => l.is_used);
  const unusedKeys = licenses.filter((l) => !l.is_used);

  const getHotelStatus = (hotel: HotelInfo) => {
    if (hotel.subscription_expiry && new Date(hotel.subscription_expiry) > new Date()) return "active";
    const profile = profiles.find(p => p.hotel_id === hotel.id);
    if (profile?.subscription_status === "trial") return "trial";
    return "expired";
  };

  const activeHotels = hotels.filter(h => getHotelStatus(h) === "active").length;
  const trialHotels = hotels.filter(h => getHotelStatus(h) === "trial").length;
  const expiredHotels = hotels.filter(h => getHotelStatus(h) === "expired").length;

  const lifetimeRevenue = usedKeys.reduce((sum, l) => sum + (l.tier === "premium" ? 399 : 199), 0);
  const mrr = activeHotels * 250; // rough avg

  // Signup growth chart (last 30 days)
  const signupData = useMemo(() => {
    const days: Record<string, number> = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days[d.toISOString().slice(0, 10)] = 0;
    }
    profiles.forEach(p => {
      const day = p.created_at?.slice(0, 10);
      if (day && days[day] !== undefined) days[day]++;
    });
    return Object.entries(days).map(([date, count]) => ({
      date: date.slice(5),
      signups: count,
    }));
  }, [profiles]);

  // Tier distribution for pie chart
  const tierData = useMemo(() => [
    { name: "Active", value: activeHotels, color: "#6366f1" },
    { name: "Trial", value: trialHotels, color: "#f59e0b" },
    { name: "Expired", value: expiredHotels, color: "#ef4444" },
  ].filter(d => d.value > 0), [activeHotels, trialHotels, expiredHotels]);

  const filteredHotels = hotels.filter(h =>
    h.name.toLowerCase().includes(hotelSearch.toLowerCase())
  );

  const generateKeys = async () => {
    setGenerating(true);
    const numKeys = Math.min(parseInt(count) || 1, 50);
    const newKeys = Array.from({ length: numKeys }, () => ({
      key_code: generateKeyCode(),
      tier,
      duration_days: parseInt(duration),
      is_used: false,
    }));
    const { error } = await supabase.from("licenses").insert(newKeys);
    if (error) toast.error("Failed: " + error.message);
    else { toast.success(`${numKeys} key(s) generated!`); fetchData(); }
    setGenerating(false);
  };

  const copyKey = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Key copied!");
  };

  const sendGlobalNotice = () => {
    if (!globalNotice.trim()) return;
    // Store in platform_config (read-only for clients, but we use migration/insert for write)
    toast.success("Global notice broadcast queued (feature placeholder).");
    setGlobalNotice("");
  };

  if (!isCreator) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <ShieldCheck className="h-12 w-12 text-destructive mb-3" />
        <p className="text-muted-foreground text-lg font-semibold">Access Denied — Creator Only</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      {/* Header */}
      <div className="border-b border-indigo-500/20 bg-gradient-to-r from-[#0f0f2e] to-[#1a1a3e] px-4 md:px-8 py-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-amber-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Crown className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-indigo-300 to-amber-300 bg-clip-text text-transparent">
              Command Center
            </h1>
            <p className="text-xs text-indigo-300/60">Speedo Bill • God Mode</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="border-b border-indigo-500/10 bg-[#0d0d25] px-4 md:px-8 overflow-x-auto">
          <TabsList className="bg-transparent border-0 h-12 gap-1 p-0">
            {[
              { value: "overview", label: "Client Overview", icon: Hotel },
              { value: "finance", label: "Financial", icon: IndianRupee },
              { value: "insights", label: "User Insights", icon: BarChart3 },
              { value: "tools", label: "System Tools", icon: Zap },
            ].map(tab => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-300 data-[state=active]:border-b-2 data-[state=active]:border-indigo-400 text-indigo-300/50 rounded-none px-4 py-2.5 gap-2 text-sm font-medium transition-all"
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto space-y-6">

          {/* ─── A. CLIENT OVERVIEW ─── */}
          <TabsContent value="overview" className="space-y-6 mt-0">
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Hotels", value: hotels.length, icon: Hotel, accent: "from-indigo-500/20 to-indigo-500/5", iconColor: "text-indigo-400" },
                { label: "Active", value: activeHotels, icon: Activity, accent: "from-emerald-500/20 to-emerald-500/5", iconColor: "text-emerald-400" },
                { label: "Trial", value: trialHotels, icon: Zap, accent: "from-amber-500/20 to-amber-500/5", iconColor: "text-amber-400" },
                { label: "Expired", value: expiredHotels, icon: AlertTriangle, accent: "from-red-500/20 to-red-500/5", iconColor: "text-red-400" },
              ].map(stat => (
                <div key={stat.label} className={`rounded-xl border border-indigo-500/10 bg-gradient-to-br ${stat.accent} p-4`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-indigo-200/50 font-medium">{stat.label}</span>
                    <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
                  </div>
                  <p className="text-2xl md:text-3xl font-bold text-white">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Hotel List */}
            <div className="rounded-xl border border-indigo-500/10 bg-[#0d0d25] overflow-hidden">
              <div className="p-4 border-b border-indigo-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-indigo-200">All Registered Hotels</h3>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-300/40" />
                  <Input
                    placeholder="Search hotels..."
                    value={hotelSearch}
                    onChange={e => setHotelSearch(e.target.value)}
                    className="pl-9 bg-indigo-500/5 border-indigo-500/20 text-indigo-100 placeholder:text-indigo-300/30 h-9"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="text-xs text-indigo-300/50 border-b border-indigo-500/10">
                      <th className="text-left px-4 py-3 font-medium">Hotel</th>
                      <th className="text-left px-4 py-3 font-medium">Tier</th>
                      <th className="text-left px-4 py-3 font-medium">Status</th>
                      <th className="text-left px-4 py-3 font-medium">Created</th>
                      <th className="text-right px-4 py-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-500/5">
                    {filteredHotels.map(hotel => {
                      const status = getHotelStatus(hotel);
                      const statusStyles: Record<string, string> = {
                        active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
                        trial: "bg-amber-500/10 text-amber-400 border-amber-500/30",
                        expired: "bg-red-500/10 text-red-400 border-red-500/30",
                      };
                      return (
                        <tr key={hotel.id} className="hover:bg-indigo-500/5 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                                <Hotel className="h-4 w-4 text-indigo-400" />
                              </div>
                              <span className="text-sm font-medium text-indigo-100 truncate max-w-[160px]">{hotel.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="text-xs capitalize border-indigo-500/30 text-indigo-300">{hotel.subscription_tier}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={`text-xs capitalize ${statusStyles[status]}`}>{status}</Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-indigo-300/50">
                            {new Date(hotel.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button size="sm" variant="ghost" className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 gap-1 h-8 text-xs">
                              <Eye className="h-3.5 w-3.5" /> Impersonate
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredHotels.length === 0 && (
                      <tr><td colSpan={5} className="text-center py-8 text-indigo-300/30 text-sm">No hotels found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* ─── B. FINANCIAL ANALYTICS ─── */}
          <TabsContent value="finance" className="space-y-6 mt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: "Lifetime Revenue", value: `₹${lifetimeRevenue.toLocaleString()}`, icon: IndianRupee, accent: "from-amber-500/20 to-amber-500/5", iconColor: "text-amber-400" },
                { label: "Active Subscriptions", value: activeHotels, icon: Users, accent: "from-indigo-500/20 to-indigo-500/5", iconColor: "text-indigo-400" },
                { label: "Est. MRR", value: `₹${mrr.toLocaleString()}`, icon: TrendingUp, accent: "from-emerald-500/20 to-emerald-500/5", iconColor: "text-emerald-400" },
              ].map(stat => (
                <div key={stat.label} className={`rounded-xl border border-indigo-500/10 bg-gradient-to-br ${stat.accent} p-5`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-indigo-200/50 font-medium">{stat.label}</span>
                    <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
                  </div>
                  <p className="text-2xl md:text-3xl font-bold text-white">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Pie Chart */}
            <div className="rounded-xl border border-indigo-500/10 bg-[#0d0d25] p-5">
              <h3 className="text-base font-semibold text-indigo-200 mb-4">Subscription Distribution</h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={tierData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={4} stroke="none">
                      {tierData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#1a1a3e", border: "1px solid #6366f140", borderRadius: 8, color: "#e0e7ff" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-2">
                {tierData.map(t => (
                  <div key={t.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: t.color }} />
                    <span className="text-indigo-200/60">{t.name}: {t.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ─── C. USER INSIGHTS ─── */}
          <TabsContent value="insights" className="space-y-6 mt-0">
            {/* Signup Growth */}
            <div className="rounded-xl border border-indigo-500/10 bg-[#0d0d25] p-5">
              <h3 className="text-base font-semibold text-indigo-200 mb-4">User Signups — Last 30 Days</h3>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={signupData}>
                    <defs>
                      <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#6366f115" />
                    <XAxis dataKey="date" tick={{ fill: "#6366f180", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#6366f180", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "#1a1a3e", border: "1px solid #6366f140", borderRadius: 8, color: "#e0e7ff" }} />
                    <Area type="monotone" dataKey="signups" stroke="#6366f1" fill="url(#signupGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Profiles */}
            <div className="rounded-xl border border-indigo-500/10 bg-[#0d0d25] overflow-hidden">
              <div className="p-4 border-b border-indigo-500/10">
                <h3 className="text-base font-semibold text-indigo-200">Recent User Activity</h3>
                <p className="text-xs text-indigo-300/40 mt-0.5">Latest registered profiles</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="text-xs text-indigo-300/50 border-b border-indigo-500/10">
                      <th className="text-left px-4 py-3 font-medium">Name</th>
                      <th className="text-left px-4 py-3 font-medium">Role</th>
                      <th className="text-left px-4 py-3 font-medium">Status</th>
                      <th className="text-left px-4 py-3 font-medium">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-500/5">
                    {profiles.slice(0, 20).map(p => (
                      <tr key={p.user_id} className="hover:bg-indigo-500/5 transition-colors">
                        <td className="px-4 py-3 text-sm text-indigo-100">{p.full_name || "—"}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs capitalize border-indigo-500/30 text-indigo-300">{p.role || "owner"}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`text-xs capitalize ${
                            p.subscription_status === "active" ? "text-emerald-400 border-emerald-500/30" :
                            p.subscription_status === "trial" ? "text-amber-400 border-amber-500/30" :
                            "text-red-400 border-red-500/30"
                          }`}>{p.subscription_status || "trial"}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-indigo-300/50">{new Date(p.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* ─── D. SYSTEM TOOLS ─── */}
          <TabsContent value="tools" className="space-y-6 mt-0">
            {/* License Generator */}
            <div className="rounded-xl border border-indigo-500/10 bg-[#0d0d25] p-5">
              <div className="flex items-center gap-2 mb-4">
                <Key className="h-5 w-5 text-amber-400" />
                <h3 className="text-base font-semibold text-indigo-200">License Generator</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-indigo-200/60">Tier</label>
                  <Select value={tier} onValueChange={setTier}>
                    <SelectTrigger className="bg-indigo-500/5 border-indigo-500/20 text-indigo-100 h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a3e] border-indigo-500/20">
                      <SelectItem value="basic">Basic — ₹199/mo</SelectItem>
                      <SelectItem value="premium">Premium — ₹399/mo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-indigo-200/60">Duration (days)</label>
                  <Input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="bg-indigo-500/5 border-indigo-500/20 text-indigo-100 h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-indigo-200/60">Count (max 50)</label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={count}
                    onChange={(e) => setCount(e.target.value)}
                    className="bg-indigo-500/5 border-indigo-500/20 text-indigo-100 h-10"
                  />
                </div>
              </div>
              <Button
                onClick={generateKeys}
                disabled={generating}
                className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white gap-2 h-10"
              >
                <Key className="h-4 w-4" /> {generating ? "Generating..." : "Generate Keys"}
              </Button>

              {/* Unused keys */}
              {unusedKeys.length > 0 && (
                <div className="mt-5 border-t border-indigo-500/10 pt-4">
                  <p className="text-xs font-medium text-indigo-200/50 mb-3">Unused Keys ({unusedKeys.length})</p>
                  <div className="space-y-1 max-h-[240px] overflow-y-auto">
                    {unusedKeys.map(lic => (
                      <div key={lic.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-indigo-500/5 transition-colors">
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-xs text-indigo-200">{lic.key_code}</code>
                          <Badge variant="outline" className="text-[10px] capitalize border-amber-500/30 text-amber-400">{lic.tier}</Badge>
                          <span className="text-[10px] text-indigo-300/40">{lic.duration_days}d</span>
                        </div>
                        <Button size="icon" variant="ghost" onClick={() => copyKey(lic.key_code)} className="text-indigo-300/50 hover:text-indigo-200 h-8 w-8">
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Global Notice */}
            <div className="rounded-xl border border-indigo-500/10 bg-[#0d0d25] p-5">
              <div className="flex items-center gap-2 mb-4">
                <Send className="h-5 w-5 text-amber-400" />
                <h3 className="text-base font-semibold text-indigo-200">Global Notice Broadcast</h3>
              </div>
              <p className="text-xs text-indigo-300/40 mb-3">Send a popup message to all hotel owners (e.g., maintenance window, updates).</p>
              <Textarea
                placeholder="Type your message here..."
                value={globalNotice}
                onChange={e => setGlobalNotice(e.target.value)}
                className="bg-indigo-500/5 border-indigo-500/20 text-indigo-100 placeholder:text-indigo-300/30 min-h-[80px] mb-3"
              />
              <Button
                onClick={sendGlobalNotice}
                disabled={!globalNotice.trim()}
                className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white gap-2 h-10"
              >
                <Send className="h-4 w-4" /> Broadcast Notice
              </Button>
            </div>

            {/* Used keys summary */}
            <div className="rounded-xl border border-indigo-500/10 bg-[#0d0d25] p-5">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <h3 className="text-base font-semibold text-indigo-200">Activated Keys ({usedKeys.length})</h3>
              </div>
              {usedKeys.length === 0 ? (
                <p className="text-sm text-indigo-300/30">No keys activated yet</p>
              ) : (
                <div className="space-y-1 max-h-[240px] overflow-y-auto">
                  {usedKeys.map(lic => {
                    const hotel = hotels.find(h => h.id === lic.used_by_hotel_id);
                    return (
                      <div key={lic.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-indigo-500/5 transition-colors">
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-xs text-indigo-300/50 line-through">{lic.key_code}</code>
                          <span className="text-[10px] text-indigo-300/40">{lic.tier}</span>
                          {hotel && <span className="text-[10px] text-indigo-200/40 truncate max-w-[120px]">• {hotel.name}</span>}
                        </div>
                        <span className="text-[10px] text-indigo-300/40">{lic.used_at ? new Date(lic.used_at).toLocaleDateString() : ""}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default CreatorAdmin;
