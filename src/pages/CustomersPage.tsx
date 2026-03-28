import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Users, Search, Plus, Star, Crown, Award, Gift, TrendingUp, Download, Phone, Mail, Heart, Tag, ChevronRight } from "lucide-react";
import { format, parseISO, differenceInDays, isThisMonth } from "date-fns";

const TIER_CONFIG: Record<string, { label: string; color: string; icon: typeof Award; minSpend: number }> = {
  bronze: { label: "Bronze", color: "bg-orange-500/20 text-orange-600", icon: Award, minSpend: 0 },
  silver: { label: "Silver", color: "bg-slate-400/20 text-slate-600", icon: Award, minSpend: 2000 },
  gold: { label: "Gold", color: "bg-yellow-500/20 text-yellow-600", icon: Crown, minSpend: 5000 },
  platinum: { label: "Platinum", color: "bg-purple-500/20 text-purple-600", icon: Crown, minSpend: 15000 },
};

const getTier = (spend: number) => {
  if (spend >= 15000) return "platinum";
  if (spend >= 5000) return "gold";
  if (spend >= 2000) return "silver";
  return "bronze";
};

const CustomersPage = () => {
  const { hotelId } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [customerFeedback, setCustomerFeedback] = useState<any[]>([]);
  const [addDialog, setAddDialog] = useState(false);
  const [feedbackDialog, setFeedbackDialog] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", phone: "", email: "", birthday: "", dietary_preferences: "", notes: "" });
  const [feedbackForm, setFeedbackForm] = useState({ rating: "5", comment: "" });
  const [loyaltyConfig, setLoyaltyConfig] = useState<any>(null);

  useEffect(() => {
    if (!hotelId) return;
    loadData();
  }, [hotelId]);

  const loadData = async () => {
    if (!hotelId) return;
    const [custRes, fbRes] = await Promise.all([
      supabase.from("customers").select("*").eq("hotel_id", hotelId).order("created_at", { ascending: false }),
      supabase.from("customer_feedback" as any).select("*").eq("hotel_id", hotelId).order("created_at", { ascending: false }),
    ]);
    setCustomers(custRes.data || []);
    setFeedback((fbRes.data as any[]) || []);
    setLoading(false);
  };

  const selectCustomer = async (customer: any) => {
    setSelectedCustomer(customer);
    const [ordersRes, fbRes] = await Promise.all([
      supabase.from("orders").select("*, order_items(*)").eq("hotel_id", hotelId!).eq("customer_id", customer.id).order("created_at", { ascending: false }).limit(50),
      supabase.from("customer_feedback" as any).select("*").eq("customer_id", customer.id).order("created_at", { ascending: false }),
    ]);
    setCustomerOrders(ordersRes.data || []);
    setCustomerFeedback((fbRes.data as any[]) || []);
  };

  const addCustomer = async () => {
    if (!hotelId || !addForm.name || !addForm.phone) { toast.error("Name and phone required"); return; }
    const { error } = await supabase.from("customers").insert({
      hotel_id: hotelId,
      name: addForm.name,
      phone: addForm.phone,
      email: addForm.email || "",
      birthday: addForm.birthday || null,
      dietary_preferences: addForm.dietary_preferences || "",
      notes: addForm.notes || "",
    });
    if (error) toast.error("Failed to add customer");
    else { toast.success("Customer added!"); setAddDialog(false); setAddForm({ name: "", phone: "", email: "", birthday: "", dietary_preferences: "", notes: "" }); loadData(); }
  };

  const addFeedback = async () => {
    if (!selectedCustomer || !hotelId) return;
    const { error } = await supabase.from("customer_feedback" as any).insert({
      hotel_id: hotelId,
      customer_id: selectedCustomer.id,
      rating: Number(feedbackForm.rating),
      comment: feedbackForm.comment,
    });
    if (error) toast.error("Failed to save feedback");
    else { toast.success("Feedback recorded!"); setFeedbackDialog(false); selectCustomer(selectedCustomer); loadData(); }
  };

  const toggleTag = async (customer: any, tag: string) => {
    const currentTags: string[] = customer.tags || [];
    const newTags = currentTags.includes(tag) ? currentTags.filter((t: string) => t !== tag) : [...currentTags, tag];
    const { error } = await supabase.from("customers").update({ tags: newTags } as any).eq("id", customer.id);
    if (error) toast.error("Failed to update tag");
    else {
      toast.success(`Tag ${currentTags.includes(tag) ? "removed" : "added"}`);
      loadData();
      if (selectedCustomer?.id === customer.id) setSelectedCustomer({ ...customer, tags: newTags });
    }
  };

  const deleteCustomer = async (id: string) => {
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) toast.error("Delete failed");
    else { toast.success("Customer deleted"); setSelectedCustomer(null); loadData(); }
  };

  const exportCSV = () => {
    const headers = "Name,Phone,Email,Loyalty Points,Tier,Total Spend,Total Visits,Birthday,Tags\n";
    const rows = customers.map(c =>
      `"${c.name}","${c.phone}","${c.email || ""}",${c.loyalty_points},"${c.loyalty_tier || getTier(Number(c.total_spend || 0))}",${c.total_spend || 0},${c.total_visits || 0},"${c.birthday || ""}","${(c.tags || []).join(";")}"`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `customers_${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
    toast.success("Customer data exported!");
  };

  const filtered = useMemo(() => {
    let list = customers;
    if (search) list = list.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search));
    if (filter === "vip") list = list.filter(c => (c.tags || []).includes("VIP"));
    if (filter === "blacklist") list = list.filter(c => (c.tags || []).includes("Blacklist"));
    if (filter === "birthday") list = list.filter(c => { try { return c.birthday && isThisMonth(parseISO(c.birthday)); } catch { return false; } });
    if (filter === "new") list = list.filter(c => differenceInDays(new Date(), parseISO(c.created_at)) <= 7);
    if (filter === "gold+") list = list.filter(c => ["gold", "platinum"].includes(c.loyalty_tier || getTier(Number(c.total_spend || 0))));
    return list;
  }, [customers, search, filter]);

  const avgRating = useMemo(() => {
    if (feedback.length === 0) return "0";
    return (feedback.reduce((sum: number, f: any) => sum + (f.rating || 0), 0) / feedback.length).toFixed(1);
  }, [feedback]);

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6 text-primary" /> Customers</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-3.5 w-3.5 mr-1" /> Export CSV</Button>
          <Button size="sm" onClick={() => setAddDialog(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Add Customer</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="glass-card"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">{customers.length}</p>
          <p className="text-xs text-muted-foreground">Total Customers</p>
        </CardContent></Card>
        <Card className="glass-card"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">{customers.filter(c => (c.tags || []).includes("VIP")).length}</p>
          <p className="text-xs text-muted-foreground">VIP Guests</p>
        </CardContent></Card>
        <Card className="glass-card"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">{customers.filter(c => { try { return c.birthday && isThisMonth(parseISO(c.birthday)); } catch { return false; } }).length}</p>
          <p className="text-xs text-muted-foreground">🎂 Birthdays This Month</p>
        </CardContent></Card>
        <Card className="glass-card"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">₹{customers.reduce((sum, c) => sum + Number(c.total_spend || 0), 0).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Total Lifetime Spend</p>
        </CardContent></Card>
        <Card className="glass-card"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">⭐ {avgRating}</p>
          <p className="text-xs text-muted-foreground">Avg Rating ({feedback.length})</p>
        </CardContent></Card>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or phone..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Customers</SelectItem>
            <SelectItem value="vip">⭐ VIP Only</SelectItem>
            <SelectItem value="gold+">🏆 Gold & Platinum</SelectItem>
            <SelectItem value="birthday">🎂 Birthday This Month</SelectItem>
            <SelectItem value="new">🆕 New (7 days)</SelectItem>
            <SelectItem value="blacklist">🚫 Blacklisted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Customer List */}
      <div className="space-y-2">
        {filtered.map(c => {
          const tier = c.loyalty_tier || getTier(Number(c.total_spend || 0));
          const tierConfig = TIER_CONFIG[tier] || TIER_CONFIG.bronze;
          const TierIcon = tierConfig.icon;
          return (
            <Card key={c.id} className="glass-card hover:border-primary/30 transition-colors cursor-pointer" onClick={() => selectCustomer(c)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm ${tierConfig.color}`}>
                      {(c.name || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold flex items-center gap-2">
                        {c.name}
                        {(c.tags || []).includes("VIP") && <Badge className="text-[10px] bg-yellow-500/20 text-yellow-600 border-yellow-500/30">⭐ VIP</Badge>}
                        {(c.tags || []).includes("Blacklist") && <Badge variant="destructive" className="text-[10px]">Blocked</Badge>}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>
                        {c.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
                        <Badge className={`text-[10px] ${tierConfig.color} border-0`}><TierIcon className="h-3 w-3 mr-0.5" />{tierConfig.label}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="font-semibold">{c.loyalty_points || 0} pts</p>
                      <p className="text-[10px] text-muted-foreground">{c.total_visits || 0} visits</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <Card className="glass-card"><CardContent className="p-8 text-center text-muted-foreground">
            {search ? "No customers match your search" : "No customers yet. Add your first customer!"}
          </CardContent></Card>
        )}
      </div>

      {/* Customer Detail Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={(o) => { if (!o) setSelectedCustomer(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedCustomer && (() => {
            const tier = selectedCustomer.loyalty_tier || getTier(Number(selectedCustomer.total_spend || 0));
            const tierConfig = TIER_CONFIG[tier] || TIER_CONFIG.bronze;
            const avgFb = customerFeedback.length > 0 ? (customerFeedback.reduce((s: number, f: any) => s + f.rating, 0) / customerFeedback.length).toFixed(1) : "N/A";
            const favItems: Record<string, number> = {};
            customerOrders.forEach((o: any) => (o.order_items || []).forEach((i: any) => { favItems[i.name] = (favItems[i.name] || 0) + i.quantity; }));
            const topItems = Object.entries(favItems).sort((a, b) => b[1] - a[1]).slice(0, 5);

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg ${tierConfig.color}`}>
                      {(selectedCustomer.name || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="flex items-center gap-2">{selectedCustomer.name}
                        <Badge className={`text-[10px] ${tierConfig.color} border-0`}>{tierConfig.label}</Badge>
                      </p>
                      <p className="text-sm text-muted-foreground font-normal">{selectedCustomer.phone} · Since {format(parseISO(selectedCustomer.created_at), "MMM yyyy")}</p>
                    </div>
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className="p-2 rounded-lg bg-muted/50 text-center">
                      <p className="text-lg font-bold">{selectedCustomer.loyalty_points || 0}</p>
                      <p className="text-[10px] text-muted-foreground">Points</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50 text-center">
                      <p className="text-lg font-bold">{selectedCustomer.total_visits || 0}</p>
                      <p className="text-[10px] text-muted-foreground">Visits</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50 text-center">
                      <p className="text-lg font-bold">₹{Number(selectedCustomer.total_spend || 0).toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">Spent</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50 text-center">
                      <p className="text-lg font-bold">⭐{avgFb}</p>
                      <p className="text-[10px] text-muted-foreground">Rating</p>
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-1"><Tag className="h-4 w-4" /> Tags</h3>
                    <div className="flex gap-2 flex-wrap">
                      {["VIP", "Regular", "Blacklist", "Vegetarian", "Non-Veg", "Allergies"].map(tag => (
                        <Badge
                          key={tag}
                          variant={(selectedCustomer.tags || []).includes(tag) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleTag(selectedCustomer, tag)}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {selectedCustomer.birthday && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                        <Gift className="h-4 w-4 text-pink-500" />
                        <span>🎂 {format(parseISO(selectedCustomer.birthday), "dd MMM")}</span>
                      </div>
                    )}
                    {selectedCustomer.dietary_preferences && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                        <Heart className="h-4 w-4 text-destructive" />
                        <span className="truncate">{selectedCustomer.dietary_preferences}</span>
                      </div>
                    )}
                  </div>

                  {/* Favorite Items */}
                  {topItems.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2">❤️ Favorite Items</h3>
                      <div className="flex gap-2 flex-wrap">
                        {topItems.map(([name, count]) => (
                          <Badge key={name} variant="outline">{name} ({count}x)</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setFeedbackDialog(true); setFeedbackForm({ rating: "5", comment: "" }); }}>
                      <Star className="h-3.5 w-3.5 mr-1" /> Add Feedback
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => { if (confirm("Delete this customer?")) deleteCustomer(selectedCustomer.id); }}>
                      Delete
                    </Button>
                  </div>

                  {/* Order History */}
                  {customerOrders.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2">📋 Order History ({customerOrders.length})</h3>
                      <div className="space-y-1 max-h-[200px] overflow-y-auto">
                        {customerOrders.map((o: any) => (
                          <div key={o.id} className="flex justify-between items-center p-2 rounded-lg bg-muted/30 text-sm">
                            <span>{format(parseISO(o.created_at), "dd MMM yyyy")}</span>
                            <span className="text-xs text-muted-foreground">{(o.order_items || []).length} items</span>
                            <span className="font-semibold">₹{Number(o.total).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Feedback History */}
                  {customerFeedback.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2">💬 Feedback</h3>
                      <div className="space-y-1">
                        {customerFeedback.slice(0, 5).map((f: any) => (
                          <div key={f.id} className="p-2 rounded-lg bg-muted/30 text-sm">
                            <div className="flex justify-between">
                              <span>{"⭐".repeat(f.rating)}</span>
                              <span className="text-xs text-muted-foreground">{format(parseISO(f.created_at), "dd MMM")}</span>
                            </div>
                            {f.comment && <p className="text-xs text-muted-foreground mt-1">{f.comment}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedCustomer.notes && (
                    <div className="p-3 rounded-lg bg-muted/30 text-sm">
                      <p className="font-medium text-xs text-muted-foreground mb-1">📝 Notes</p>
                      <p>{selectedCustomer.notes}</p>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Add Customer Dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Customer</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Customer Name *" value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} />
            <Input placeholder="Phone Number *" value={addForm.phone} onChange={e => setAddForm({ ...addForm, phone: e.target.value })} />
            <Input placeholder="Email (optional)" value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })} />
            <Input type="date" placeholder="Birthday" value={addForm.birthday} onChange={e => setAddForm({ ...addForm, birthday: e.target.value })} />
            <Input placeholder="Dietary Preferences" value={addForm.dietary_preferences} onChange={e => setAddForm({ ...addForm, dietary_preferences: e.target.value })} />
            <Textarea placeholder="Notes" value={addForm.notes} onChange={e => setAddForm({ ...addForm, notes: e.target.value })} />
            <Button className="w-full" onClick={addCustomer}>Add Customer</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={feedbackDialog} onOpenChange={setFeedbackDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Feedback for {selectedCustomer?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="text-sm mb-2">Rating</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(r => (
                  <button key={r} onClick={() => setFeedbackForm({ ...feedbackForm, rating: String(r) })}
                    className={`text-2xl transition-transform ${Number(feedbackForm.rating) >= r ? "scale-110" : "opacity-30"}`}>⭐</button>
                ))}
              </div>
            </div>
            <Textarea placeholder="Comment (optional)" value={feedbackForm.comment} onChange={e => setFeedbackForm({ ...feedbackForm, comment: e.target.value })} />
            <Button className="w-full" onClick={addFeedback}>Save Feedback</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomersPage;
