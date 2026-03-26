import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import {
  LayoutDashboard, UtensilsCrossed, Grid3X3, ChefHat, BarChart3,
  Settings, LogOut, ScrollText, Menu, X, Wallet, Users, Package,
  CalendarCheck, Store, Zap, CreditCard, ShieldCheck, Sun, Moon,
  Bell, FileText, TrendingUp, QrCode, Layers, Link2, UserCheck,
  HelpCircle, ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/NotificationBell";
import { useRoleNotifications } from "@/hooks/useRoleNotifications";
import { useIncomingOrders } from "@/hooks/useIncomingOrders";

interface NavItem {
  label: string;
  icon: any;
  path: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const ownerSections: NavSection[] = [
  {
    title: "MAIN",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
      { label: "Tables", icon: Grid3X3, path: "/tables" },
      { label: "Incoming", icon: Bell, path: "/incoming-orders" },
      { label: "Kitchen", icon: ChefHat, path: "/kitchen" },
      { label: "Menu", icon: UtensilsCrossed, path: "/menu" },
    ],
  },
  {
    title: "BILLING",
    items: [
      { label: "Pricing", icon: CreditCard, path: "/pricing" },
      { label: "Billing History", icon: FileText, path: "/billing-history" },
      { label: "Expenses", icon: Wallet, path: "/expenses" },
    ],
  },
  {
    title: "FINANCE",
    items: [
      { label: "Order History", icon: ScrollText, path: "/order-history" },
    ],
  },
  {
    title: "MANAGE",
    items: [
      { label: "Team", icon: Users, path: "/customers" },
      { label: "Staff", icon: UserCheck, path: "/staff" },
      { label: "Voids", icon: FileText, path: "/void-reports" },
      { label: "Close Day", icon: CalendarCheck, path: "/daily-closing" },
    ],
  },
  {
    title: "INSIGHTS",
    items: [
      { label: "Analytics", icon: BarChart3, path: "/analytics" },
      { label: "Audit Log", icon: ScrollText, path: "/audit-log" },
    ],
  },
  {
    title: "CONFIG",
    items: [
      { label: "Table QR", icon: QrCode, path: "/table-qr" },
      { label: "Floor Plan", icon: Layers, path: "/layout-designer" },
      { label: "Inventory Control", icon: Package, path: "/inventory-hub" },
      { label: "Integrations", icon: Link2, path: "/integrations" },
      { label: "Customers", icon: Users, path: "/customers" },
      { label: "Settings", icon: Settings, path: "/settings" },
    ],
  },
];

const waiterSections: NavSection[] = [
  {
    title: "MAIN",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
      { label: "Tables", icon: Grid3X3, path: "/tables" },
      { label: "Menu", icon: UtensilsCrossed, path: "/menu" },
      { label: "Orders", icon: ScrollText, path: "/order-history" },
      { label: "Counter", icon: Store, path: "/counter" },
    ],
  },
];

const chefSections: NavSection[] = [
  {
    title: "MAIN",
    items: [{ label: "Kitchen", icon: ChefHat, path: "/kitchen" }],
  },
];

