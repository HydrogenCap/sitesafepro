import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useClientPortal } from "@/contexts/ClientPortalContext";

interface ClientProtectedRouteProps {
  children: ReactNode;
}

export const ClientProtectedRoute = ({ children }: ClientProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { isClientUser, loading: clientLoading } = useClientPortal();

  if (authLoading || clientLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isClientUser) {
    // If they're logged in but not a client user, redirect to main dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
