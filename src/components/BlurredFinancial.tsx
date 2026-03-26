import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface BlurredFinancialProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Blurs financial data (revenue, totals) for non-owner roles.
 * Owners see data normally. Waiters/chefs see blurred text
 * that reveals on hover only if they have owner role.
 */
const BlurredFinancial = ({ children, className }: BlurredFinancialProps) => {
  const { role } = useAuth();
  const isOwner = role === "owner";

  if (isOwner) return <span className={className}>{children}</span>;

  return (
    <span
      className={cn(
        "select-none filter blur-md transition-all duration-300 pointer-events-none",
        className
      )}
      aria-hidden="true"
    >
      {children}
    </span>
  );
};

export default BlurredFinancial;