// Bottom nav items per role
const ownerBottomNav: NavItem[] = [
  { label: "Home", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Tables", icon: Grid3X3, path: "/tables" },
  { label: "Menu", icon: UtensilsCrossed, path: "/menu" },
  { label: "Orders", icon: ScrollText, path: "/order-history" },
  { label: "More", icon: Menu, path: "__more__" },
];

const waiterBottomNav: NavItem[] = [
  { label: "Home", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Tables", icon: Grid3X3, path: "/tables" },
  { label: "Menu", icon: UtensilsCrossed, path: "/menu" },
  { label: "Counter", icon: Store, path: "/counter" },
  { label: "More", icon: Menu, path: "__more__" },
];

const chefBottomNav: NavItem[] = [
  { label: "Kitchen", icon: ChefHat, path: "/kitchen" },
];

const AppLayout = () => {
  const { signOut, role, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useRoleNotifications();
  useIncomingOrders();

  const navSections = role === "chef" ? chefSections : role === "waiter" ? waiterSections : ownerSections;

  const bottomNavItems = role === "chef" ? chefBottomNav : role === "waiter" ? waiterBottomNav : ownerBottomNav;

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const userInitials = userName.slice(0, 2).toUpperCase();

  const NavButton = ({ item, onClick }: { item: NavItem; onClick?: () => void }) => {
    const active = location.pathname === item.path;
    return (
      <button
        onClick={() => { navigate(item.path); onClick?.(); }}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 min-h-[44px] active:scale-[0.97] ${
          active
            ? "bg-primary/10 text-primary font-semibold"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
        }`}
      >
        <item.icon className={`h-[18px] w-[18px] flex-shrink-0 ${active ? "text-primary" : ""}`} />
        {!collapsed && <span className="truncate">{item.label}</span>}
        {active && !collapsed && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
      </button>
    );
  };

  const SidebarContent = ({ onItemClick }: { onItemClick?: () => void }) => (
    <>
      <div className="flex items-center gap-3 px-3 py-4 mb-2">
        <Avatar className="h-10 w-10 bg-primary text-primary-foreground">
          <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs">
            {userInitials}
          </AvatarFallback>
        </Avatar>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{userName}</p>
            <p className="text-xs text-muted-foreground capitalize">{role || "Owner"}</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-2">
        {navSections.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <p className="px-3 mb-1 text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavButton key={item.path + item.label} item={item} onClick={onItemClick} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border pt-3 mt-3 px-2 space-y-1 pb-2">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors min-h-[44px] active:scale-[0.97]"
        >
          {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          {!collapsed && <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
        </button>
        <button
          onClick={() => { navigate("/support"); onItemClick?.(); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors min-h-[44px] active:scale-[0.97]"
        >
          <HelpCircle className="h-[18px] w-[18px]" />
          {!collapsed && <span>Help & Feedback</span>}
        </button>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10 rounded-xl min-h-[44px]"
          onClick={signOut}
        >
          <LogOut className="h-[18px] w-[18px]" />
          {!collapsed && <span>Sign Out</span>}
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between glass-topbar px-4 md:hidden">
        <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-1 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center active:bg-secondary/60">
          <Menu className="h-5 w-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg gradient-btn-primary flex items-center justify-center">
            <Zap className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-bold text-primary text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>SpeedoBill</span>
        </div>
        <div className="flex items-center gap-0.5">
          <NotificationBell />
          <button onClick={toggleTheme} className="p-2 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-secondary/60">
            {theme === "dark" ? <Sun className="h-4 w-4 text-muted-foreground" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
          </button>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[60] md:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <aside
            className="absolute left-0 top-0 bottom-0 w-72 bg-card border-r border-border flex flex-col p-3 animate-slide-in-right"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2 px-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl gradient-btn-primary flex items-center justify-center">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold text-lg text-primary" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>SpeedoBill</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-xl hover:bg-secondary min-h-[44px] min-w-[44px] flex items-center justify-center">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <SidebarContent onItemClick={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className={`hidden md:flex flex-col glass-sidebar sticky top-0 h-screen transition-all duration-200 ${collapsed ? "w-16" : "w-56 lg:w-60"}`}>
        <div className="flex items-center justify-between px-3 py-3 mb-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl gradient-btn-primary flex items-center justify-center shadow-md">
              <Zap className="h-4 w-4 text-white" />
            </div>
            {!collapsed && (
              <div>
                <h1 className="text-base font-bold text-primary leading-none" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Speedo Bill</h1>
                <p className="text-[9px] text-muted-foreground mt-0.5">Canteen</p>
              </div>
            )}
          </div>
          <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground min-h-[36px] min-w-[36px] flex items-center justify-center">
            <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          </button>
        </div>
        <SidebarContent />
        {!collapsed && (
          <div className="px-4 py-2 text-[10px] text-muted-foreground text-center border-t border-border">
            v2.0
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="flex-1 min-h-screen pt-14 pb-[72px] md:pt-0 md:pb-0 overflow-x-hidden">
        {/* Desktop top bar */}
        <div className="hidden md:flex h-12 items-center justify-end gap-2 px-6 glass-topbar">
          <NotificationBell />
          <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-secondary/60 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center">
            {theme === "dark" ? <Sun className="h-4 w-4 text-muted-foreground" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
          </button>
          <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
            <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs">{userInitials}</AvatarFallback>
          </Avatar>
        </div>
        <Outlet />
      </main>

      {/* Mobile bottom navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-xl md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-stretch justify-around">
          {bottomNavItems.map((item) => {
            const isMore = item.path === "__more__";
            const active = !isMore && location.pathname === item.path;

            return (
              <button
                key={item.label}
                onClick={() => {
                  if (isMore) {
                    setSidebarOpen(true);
                  } else {
                    navigate(item.path);
                  }
                }}
                className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 min-h-[56px] transition-colors active:scale-95 ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className={`h-5 w-5 ${active ? "text-primary" : ""}`} />
                <span className={`text-[10px] leading-tight ${active ? "font-semibold text-primary" : ""}`}>
                  {item.label}
                </span>
                {active && <div className="w-4 h-0.5 rounded-full bg-primary mt-0.5" />}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default AppLayout;