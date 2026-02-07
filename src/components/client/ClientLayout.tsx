import { ReactNode, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useClientPortal } from "@/contexts/ClientPortalContext";
import { Logo } from "@/components/landing/Logo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ClientLayoutProps {
  children: ReactNode;
}

const roleLabels: Record<string, string> = {
  client: "Client",
  principal_designer: "Principal Designer",
  cdm_advisor: "CDM Advisor",
  building_control: "Building Control",
};

export const ClientLayout = ({ children }: ClientLayoutProps) => {
  const { user, signOut, loading: authLoading } = useAuth();
  const { clientUser, organisation, loading: clientLoading, updateLastLogin } = useClientPortal();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (clientUser) {
      updateLastLogin();
    }
  }, [clientUser, updateLastLogin]);

  if (authLoading || clientLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user || !clientUser) return null;

  const initials = clientUser.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/client" className="flex items-center gap-3">
              {organisation?.logo_url ? (
                <img 
                  src={organisation.logo_url} 
                  alt={organisation.name} 
                  className="h-8 w-auto"
                />
              ) : (
                <Logo />
              )}
            </Link>

            {/* User menu */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium">{clientUser.full_name}</p>
                <p className="text-xs text-muted-foreground">{clientUser.company_name}</p>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback 
                        className="text-xs"
                        style={{ 
                          backgroundColor: organisation?.primary_colour || undefined 
                        }}
                      >
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{clientUser.full_name}</p>
                    <p className="text-xs text-muted-foreground">{clientUser.email}</p>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {roleLabels[clientUser.role] || clientUser.role}
                    </Badge>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs text-muted-foreground">
            Powered by SiteSafe Pro • Compliance Management Platform
          </p>
        </div>
      </footer>
    </div>
  );
};
