import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import { lazy, Suspense } from "react";
import SpeedoBot from "@/components/SpeedoBot";

// Eager load auth pages + critical entry routes for stability
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import MenuPage from "./pages/MenuPage";
import Dashboard from "./pages/Dashboard";

// Lazy load remaining app pages — prefetch after initial render
const Tables = lazy(() => import("./pages/Tables"));
const Analytics = lazy(() => import("./pages/Analytics"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const DataExportDownload = lazy(() => import("./pages/DataExportDownload"));
const KitchenView = lazy(() => import("./pages/KitchenView"));
const VoidReports = lazy(() => import("./pages/VoidReports"));
const StaffPage = lazy(() => import("./pages/StaffPage"));
const StaffPerformance = lazy(() => import("./pages/StaffPerformance"));
const AuditLog = lazy(() => import("./pages/AuditLog"));
const TableQR = lazy(() => import("./pages/TableQR"));
const ExpensesPage = lazy(() => import("./pages/ExpensesPage"));
const OrderHistory = lazy(() => import("./pages/OrderHistory"));
const BillingHistory = lazy(() => import("./pages/BillingHistory"));
const CreatorAdmin = lazy(() => import("./pages/CreatorAdmin"));
const ChefKDS = lazy(() => import("./pages/ChefKDS"));
const DailyClosing = lazy(() => import("./pages/DailyClosing"));
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

const queryClient = new QueryClient();

const LazyFallback = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

const AppRoutes = () => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <LazyFallback />;
  }

  const isCreator = user?.email === "speedobill7@gmail.com";
  const defaultAuthenticatedRoute = isCreator ? "/creator-admin" : role === "chef" ? "/kds" : "/dashboard";

  return (
    <Suspense fallback={<LazyFallback />}>
      <Routes>
        <Route path="/" element={<Navigate to={user ? defaultAuthenticatedRoute : "/auth"} replace />} />
        <Route path="/auth" element={user ? <Navigate to={defaultAuthenticatedRoute} replace /> : <Auth />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsConditions />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/order/:tableId" element={<CustomerOrder />} />
        <Route path="/kds" element={<ProtectedRoute requireActiveSubscription><ChefKDS /></ProtectedRoute>} />

        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/download-data-export" element={<DataExportDownload />} />
        </Route>

        <Route element={<ProtectedRoute requireActiveSubscription><AppLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tables" element={<Tables />} />
          <Route path="/counter" element={<CounterOrderPage />} />
          <Route path="/kitchen" element={<KitchenView />} />
          <Route path="/incoming-orders" element={<IncomingOrders />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/order-history" element={<OrderHistory />} />
          <Route path="/billing-history" element={<BillingHistory />} />
          <Route path="/void-reports" element={<VoidReports />} />
          <Route path="/staff" element={<StaffPage />} />
          <Route path="/staff-performance" element={<StaffPerformance />} />
          <Route path="/audit-log" element={<AuditLog />} />
          <Route path="/table-qr" element={<TableQR />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/layout-designer" element={<LayoutDesigner />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/inventory-hub" element={<InventoryHub />} />
          <Route path="/recipes" element={<RecipesPage />} />
          <Route path="/vendors" element={<VendorsPage />} />
          <Route path="/wastage" element={<WastagePage />} />
          <Route path="/stock-analytics" element={<StockAnalytics />} />
          <Route path="/integrations" element={<IntegrationsPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/creator-admin" element={<CreatorAdmin />} />
          <Route path="/daily-closing" element={<DailyClosing />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
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
