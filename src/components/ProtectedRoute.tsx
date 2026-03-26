import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Outlet } from "react-router-dom";
import { ReactNode } from "react";

interface Props {
  children?: ReactNode;
  requireActiveSubscription?: boolean;
}

const ProtectedRoute = ({ children, requireActiveSubscription }: Props) => {
  const { user, loading } = useAuth();
  const { isActive } = useSubscription();

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
};

export default ProtectedRoute;
