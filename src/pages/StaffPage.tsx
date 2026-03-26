import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Users, Copy, UserCheck, Wallet, Clock, BarChart3, Calendar, ChevronRight, Phone, Mail, MapPin, Plus, Star, TrendingUp, Award } from "lucide-react";
import { format, differenceInMinutes, parseISO, startOfMonth, endOfMonth } from "date-fns";

const StaffPage = () => {
  const { hotelId, user } = useAuth();
  const [staff, setStaff] = useState<any[]>([]);
  const [hotel, setHotel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("team");
  const [attendance, setAttendance] = useState<any[]>([]);
  const [salaries, setSalaries] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [orderStats, setOrderStats] = useState<Record<string, { count: number; total: number }>>({});
  const [salaryDialog, setSalaryDialog] = useState(false);
  const [shiftDialog, setShiftDialog] = useState(false);
  const [leaveDialog, setLeaveDialog] = useState(false);
  const [salaryForm, setSalaryForm] = useState({ base_salary: "", advance_paid: "", bonus: "", deductions: "", notes: "", month: format(new Date(), "yyyy-MM") });
  const [shiftForm, setShiftForm] = useState({ shift_date: format(new Date(), "yyyy-MM-dd"), shift_type: "morning", start_time: "09:00", end_time: "17:00", notes: "" });
  const [leaveForm, setLeaveForm] = useState({ leave_date: format(new Date(), "yyyy-MM-dd"), leave_type: "casual", reason: "" });
  const [addStaffDialog, setAddStaffDialog] = useState(false);
  const [addStaffForm, setAddStaffForm] = useState({ email: "", password: "", full_name: "", role: "waiter", phone: "" });
  const [addingStaff, setAddingStaff] = useState(false);

  useEffect(() => {
    if (!hotelId) return;
    loadData();
  }, [hotelId]);

  const loadData = async () => {
    if (!hotelId) return;
    const [staffRes, hotelRes, attRes, salRes, shiftRes, leaveRes, orderRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("hotel_id", hotelId),
      supabase.from("hotels").select("hotel_code").eq("id", hotelId).single(),
      supabase.from("attendance_logs").select("*").eq("hotel_id", hotelId).order("created_at", { ascending: false }).limit(500),
      supabase.from("staff_salaries" as any).select("*").eq("hotel_id", hotelId).order("created_at", { ascending: false }),
      supabase.from("staff_shifts" as any).select("*").eq("hotel_id", hotelId).order("shift_date", { ascending: false }).limit(200),
      supabase.from("staff_leaves" as any).select("*").eq("hotel_id", hotelId).order("leave_date", { ascending: false }),
      supabase.from("orders").select("waiter_id, total, status").eq("hotel_id", hotelId).eq("status", "billed"),
    ]);
    setStaff(staffRes.data || []);
    setHotel(hotelRes.data);
    setAttendance(attRes.data || []);
    setSalaries(salRes.data || []);
    setShifts(shiftRes.data || []);
    setLeaves(leaveRes.data || []);

    const stats: Record<string, { count: number; total: number }> = {};
    (orderRes.data || []).forEach((o: any) => {
      if (!stats[o.waiter_id]) stats[o.waiter_id] = { count: 0, total: 0 };
      stats[o.waiter_id].count++;
      stats[o.waiter_id].total += Number(o.total) || 0;
    });
    setOrderStats(stats);
    setLoading(false);
  };

  const toggleActive = async (userId: string, current: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_active: !current }).eq("user_id", userId);
    if (error) toast.error("Update failed");
    else {
      toast.success(current ? "Staff deactivated" : "Staff activated");
      setStaff(prev => prev.map(s => s.user_id === userId ? { ...s, is_active: !current } : s));
    }
  };

  const copyCode = () => {
    if (hotel?.hotel_code) {
      navigator.clipboard.writeText(hotel.hotel_code);
      toast.success("Hotel code copied!");
    }
  };

  const addSalary = async () => {
    if (!selectedStaff || !hotelId) return;
    const { error } = await supabase.from("staff_salaries" as any).insert({
      hotel_id: hotelId,
      staff_user_id: selectedStaff.user_id,
      month: salaryForm.month,
      base_salary: Number(salaryForm.base_salary) || 0,
      advance_paid: Number(salaryForm.advance_paid) || 0,
      bonus: Number(salaryForm.bonus) || 0,
      deductions: Number(salaryForm.deductions) || 0,
      notes: salaryForm.notes,
    });
    if (error) toast.error("Failed to add salary");
    else { toast.success("Salary record added"); setSalaryDialog(false); loadData(); }
  };

  const addShift = async () => {
    if (!selectedStaff || !hotelId) return;
    const { error } = await supabase.from("staff_shifts" as any).insert({
      hotel_id: hotelId,
      staff_user_id: selectedStaff.user_id,
      shift_date: shiftForm.shift_date,
      shift_type: shiftForm.shift_type,
      start_time: shiftForm.start_time,
      end_time: shiftForm.end_time,
      notes: shiftForm.notes,
    });
    if (error) toast.error("Failed to add shift");
    else { toast.success("Shift assigned"); setShiftDialog(false); loadData(); }
  };

  const addLeave = async () => {
    if (!selectedStaff || !hotelId) return;
    const { error } = await supabase.from("staff_leaves" as any).insert({
      hotel_id: hotelId,
      staff_user_id: selectedStaff.user_id,
      leave_date: leaveForm.leave_date,
      leave_type: leaveForm.leave_type,
      reason: leaveForm.reason,
      status: "approved",
      approved_by: user?.id,
    });
    if (error) toast.error("Failed to add leave");
    else { toast.success("Leave recorded"); setLeaveDialog(false); loadData(); }
  };

  const addStaffMember = async () => {
    if (!addStaffForm.email || !addStaffForm.role) {
      toast.error("Email and role are required");
      return;
    }
    setAddingStaff(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("create-staff", {
        body: {
          email: addStaffForm.email.trim(),
          password: addStaffForm.password || undefined,
          full_name: addStaffForm.full_name.trim(),
          role: addStaffForm.role,
          phone: addStaffForm.phone.trim(),
        },
      });
      if (res.error || res.data?.error) {
        toast.error(res.data?.error || res.error?.message || "Failed to add staff");
      } else {
        toast.success(`${addStaffForm.full_name || addStaffForm.email} added as ${addStaffForm.role}!`);
        setAddStaffDialog(false);
        setAddStaffForm({ email: "", password: "", full_name: "", role: "waiter", phone: "" });
        loadData();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to add staff");
    } finally {
      setAddingStaff(false);
    }
  };

  const getStaffAttendance = (userId: string) => attendance.filter(a => a.user_id === userId);
  const getStaffSalaries = (userId: string) => salaries.filter(s => s.staff_user_id === userId);
  const getStaffShifts = (userId: string) => shifts.filter(s => s.staff_user_id === userId);
  const getStaffLeaves = (userId: string) => leaves.filter(l => l.staff_user_id === userId);

  const getPerformanceRating = (userId: string) => {
    const stats = orderStats[userId];
    if (!stats) return { label: "New", color: "secondary" as const, stars: 0 };
    if (stats.count >= 100) return { label: "⭐ Star", color: "default" as const, stars: 5 };
    if (stats.count >= 50) return { label: "Expert", color: "default" as const, stars: 4 };
    if (stats.count >= 20) return { label: "Good", color: "outline" as const, stars: 3 };
    return { label: "Learning", color: "secondary" as const, stars: 2 };
  };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>;
  }

  const staffOnly = staff.filter(s => s.role !== "owner");
  const owners = staff.filter(s => s.role === "owner");

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6 text-primary" /> Staff Management</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setAddStaffDialog(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Staff
          </Button>
          <span className="text-sm text-muted-foreground">Hotel Code:</span>
          <Badge variant="outline" className="font-mono text-sm">{hotel?.hotel_code}</Badge>
          <Button size="icon" variant="ghost" onClick={copyCode}><Copy className="h-3.5 w-3.5" /></Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="glass-card"><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><Users className="h-5 w-5 text-primary" /></div>
          <div><p className="text-2xl font-bold">{staff.length}</p><p className="text-xs text-muted-foreground">Total Staff</p></div>
        </CardContent></Card>
        <Card className="glass-card"><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center"><UserCheck className="h-5 w-5 text-emerald-500" /></div>
          <div><p className="text-2xl font-bold">{staff.filter(s => s.is_active).length}</p><p className="text-xs text-muted-foreground">Active</p></div>
        </CardContent></Card>
        <Card className="glass-card"><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center"><Clock className="h-5 w-5 text-blue-500" /></div>
          <div><p className="text-2xl font-bold">{attendance.filter(a => a.action === "clock_in" && format(parseISO(a.created_at), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")).length}</p><p className="text-xs text-muted-foreground">Clocked In Today</p></div>
        </CardContent></Card>
        <Card className="glass-card"><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center"><Wallet className="h-5 w-5 text-orange-500" /></div>
          <div><p className="text-2xl font-bold">₹{salaries.filter(s => s.month === format(new Date(), "yyyy-MM")).reduce((sum, s) => sum + Number(s.base_salary || 0), 0).toLocaleString()}</p><p className="text-xs text-muted-foreground">This Month Salary</p></div>
        </CardContent></Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="salary">Salary</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-4">
          <p className="text-sm text-muted-foreground">Share hotel code with staff. They sign up as Waiter/Chef and enter this code to join.</p>
          
          {/* Owner */}
          {owners.map(s => (
            <Card key={s.id} className="glass-card border-primary/20">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                    {(s.full_name || "O")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold">{s.full_name || "Owner"}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="default" className="text-[10px]">Owner</Badge>
                      <span>Joined {format(parseISO(s.created_at), "MMM yyyy")}</span>
                    </div>
                  </div>
                </div>
                <Badge variant="default">Active</Badge>
              </CardContent>
            </Card>
          ))}

          {/* Staff Members */}
          <div className="space-y-3">
            {staffOnly.map(s => {
              const perf = getPerformanceRating(s.user_id);
              const stats = orderStats[s.user_id];
              return (
                <Card key={s.id} className="glass-card hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setSelectedStaff(s)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm ${s.is_active ? "bg-emerald-500/20 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                          {(s.full_name || "S")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold flex items-center gap-2">
                            {s.full_name || "Unnamed"}
                            <Badge variant={perf.color} className="text-[10px]">{perf.label}</Badge>
                          </p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            <Badge variant="outline" className="capitalize text-[10px]">{s.role}</Badge>
                            {stats && <span>{stats.count} orders · ₹{stats.total.toLocaleString()}</span>}
                            <span>Joined {format(parseISO(s.created_at), "dd MMM yyyy")}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch checked={s.is_active} onCheckedChange={() => toggleActive(s.user_id, s.is_active)} onClick={(e) => e.stopPropagation()} />
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {staffOnly.length === 0 && (
              <Card className="glass-card"><CardContent className="p-8 text-center text-muted-foreground">
                No staff members yet. Share your hotel code to invite them.
              </CardContent></Card>
            )}
          </div>
        </TabsContent>

        {/* Salary Tab */}
        <TabsContent value="salary" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Salary Records</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Staff</th>
                  <th className="text-left p-3 font-medium">Month</th>
                  <th className="text-right p-3 font-medium">Base</th>
                  <th className="text-right p-3 font-medium">Advance</th>
                  <th className="text-right p-3 font-medium">Bonus</th>
                  <th className="text-right p-3 font-medium">Net</th>
                  <th className="text-center p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {salaries.map(s => {
                  const staffMember = staff.find(st => st.user_id === s.staff_user_id);
                  const net = Number(s.base_salary) - Number(s.advance_paid) - Number(s.deductions) + Number(s.bonus);
                  return (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3 font-medium">{staffMember?.full_name || "Unknown"}</td>
                      <td className="p-3">{s.month}</td>
                      <td className="p-3 text-right">₹{Number(s.base_salary).toLocaleString()}</td>
                      <td className="p-3 text-right text-orange-500">₹{Number(s.advance_paid).toLocaleString()}</td>
                      <td className="p-3 text-right text-emerald-500">₹{Number(s.bonus).toLocaleString()}</td>
                      <td className="p-3 text-right font-semibold">₹{net.toLocaleString()}</td>
                      <td className="p-3 text-center">
                        <Badge variant={s.status === "paid" ? "default" : "secondary"}>{s.status}</Badge>
                      </td>
                    </tr>
                  );
                })}
                {salaries.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No salary records yet. Select a staff member to add.</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-4">
          <h2 className="text-lg font-semibold">Recent Attendance</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium">Staff</th>
                  <th className="text-left p-3 font-medium">Action</th>
                  <th className="text-left p-3 font-medium">Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {attendance.slice(0, 50).map(a => (
                  <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3 font-medium">{a.full_name || "Unknown"}</td>
                    <td className="p-3">
                      <Badge variant={a.action === "clock_in" ? "default" : "secondary"}>
                        {a.action === "clock_in" ? "🟢 Clock In" : "🔴 Clock Out"}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground">{format(parseISO(a.created_at), "dd MMM yyyy, hh:mm a")}</td>
                  </tr>
                ))}
                {attendance.length === 0 && <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">No attendance records yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <h2 className="text-lg font-semibold">Staff Performance Overview</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {staffOnly.map(s => {
              const stats = orderStats[s.user_id] || { count: 0, total: 0 };
              const perf = getPerformanceRating(s.user_id);
              const staffLeaves = getStaffLeaves(s.user_id);
              const avgOrderValue = stats.count > 0 ? Math.round(stats.total / stats.count) : 0;
              return (
                <Card key={s.id} className="glass-card">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                          {(s.full_name || "S")[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold">{s.full_name || "Unnamed"}</p>
                          <Badge variant="outline" className="capitalize text-[10px]">{s.role}</Badge>
                        </div>
                      </div>
                      <Badge variant={perf.color}>{perf.label}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-lg bg-muted/50">
                        <p className="text-lg font-bold">{stats.count}</p>
                        <p className="text-[10px] text-muted-foreground">Orders</p>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/50">
                        <p className="text-lg font-bold">₹{stats.total.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">Revenue</p>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/50">
                        <p className="text-lg font-bold">₹{avgOrderValue}</p>
                        <p className="text-[10px] text-muted-foreground">Avg Order</p>
                      </div>
                    </div>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>📅 {staffLeaves.length} leaves taken</span>
                      <span>·</span>
                      <span>{"⭐".repeat(perf.stars)} ({perf.stars}/5)</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {staffOnly.length === 0 && <p className="text-muted-foreground col-span-2 text-center py-8">No staff to show performance for.</p>}
          </div>
        </TabsContent>
      </Tabs>

      {/* Staff Detail Dialog */}
      <Dialog open={!!selectedStaff} onOpenChange={(o) => !o && setSelectedStaff(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedStaff && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-lg">
                    {(selectedStaff.full_name || "S")[0].toUpperCase()}
                  </div>
                  <div>
                    <p>{selectedStaff.full_name || "Unnamed"}</p>
                    <p className="text-sm text-muted-foreground capitalize font-normal">{selectedStaff.role} · Joined {format(parseISO(selectedStaff.created_at), "dd MMM yyyy")}</p>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-xl font-bold">{orderStats[selectedStaff.user_id]?.count || 0}</p>
                    <p className="text-[10px] text-muted-foreground">Orders</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-xl font-bold">₹{(orderStats[selectedStaff.user_id]?.total || 0).toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">Revenue</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-xl font-bold">{getStaffLeaves(selectedStaff.user_id).length}</p>
                    <p className="text-[10px] text-muted-foreground">Leaves</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => { setSalaryDialog(true); setSalaryForm({ base_salary: "", advance_paid: "", bonus: "", deductions: "", notes: "", month: format(new Date(), "yyyy-MM") }); }}>
                    <Wallet className="h-3.5 w-3.5 mr-1" /> Add Salary
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setShiftDialog(true); setShiftForm({ shift_date: format(new Date(), "yyyy-MM-dd"), shift_type: "morning", start_time: "09:00", end_time: "17:00", notes: "" }); }}>
                    <Clock className="h-3.5 w-3.5 mr-1" /> Assign Shift
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setLeaveDialog(true); setLeaveForm({ leave_date: format(new Date(), "yyyy-MM-dd"), leave_type: "casual", reason: "" }); }}>
                    <Calendar className="h-3.5 w-3.5 mr-1" /> Add Leave
                  </Button>
                </div>

                {/* Salary History */}
                {getStaffSalaries(selectedStaff.user_id).length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-1"><Wallet className="h-4 w-4" /> Salary History</h3>
                    <div className="space-y-2">
                      {getStaffSalaries(selectedStaff.user_id).slice(0, 5).map(s => {
                        const net = Number(s.base_salary) - Number(s.advance_paid) - Number(s.deductions) + Number(s.bonus);
                        return (
                          <div key={s.id} className="flex justify-between items-center p-2 rounded-lg bg-muted/30 text-sm">
                            <span>{s.month}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">₹{net.toLocaleString()}</span>
                              <Badge variant={s.status === "paid" ? "default" : "secondary"} className="text-[10px]">{s.status}</Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Shifts */}
                {getStaffShifts(selectedStaff.user_id).length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-1"><Clock className="h-4 w-4" /> Recent Shifts</h3>
                    <div className="space-y-1">
                      {getStaffShifts(selectedStaff.user_id).slice(0, 5).map(s => (
                        <div key={s.id} className="flex justify-between items-center p-2 rounded-lg bg-muted/30 text-sm">
                          <span>{format(parseISO(s.shift_date), "dd MMM")}</span>
                          <Badge variant="outline" className="capitalize">{s.shift_type}</Badge>
                          <span className="text-muted-foreground">{s.start_time} - {s.end_time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Leaves */}
                {getStaffLeaves(selectedStaff.user_id).length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-1"><Calendar className="h-4 w-4" /> Leave History</h3>
                    <div className="space-y-1">
                      {getStaffLeaves(selectedStaff.user_id).slice(0, 5).map(l => (
                        <div key={l.id} className="flex justify-between items-center p-2 rounded-lg bg-muted/30 text-sm">
                          <span>{format(parseISO(l.leave_date), "dd MMM yyyy")}</span>
                          <Badge variant="outline" className="capitalize">{l.leave_type}</Badge>
                          <span className="text-xs text-muted-foreground truncate max-w-[120px]">{l.reason || "-"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Salary Dialog */}
      <Dialog open={salaryDialog} onOpenChange={setSalaryDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Salary for {selectedStaff?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Month (YYYY-MM)" value={salaryForm.month} onChange={e => setSalaryForm({ ...salaryForm, month: e.target.value })} />
            <Input type="number" placeholder="Base Salary" value={salaryForm.base_salary} onChange={e => setSalaryForm({ ...salaryForm, base_salary: e.target.value })} />
            <Input type="number" placeholder="Advance Paid" value={salaryForm.advance_paid} onChange={e => setSalaryForm({ ...salaryForm, advance_paid: e.target.value })} />
            <Input type="number" placeholder="Bonus" value={salaryForm.bonus} onChange={e => setSalaryForm({ ...salaryForm, bonus: e.target.value })} />
            <Input type="number" placeholder="Deductions" value={salaryForm.deductions} onChange={e => setSalaryForm({ ...salaryForm, deductions: e.target.value })} />
            <Input placeholder="Notes" value={salaryForm.notes} onChange={e => setSalaryForm({ ...salaryForm, notes: e.target.value })} />
            <Button className="w-full" onClick={addSalary}>Save Salary Record</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shift Dialog */}
      <Dialog open={shiftDialog} onOpenChange={setShiftDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Shift for {selectedStaff?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input type="date" value={shiftForm.shift_date} onChange={e => setShiftForm({ ...shiftForm, shift_date: e.target.value })} />
            <Select value={shiftForm.shift_type} onValueChange={v => setShiftForm({ ...shiftForm, shift_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">Morning</SelectItem>
                <SelectItem value="afternoon">Afternoon</SelectItem>
                <SelectItem value="evening">Evening</SelectItem>
                <SelectItem value="night">Night</SelectItem>
                <SelectItem value="full-day">Full Day</SelectItem>
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Input type="time" value={shiftForm.start_time} onChange={e => setShiftForm({ ...shiftForm, start_time: e.target.value })} />
              <Input type="time" value={shiftForm.end_time} onChange={e => setShiftForm({ ...shiftForm, end_time: e.target.value })} />
            </div>
            <Input placeholder="Notes" value={shiftForm.notes} onChange={e => setShiftForm({ ...shiftForm, notes: e.target.value })} />
            <Button className="w-full" onClick={addShift}>Assign Shift</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Leave Dialog */}
      <Dialog open={leaveDialog} onOpenChange={setLeaveDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Leave for {selectedStaff?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input type="date" value={leaveForm.leave_date} onChange={e => setLeaveForm({ ...leaveForm, leave_date: e.target.value })} />
            <Select value={leaveForm.leave_type} onValueChange={v => setLeaveForm({ ...leaveForm, leave_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="casual">Casual Leave</SelectItem>
                <SelectItem value="sick">Sick Leave</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
                <SelectItem value="unpaid">Unpaid Leave</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Reason" value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} />
            <Button className="w-full" onClick={addLeave}>Record Leave</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffPage;
