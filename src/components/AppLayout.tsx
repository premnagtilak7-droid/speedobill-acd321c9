import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard, UtensilsCrossed, Grid3X3, ChefHat, BarChart3,
  Settings, LogOut, ScrollText, Menu, X, Wallet, Users, Package, CalendarCheck, Store, Zap, CreditCard, ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const ownerNav = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Tables", icon: Grid3X3, path: "/tables" },
  { label: "Menu", icon: UtensilsCrossed, path: "/menu" },
  { label: "Kitchen", icon: ChefHat, path: "/kitchen" },
  { label: "Orders", icon: ScrollText, path: "/order-history" },
  { label: "Analytics", icon: BarChart3, path: "/analytics" },
  { label: "Expenses", icon: Wallet, path: "/expenses" },
  { label: "Staff", icon: Users, path: "/staff" },
  { label: "Inventory", icon: Package, path: "/inventory-hub" },
  { label: "Daily Closing", icon: CalendarCheck, path: "/daily-closing" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

const waiterNav = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Tables", icon: Grid3X3, path: "/tables" },
  { label: "Menu", icon: UtensilsCrossed, path: "/menu" },
  { label: "Orders", icon: ScrollText, path: "/order-history" },
  { label: "Counter", icon: Store, path: "/counter" },
];

const chefNav = [
  { label: "Kitchen", icon: ChefHat, path: "/kitchen" },
];

const AppLayout = () => {
  const { signOut, role, user } = useAuth();
  const isCreator = user?.email === "speedobill7@gmail.com";
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const baseNav = role === "chef" ? chefNav : role === "waiter" ? waiterNav : ownerNav;
  const navItems = [
    ...baseNav,
    ...(isCreator ? [
      { label: "Pricing", icon: CreditCard, path: "/pricing" },
      { label: "Creator Admin", icon: ShieldCheck, path: "/creator-admin" },
    ] : []),
  ];

  const NavButton = ({ item, onClick }: { item: typeof ownerNav[0]; onClick?: () => void }) => {
    const active = location.pathname === item.path;
    return (
      <button
        onClick={() => { navigate(item.path); onClick?.(); }}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
          active
            ? "bg-primary/15 text-primary font-semibold shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
        }`}
      >
        <item.icon className={`h-[18px] w-[18px] ${active ? "text-primary" : ""}`} />
        {item.label}
        {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
      </button>
    );
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-border bg-card/95 backdrop-blur-xl px-4 md:hidden">
        <button onClick={() => setSidebarOpen(true)} className="p-1">
          <Menu className="h-5 w-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg gradient-btn-primary flex items-center justify-center">
            <Zap className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-bold text-primary text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>SpeedoBill</span>
        </div>
        <div className="w-5" />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <aside
            className="absolute left-0 top-0 bottom-0 w-72 bg-card border-r border-border p-4 space-y-1 animate-slide-in-right"
            style={{ animationName: "slideInLeft" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 px-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl gradient-btn-primary flex items-center justify-center">
                  <Zap className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold text-lg text-primary" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>SpeedoBill</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg hover:bg-secondary">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            {navItems.map((item) => (
              <NavButton key={item.path} item={item} onClick={() => setSidebarOpen(false)} />
            ))}
            <div className="pt-4 mt-4 border-t border-border">
              <Button variant="ghost" className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10" onClick={signOut}>
                <LogOut className="h-4 w-4" /> Sign Out
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 lg:w-64 flex-col border-r border-border bg-card/30 backdrop-blur-sm p-4 sticky top-0 h-screen">
        <div className="mb-8 px-2 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl gradient-btn-primary flex items-center justify-center shadow-lg">
            <Zap className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary leading-none" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>SpeedoBill</h1>
            <p className="text-[10px] text-muted-foreground mt-0.5">Restaurant Management</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavButton key={item.path} item={item} />
          ))}
        </nav>
        <div className="pt-3 border-t border-border mt-3">
          <Button variant="ghost" className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10 rounded-xl" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-h-screen pt-14 md:pt-0 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
