import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard, UtensilsCrossed, Grid3X3, ChefHat, BarChart3,
  Settings, LogOut, ScrollText, Menu, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Tables", icon: Grid3X3, path: "/tables" },
  { label: "Menu", icon: UtensilsCrossed, path: "/menu" },
  { label: "Kitchen", icon: ChefHat, path: "/kitchen" },
  { label: "Orders", icon: ScrollText, path: "/order-history" },
  { label: "Analytics", icon: BarChart3, path: "/analytics" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

const AppLayout = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b bg-card/95 backdrop-blur px-4 md:hidden">
        <button onClick={() => setSidebarOpen(true)}>
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-bold text-primary">Speedo Bill</span>
        <div className="w-5" />
      </div>

      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <aside
            className="absolute left-0 top-0 bottom-0 w-64 bg-card border-r p-4 space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold text-lg text-primary">Speedo Bill</span>
              <button onClick={() => setSidebarOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  location.pathname === item.path
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
            <Button variant="ghost" className="w-full justify-start gap-3 text-destructive mt-4" onClick={signOut}>
              <LogOut className="h-4 w-4" /> Sign Out
            </Button>
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-56 lg:w-60 flex-col border-r bg-card/50 p-3 sticky top-0 h-screen">
        <div className="mb-6 px-2">
          <h1 className="text-lg font-bold text-primary">Speedo Bill</h1>
          <p className="text-[10px] text-muted-foreground">Canteen Management</p>
        </div>
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                location.pathname === item.path
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>
        <Button variant="ghost" className="justify-start gap-3 text-destructive" onClick={signOut}>
          <LogOut className="h-4 w-4" /> Sign Out
        </Button>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-h-screen pt-14 md:pt-0 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
