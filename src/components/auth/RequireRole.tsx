import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useOrg } from "@/hooks/useOrg";
import type { MemberRole } from "@/types/org";

interface RequireRoleProps {
  role: MemberRole;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Renders children only if the active user has >= the required role.
 * Redirects to /access-denied otherwise.
 */
export function RequireRole({ role, children, fallback }: RequireRoleProps) {
  const { hasRole, loading } = useOrg();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!hasRole(role)) {
    return fallback ? <>{fallback}</> : <Navigate to="/access-denied" replace />;
  }

  return <>{children}</>;
}
