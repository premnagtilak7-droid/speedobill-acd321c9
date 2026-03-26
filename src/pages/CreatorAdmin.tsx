import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Key, Trash2, Copy, Plus, RefreshCw, Users, Hotel } from "lucide-react";

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
  return `SB-${segments.join("-")}`;
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
  const [profiles, setProfiles] = useState<{ user_id: string; full_name: string; role: string; hotel_id: string | null }[]>([]);

  const isCreator = user?.email === "speedobill7@gmail.com";

  const fetchData = async () => {
    setLoading(true);
    const [licRes, hotelRes, profRes] = await Promise.all([
      supabase.from("licenses").select("*").order("created_at", { ascending: false }),
      supabase.from("hotels").select("id, name, owner_id"),
      supabase.from("profiles").select("user_id, full_name, role, hotel_id"),
    ]);
    if (licRes.data) setLicenses(licRes.data);
    if (hotelRes.data) setHotels(hotelRes.data as any);
    if (profRes.data) setProfiles(profRes.data as any);
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
    if (error) {
      toast.error("Failed to generate keys: " + error.message);
    } else {
      toast.success(`${numKeys} license key(s) generated!`);
      fetchData();
    }
    setGenerating(false);
  };

  const deleteKey = async (id: string) => {
    const { error } = await supabase.from("licenses").delete().eq("id", id);
    if (error) toast.error("Delete failed");
    else {
      toast.success("Key deleted");
      setLicenses((prev) => prev.filter((l) => l.id !== id));
    }
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

  const usedCount = licenses.filter((l) => l.is_used).length;
  const unusedCount = licenses.filter((l) => !l.is_used).length;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Creator Admin</h1>
          <p className="text-sm text-muted-foreground">Manage licenses, hotels & users</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">{licenses.length}</p>
          <p className="text-xs text-muted-foreground">Total Keys</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{unusedCount}</p>
          <p className="text-xs text-muted-foreground">Available</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-muted-foreground">{usedCount}</p>
          <p className="text-xs text-muted-foreground">Used</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">{hotels.length}</p>
          <p className="text-xs text-muted-foreground">Hotels</p>
        </CardContent></Card>
      </div>

      {/* Generate Keys */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Key className="h-4 w-4" /> Generate License Keys</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Tier</label>
              <Select value={tier} onValueChange={setTier}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Duration (days)</label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 Days</SelectItem>
                  <SelectItem value="90">90 Days</SelectItem>
                  <SelectItem value="180">180 Days</SelectItem>
                  <SelectItem value="365">365 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Count</label>
              <Input type="number" min={1} max={50} value={count} onChange={(e) => setCount(e.target.value)} className="w-20" />
            </div>
            <Button onClick={generateKeys} disabled={generating}>
              <Plus className="h-4 w-4 mr-1" /> {generating ? "Generating..." : "Generate"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* License Keys Table */}
      <Card>
        <CardHeader><CardTitle className="text-base">License Keys ({licenses.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Key Code</th>
                  <th className="text-left p-3 font-medium">Tier</th>
                  <th className="text-left p-3 font-medium">Duration</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Used By</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {licenses.map((lic) => {
                  const hotel = hotels.find((h) => h.id === lic.used_by_hotel_id);
                  return (
                    <tr key={lic.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3 font-mono text-xs">{lic.key_code}</td>
                      <td className="p-3"><Badge variant="outline" className="capitalize">{lic.tier}</Badge></td>
                      <td className="p-3">{lic.duration_days}d</td>
                      <td className="p-3">
                        <Badge variant={lic.is_used ? "secondary" : "default"}>
                          {lic.is_used ? "Used" : "Available"}
                        </Badge>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">{hotel?.name || "—"}</td>
                      <td className="p-3 text-right space-x-1">
                        <Button size="icon" variant="ghost" onClick={() => copyKey(lic.key_code)}><Copy className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteKey(lic.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </td>
                    </tr>
                  );
                })}
                {licenses.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No license keys yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Hotels Overview */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Hotel className="h-4 w-4" /> Registered Hotels ({hotels.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Hotel Name</th>
                  <th className="text-left p-3 font-medium">Hotel ID</th>
                </tr>
              </thead>
              <tbody>
                {hotels.map((h) => (
                  <tr key={h.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3 font-medium">{h.name}</td>
                    <td className="p-3 text-xs text-muted-foreground font-mono">{h.id.slice(0, 8)}…</td>
                  </tr>
                ))}
                {hotels.length === 0 && (
                  <tr><td colSpan={2} className="p-6 text-center text-muted-foreground">No hotels registered</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreatorAdmin;
