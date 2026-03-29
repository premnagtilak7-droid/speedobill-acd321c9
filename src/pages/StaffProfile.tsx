import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, User, Building2, Clock, ChefHat, UtensilsCrossed, Shield } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Sun, Moon } from "lucide-react";

const StaffProfile = () => {
  const { user, role, hotelId, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [hotelName, setHotelName] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ ordersToday: 0, totalOrders: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !hotelId) return;
    const load = async () => {
      setLoading(true);
      const [hotelRes, profileRes] = await Promise.all([
        supabase.from("hotels").select("name").eq("id", hotelId).maybeSingle(),
        supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      setHotelName(hotelRes.data?.name || "Unknown");
      setProfile(profileRes.data);

      // Stats
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

      if (role === "waiter") {
        const [todayRes, totalRes] = await Promise.all([
          supabase.from("orders").select("id", { count: "exact", head: true }).eq("hotel_id", hotelId).eq("waiter_id", user.id).gte("created_at", startOfDay),
          supabase.from("orders").select("id", { count: "exact", head: true }).eq("hotel_id", hotelId).eq("waiter_id", user.id),
        ]);
        setStats({ ordersToday: todayRes.count || 0, totalOrders: totalRes.count || 0 });
      } else if (role === "chef") {
        const [todayRes, totalRes] = await Promise.all([
          supabase.from("kot_tickets").select("id", { count: "exact", head: true }).eq("hotel_id", hotelId).eq("claimed_by", user.id).gte("created_at", startOfDay),
          supabase.from("kot_tickets").select("id", { count: "exact", head: true }).eq("hotel_id", hotelId).eq("claimed_by", user.id),
        ]);
        setStats({ ordersToday: todayRes.count || 0, totalOrders: totalRes.count || 0 });
      }
      setLoading(false);
    };
    void load();
  }, [user, hotelId, role]);

  const userName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Staff";
  const userInitials = userName.slice(0, 2).toUpperCase();
  const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : "Staff";
  const RoleIcon = role === "chef" ? ChefHat : role === "waiter" ? UtensilsCrossed : Shield;
  const joinDate = profile?.join_date ? new Date(profile.join_date).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }) : "N/A";

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-foreground">My Profile</h1>

      {/* Profile Card */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 bg-primary text-primary-foreground">
            <AvatarFallback className="bg-primary text-primary-foreground font-bold text-lg">{userInitials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-foreground truncate">{userName}</h2>
            <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge className="gap-1">
                <RoleIcon className="h-3 w-3" /> {roleLabel}
              </Badge>
              <Badge variant="outline" className="text-xs gap-1 bg-success/10 text-success border-success/30">
                <div className="w-1.5 h-1.5 rounded-full bg-success" /> Online
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Hotel Info */}
      <div className="glass-card p-4 flex items-center gap-3">
        <Building2 className="h-5 w-5 text-primary flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Currently working at</p>
          <p className="text-sm font-semibold text-foreground truncate">{hotelName}</p>
        </div>
      </div>

      {/* Details */}
      <div className="glass-card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Details</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Phone</p>
            <p className="text-sm text-foreground">{profile?.phone || "Not set"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Joined</p>
            <p className="text-sm text-foreground">{joinDate}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="text-sm text-foreground">{profile?.is_active ? "Active" : "Inactive"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Address</p>
            <p className="text-sm text-foreground truncate">{profile?.address || "Not set"}</p>
          </div>
        </div>
      </div>

      {/* Performance */}
      <div className="glass-card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" /> Daily Performance
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card p-3 text-center">
            <p className="text-2xl font-bold text-primary">{stats.ordersToday}</p>
            <p className="text-xs text-muted-foreground">{role === "chef" ? "Prepared Today" : "Orders Today"}</p>
          </div>
          <div className="glass-card p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.totalOrders}</p>
            <p className="text-xs text-muted-foreground">Total All Time</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button
          onClick={toggleTheme}
          className="w-full glass-card p-3 flex items-center gap-3 text-sm text-foreground hover:bg-secondary/60 transition-colors rounded-xl"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        </button>
        <Button variant="destructive" className="w-full gap-2" onClick={signOut}>
          <LogOut className="h-4 w-4" /> Sign Out
        </Button>
      </div>
    </div>
  );
};

export default StaffProfile;