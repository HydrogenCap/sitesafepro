import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useClientPortal } from "@/contexts/ClientPortalContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
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

  // If user is a client portal user, redirect them to the client portal
  if (isClientUser) {
    return <Navigate to="/client" replace />;
  }

  return <>{children}</>;
};
