import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Key, Copy, Plus, RefreshCw, Hotel, IndianRupee, Users, ShieldCheck } from "lucide-react";

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

const generateKeyCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const segments = Array.from({ length: 4 }, () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
  );
  return `${segments.join("-")}`;
};

const CreatorAdmin = () => {
  const { user } = useAuth();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [tier, setTier] = useState("basic");
  const [duration, setDuration] = useState("30");
  const [count, setCount] = useState("1");
  const [hotels, setHotels] = useState<{ id: string; name: string; owner_id: string }[]>([]);

  const isCreator = user?.email === "speedobill7@gmail.com";

  const fetchData = async () => {
    setLoading(true);
    const [licRes, hotelRes] = await Promise.all([
      supabase.from("licenses").select("*").order("created_at", { ascending: false }),
      supabase.from("hotels").select("id, name, owner_id"),
    ]);
    if (licRes.data) setLicenses(licRes.data);
    if (hotelRes.data) setHotels(hotelRes.data as any);
    setLoading(false);
  };

  useEffect(() => {
    if (isCreator) fetchData();
  }, [isCreator]);

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
    toast.success("Copied to clipboard");
  };

  if (!isCreator) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Access denied. Creator admin only.</p>
      </div>
    );
  }

  const unusedKeys = licenses.filter((l) => !l.is_used);
  const usedKeys = licenses.filter((l) => l.is_used);
  const activeSubscriptions = usedKeys.length;
  const projectedRevenue = usedKeys.reduce((sum, l) => sum + (l.tier === "premium" ? 399 : 199), 0);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Breadcrumb + Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Speedo Bill / <span className="text-foreground font-medium">Creator Admin</span></p>
          <h1 className="text-2xl font-bold text-foreground">Creator Admin</h1>
          <p className="text-sm text-muted-foreground">Manage all Speedo Bill hotels</p>
        </div>
        <Button className="gradient-btn-primary rounded-lg gap-2">
          <Plus className="h-4 w-4" /> Add Hotel
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Hotels</p>
              <p className="text-3xl font-bold text-foreground">{hotels.length}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Hotel className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Active Subscriptions</p>
              <p className="text-3xl font-bold text-foreground">{activeSubscriptions}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Projected Monthly Revenue</p>
              <p className="text-3xl font-bold text-foreground flex items-center gap-1">
                <IndianRupee className="h-5 w-5" />{projectedRevenue}
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <IndianRupee className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* License Key Generator */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Key className="h-5 w-5 text-primary" /> License Key Generator
          </CardTitle>
          <p className="text-sm text-muted-foreground">Generate license keys for hotel owners. They can activate these keys on their Settings page.</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Tier</label>
              <Select value={tier} onValueChange={setTier}>
                <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic — ₹199/mo</SelectItem>
                  <SelectItem value="premium">Premium — ₹399/mo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Duration (days)</label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Count</label>
              <Input
                type="number"
                min={1}
                max={50}
                value={count}
                onChange={(e) => setCount(e.target.value)}
                className="bg-background border-border"
              />
            </div>
          </div>
          <Button onClick={generateKeys} disabled={generating} className="gradient-btn-primary rounded-lg gap-2">
            <Key className="h-4 w-4" /> {generating ? "Generating..." : "Generate Keys"}
          </Button>
        </CardContent>
      </Card>

      {/* Unused Keys */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Unused Keys ({unusedKeys.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {unusedKeys.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground text-sm">No unused keys</p>
          ) : (
            <div className="divide-y divide-border">
              {unusedKeys.map((lic) => (
                <div key={lic.id} className="flex items-center justify-between px-5 py-3 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <code className="font-mono text-sm font-semibold text-foreground">{lic.key_code}</code>
                    <Badge variant="outline" className="text-primary border-primary/30 capitalize text-xs">{lic.tier}</Badge>
                    <span className="text-xs text-muted-foreground">{lic.duration_days}d</span>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => copyKey(lic.key_code)} className="text-muted-foreground hover:text-foreground">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Used Keys */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Used Keys ({usedKeys.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {usedKeys.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground text-sm">No used keys yet</p>
          ) : (
            <div className="divide-y divide-border">
              {usedKeys.map((lic) => {
                const hotel = hotels.find((h) => h.id === lic.used_by_hotel_id);
                return (
                  <div key={lic.id} className="flex items-center justify-between px-5 py-3 hover:bg-secondary/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <code className="font-mono text-sm text-muted-foreground line-through">{lic.key_code}</code>
                      <span className="text-xs text-muted-foreground">{lic.tier}</span>
                      {hotel && <span className="text-xs text-muted-foreground">• {hotel.name}</span>}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {lic.used_at ? new Date(lic.used_at).toLocaleDateString() : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CreatorAdmin;
