import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Outlet } from "react-router-dom";
import { ReactNode, memo } from "react";

interface Props {
  children?: ReactNode;
  requireActiveSubscription?: boolean;
}

const ProtectedRoute = memo(({ children, requireActiveSubscription }: Props) => {
  const { user, loading } = useAuth();
  const { status } = useSubscription();
  const isActive = status === "trial" || status === "active";

  // While auth is loading, show spinner — do NOT redirect
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (requireActiveSubscription && !isActive) {
    return <Navigate to="/pricing" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
});

ProtectedRoute.displayName = "ProtectedRoute";

export default ProtectedRoute;
