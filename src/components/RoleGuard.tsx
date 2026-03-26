import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { AppRole } from "@/lib/auth-bootstrap";

interface RoleGuardProps {
  allowed: AppRole[];
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * Blocks access to routes unless the user's role is in the allowed list.
 * Waiters → /tables, Chefs → /kds, otherwise /dashboard.
 */
const RoleGuard = ({ allowed, children, redirectTo }: RoleGuardProps) => {
  const { role } = useAuth();

  if (!role || !allowed.includes(role)) {
    const fallback =
      redirectTo ||
      (role === "waiter" ? "/tables" : role === "chef" ? "/kds" : role === "manager" ? "/dashboard" : "/dashboard");
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
};

export default RoleGuard;
