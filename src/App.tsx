import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleGuard from "@/components/RoleGuard";
import AppLayout from "@/components/AppLayout";
import { lazy } from "react";
import SpeedoBot from "@/components/SpeedoBot";
import PinLockGate from "@/components/PinLockGate";
import ScrollToTop from "@/components/ScrollToTop";

// Eager load auth pages + critical entry routes for stability
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import MenuPage from "./pages/MenuPage";
import Dashboard from "./pages/Dashboard";
import VoidReports from "./pages/VoidReports";
import DailyClosing from "./pages/DailyClosing";

// Lazy load remaining app pages — prefetch after initial render
const Tables = lazy(() => import("./pages/Tables"));
const Analytics = lazy(() => import("./pages/Analytics"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const DataExportDownload = lazy(() => import("./pages/DataExportDownload"));
const KitchenView = lazy(() => import("./pages/KitchenView"));
const StaffPage = lazy(() => import("./pages/StaffPage"));
const StaffPerformance = lazy(() => import("./pages/StaffPerformance"));
const AuditLog = lazy(() => import("./pages/AuditLog"));
const TableQR = lazy(() => import("./pages/TableQR"));
const ExpensesPage = lazy(() => import("./pages/ExpensesPage"));
const OrderHistory = lazy(() => import("./pages/OrderHistory"));
const BillingHistory = lazy(() => import("./pages/BillingHistory"));
const CreatorAdmin = lazy(() => import("./pages/CreatorAdmin"));
const ChefKDS = lazy(() => import("./pages/ChefKDS"));
const CustomerOrder = lazy(() => import("./pages/CustomerOrder"));
const IncomingOrders = lazy(() => import("./pages/IncomingOrders"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const CounterOrderPage = lazy(() => import("./pages/CounterOrder"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsConditions = lazy(() => import("./pages/TermsConditions"));
const SupportPage = lazy(() => import("./pages/SupportPage"));
const LayoutDesigner = lazy(() => import("./pages/LayoutDesigner"));
const InventoryPage = lazy(() => import("./pages/InventoryPage"));
const RecipesPage = lazy(() => import("./pages/RecipesPage"));
const VendorsPage = lazy(() => import("./pages/VendorsPage"));
const WastagePage = lazy(() => import("./pages/WastagePage"));
const StockAnalytics = lazy(() => import("./pages/StockAnalytics"));
const InventoryHub = lazy(() => import("./pages/InventoryHub"));
const IntegrationsPage = lazy(() => import("./pages/IntegrationsPage"));
const CustomersPage = lazy(() => import("./pages/CustomersPage"));
const OnlineOrders = lazy(() => import("./pages/OnlineOrders"));
const SupplyStore = lazy(() => import("./pages/SupplyStore"));
const LoyaltySettings = lazy(() => import("./pages/LoyaltySettings"));
const StaffProfile = lazy(() => import("./pages/StaffProfile"));

// Prefetch critical routes after first paint
if (typeof window !== "undefined") {
  requestIdleCallback?.(() => {
    import("./pages/Dashboard");
    import("./pages/Tables");
    import("./pages/KitchenView");
    import("./pages/Analytics");
    import("./pages/SettingsPage");
    import("./pages/DataExportDownload");
    import("./pages/OrderHistory");
  }) ?? setTimeout(() => {
    import("./pages/Dashboard");
    import("./pages/Tables");
    import("./pages/KitchenView");
  }, 2000);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const AppRoutes = () => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const isCreator = user?.email === "speedobill7@gmail.com";
  const defaultAuthenticatedRoute = isCreator && role === "owner"
    ? "/creator-admin"
    : role === "chef"
      ? "/kds"
      : role === "waiter"
        ? "/tables"
        : role === "manager" || role === "owner"
          ? "/dashboard"
          : "/tables";

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Navigate to={user ? defaultAuthenticatedRoute : "/auth"} replace />} />
        <Route path="/auth" element={user ? <Navigate to={defaultAuthenticatedRoute} replace /> : <Auth />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsConditions />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/order/:tableId" element={<CustomerOrder />} />
        <Route path="/kds" element={<ProtectedRoute requireActiveSubscription><RoleGuard allowed={["owner", "manager", "chef"]}><ChefKDS /></RoleGuard></ProtectedRoute>} />
        <Route path="/creator-admin" element={<ProtectedRoute><RoleGuard allowed={["owner"]} redirectTo="/tables"><CreatorAdmin /></RoleGuard></ProtectedRoute>} />

        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/pricing" element={<RoleGuard allowed={["owner", "manager"]}><PricingPage /></RoleGuard>} />
          <Route path="/download-data-export" element={<RoleGuard allowed={["owner", "manager"]}><DataExportDownload /></RoleGuard>} />
        </Route>

        <Route element={<ProtectedRoute requireActiveSubscription><AppLayout /></ProtectedRoute>}>
          {/* Shared routes — all roles */}
          <Route path="/tables" element={<RoleGuard allowed={["owner", "manager", "waiter"]}><Tables /></RoleGuard>} />
          <Route path="/counter" element={<RoleGuard allowed={["owner", "manager", "waiter"]}><CounterOrderPage /></RoleGuard>} />
          <Route path="/kitchen" element={<RoleGuard allowed={["owner", "manager"]}><KitchenView /></RoleGuard>} />
          <Route path="/menu" element={<RoleGuard allowed={["owner", "manager"]}><MenuPage /></RoleGuard>} />

          {/* Owner + Manager shared routes */}
          <Route path="/dashboard" element={<RoleGuard allowed={["owner", "manager"]}><Dashboard /></RoleGuard>} />
          <Route path="/incoming-orders" element={<RoleGuard allowed={["owner", "manager"]}><IncomingOrders /></RoleGuard>} />
          <Route path="/analytics" element={<RoleGuard allowed={["owner", "manager"]}><Analytics /></RoleGuard>} />
          <Route path="/order-history" element={<RoleGuard allowed={["owner", "manager", "waiter"]}><OrderHistory /></RoleGuard>} />
          <Route path="/void-reports" element={<RoleGuard allowed={["owner", "manager"]}><VoidReports /></RoleGuard>} />
          <Route path="/staff" element={<RoleGuard allowed={["owner", "manager"]}><StaffPage /></RoleGuard>} />
          <Route path="/staff-performance" element={<RoleGuard allowed={["owner", "manager"]}><StaffPerformance /></RoleGuard>} />
          <Route path="/table-qr" element={<RoleGuard allowed={["owner", "manager"]}><TableQR /></RoleGuard>} />
          <Route path="/inventory-hub" element={<RoleGuard allowed={["owner", "manager"]}><InventoryHub /></RoleGuard>} />
          <Route path="/customers" element={<RoleGuard allowed={["owner", "manager"]}><CustomersPage /></RoleGuard>} />
          <Route path="/daily-closing" element={<RoleGuard allowed={["owner", "manager"]}><DailyClosing /></RoleGuard>} />
          <Route path="/online-orders" element={<RoleGuard allowed={["owner", "manager"]}><OnlineOrders /></RoleGuard>} />

          {/* Owner-only routes — all PIN-protected */}
          <Route path="/expenses" element={<RoleGuard allowed={["owner"]}><PinLockGate><ExpensesPage /></PinLockGate></RoleGuard>} />
          <Route path="/billing-history" element={<RoleGuard allowed={["owner"]}><PinLockGate><BillingHistory /></PinLockGate></RoleGuard>} />
          <Route path="/audit-log" element={<RoleGuard allowed={["owner"]}><PinLockGate><AuditLog /></PinLockGate></RoleGuard>} />
          <Route path="/layout-designer" element={<RoleGuard allowed={["owner"]}><LayoutDesigner /></RoleGuard>} />
          <Route path="/inventory" element={<RoleGuard allowed={["owner"]}><PinLockGate><InventoryPage /></PinLockGate></RoleGuard>} />
          <Route path="/recipes" element={<RoleGuard allowed={["owner"]}><RecipesPage /></RoleGuard>} />
          <Route path="/vendors" element={<RoleGuard allowed={["owner"]}><PinLockGate><VendorsPage /></PinLockGate></RoleGuard>} />
          <Route path="/wastage" element={<RoleGuard allowed={["owner"]}><WastagePage /></RoleGuard>} />
          <Route path="/stock-analytics" element={<RoleGuard allowed={["owner"]}><PinLockGate><StockAnalytics /></PinLockGate></RoleGuard>} />
          <Route path="/integrations" element={<RoleGuard allowed={["owner"]}><IntegrationsPage /></RoleGuard>} />
          <Route path="/supply-store" element={<RoleGuard allowed={["owner"]}><SupplyStore /></RoleGuard>} />
          <Route path="/loyalty-settings" element={<RoleGuard allowed={["owner"]}><LoyaltySettings /></RoleGuard>} />
          <Route path="/settings" element={<RoleGuard allowed={["owner"]}><PinLockGate><SettingsPage /></PinLockGate></RoleGuard>} />

          {/* Staff self-profile — waiter, chef, manager */}
          <Route path="/staff-profile" element={<RoleGuard allowed={["owner", "manager", "waiter", "chef"]}><StaffProfile /></RoleGuard>} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SubscriptionProvider>
            <AppRoutes />
            <SpeedoBot />
          </SubscriptionProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
