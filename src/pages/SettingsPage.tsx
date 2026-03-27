import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Settings, Copy, Key, Shield, FileText, ExternalLink } from "lucide-react";
import InstallAppPrompt from "@/components/InstallAppPrompt";
import { useNavigate } from "react-router-dom";

const SettingsPage = () => {
  const { user, hotelId } = useAuth();
  const navigate = useNavigate();
  const [hotel, setHotel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [licenseKey, setLicenseKey] = useState("");
  const [activating, setActivating] = useState(false);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [taxPercent, setTaxPercent] = useState("5");
  const [gstEnabled, setGstEnabled] = useState(false);
  const [easyVoid, setEasyVoid] = useState(false);
  const [counterBilling, setCounterBilling] = useState(false);
  const [autoCleanup, setAutoCleanup] = useState(true);

  useEffect(() => {
    if (!hotelId) return;
    (async () => {
      const { data } = await supabase.from("hotels").select("*").eq("id", hotelId).single();
      if (data) {
        setHotel(data);
        setName(data.name);
        setAddress(data.address || "");
        setPhone(data.phone || "");
        setTaxPercent(String(data.tax_percent));
        setGstEnabled(data.gst_enabled);
        setEasyVoid(data.easy_void_enabled);
        setCounterBilling(data.counter_billing_enabled);
        setAutoCleanup(data.auto_cleanup_after_bill);
      }
      setLoading(false);
    })();
  }, [hotelId]);

  const saveSettings = async () => {
    if (!hotelId) return;
    setSaving(true);
    const { error } = await supabase.from("hotels").update({
      name, address, phone,
      tax_percent: parseFloat(taxPercent) || 5,
      gst_enabled: gstEnabled,
      easy_void_enabled: easyVoid,
      counter_billing_enabled: counterBilling,
      auto_cleanup_after_bill: autoCleanup,
    }).eq("id", hotelId);
    if (error) toast.error("Save failed: " + error.message);
    else toast.success("Settings saved!");
    setSaving(false);
  };

  const activateLicense = async () => {
    if (!licenseKey.trim() || !hotelId) return;
    setActivating(true);
    const { data: lic, error } = await supabase
      .from("licenses")
      .select("*")
      .eq("key_code", licenseKey.trim().toUpperCase())
      .eq("is_used", false)
      .maybeSingle();

    if (error || !lic) {
      toast.error("Invalid or already used license key");
      setActivating(false);
      return;
    }

    const now = new Date();
    const expiry = new Date(now.getTime() + lic.duration_days * 86400000);

    const [licUpdate, hotelUpdate, profileUpdate] = await Promise.all([
      supabase.from("licenses").update({
        is_used: true, used_at: now.toISOString(), used_by_hotel_id: hotelId,
      }).eq("id", lic.id),
      supabase.from("hotels").update({
        subscription_tier: lic.tier === "premium" ? "premium" : "basic",
        subscription_start_date: now.toISOString(),
        subscription_expiry: expiry.toISOString(),
      }).eq("id", hotelId),
      supabase.from("profiles").update({
        subscription_status: "active",
        subscription_plan: lic.tier,
        subscription_expires_at: expiry.toISOString(),
      }).eq("user_id", user?.id),
    ]);

    if (licUpdate.error || hotelUpdate.error || profileUpdate.error) {
      toast.error("Activation failed");
    } else {
      toast.success(`License activated! ${lic.tier} plan for ${lic.duration_days} days`);
      setLicenseKey("");
    }
    setActivating(false);
  };

  const copyCode = () => {
    if (hotel?.hotel_code) {
      navigator.clipboard.writeText(hotel.hotel_code);
      toast.success("Hotel code copied!");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Settings className="h-6 w-6" /> Settings
      </h1>

      {/* Hotel Info */}
      <Card>
        <CardHeader><CardTitle className="text-base">Hotel Information</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Hotel Code:</span>
            <Badge variant="outline" className="font-mono">{hotel?.hotel_code}</Badge>
            <Button size="icon" variant="ghost" onClick={copyCode}><Copy className="h-3.5 w-3.5" /></Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Hotel Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Phone</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs text-muted-foreground">Address</label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing & Tax */}
      <Card>
        <CardHeader><CardTitle className="text-base">Billing & Tax</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1 max-w-[200px]">
            <label className="text-xs text-muted-foreground">Tax %</label>
            <Input type="number" value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Enable GST</span>
            <Switch checked={gstEnabled} onCheckedChange={setGstEnabled} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Easy Void (staff can void items)</span>
            <Switch checked={easyVoid} onCheckedChange={setEasyVoid} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Counter Billing</span>
            <Switch checked={counterBilling} onCheckedChange={setCounterBilling} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Auto-cleanup after bill</span>
            <Switch checked={autoCleanup} onCheckedChange={setAutoCleanup} />
          </div>
        </CardContent>
      </Card>

      <Button onClick={saveSettings} disabled={saving} className="w-full">
        {saving ? "Saving..." : "Save Settings"}
      </Button>

      {/* License Activation */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Key className="h-4 w-4" /> Activate License</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="SB-XXXX-XXXX-XXXX-XXXX"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              className="font-mono"
            />
            <Button onClick={activateLicense} disabled={activating || !licenseKey.trim()}>
              {activating ? "Activating..." : "Activate"}
            </Button>
          </div>
          {hotel?.subscription_expiry && (
            <div className="mt-3 flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                Plan: <strong className="capitalize">{hotel.subscription_tier}</strong> · Expires: {new Date(hotel.subscription_expiry).toLocaleDateString()}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Install App */}
      <InstallAppPrompt />

      {/* Legal & Compliance */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Legal & Compliance</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground mb-3">Required for Play Store / App Store compliance.</p>
          <Button variant="outline" className="w-full justify-between" onClick={() => navigate("/privacy")}>
            Privacy Policy <ExternalLink className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" className="w-full justify-between" onClick={() => navigate("/terms")}>
            Terms & Conditions <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </CardContent>
      </Card>

      <p className="text-center text-[10px] text-muted-foreground pb-4">
        Speedo Bill v8.0 · © {new Date().getFullYear()} Mangal Multiproduct
      </p>
    </div>
  );
};

export default SettingsPage;
