import { ReactNode, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Logo } from "@/components/landing/Logo";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  QrCode,
  Users,
  Activity,
  BarChart3,
  Settings,
  LogOut,
  AlertTriangle,
  Bell,
  Menu,
  X,
  MessageSquare,
  ClipboardCheck,
} from "lucide-react";
import { useState } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
}

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: FolderOpen, label: "Projects", href: "/projects" },
  { icon: FileText, label: "Documents", href: "/documents" },
  { icon: QrCode, label: "Site Access", href: "/site-access" },
  { icon: ClipboardCheck, label: "Inductions", href: "/inductions" },
  { icon: MessageSquare, label: "Toolbox Talks", href: "/toolbox-talks" },
  { icon: Users, label: "Team", href: "/team" },
  { icon: Activity, label: "Activity", href: "/activity" },
  { icon: BarChart3, label: "Analytics", href: "/analytics" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, signOut, loading: authLoading } = useAuth();
  const { tier, isTrialing, trialDaysRemaining, loading: subLoading } = useSubscription();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return null;

  const isActive = (href: string) => location.pathname === href || location.pathname.startsWith(href + "/");

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 flex-col bg-card border-r border-border">
        <div className="p-6 border-b border-border">
          <Link to="/">
            <Logo />
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground w-full transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-card border-r border-border z-50 transform transition-transform md:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 border-b border-border flex items-center justify-between">
          <Link to="/" onClick={() => setMobileMenuOpen(false)}>
            <Logo />
          </Link>
          <button onClick={() => setMobileMenuOpen(false)}>
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <button
            onClick={() => {
              signOut();
              setMobileMenuOpen(false);
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground w-full transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Trial banner */}
        {isTrialing && (
          <div className="bg-accent text-accent-foreground px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">
                You're on a 14-day free trial. {trialDaysRemaining} days remaining.
              </span>
            </div>
            <Link to="/#pricing">
              <Button variant="secondary" size="sm">
                Choose a Plan
              </Button>
            </Link>
          </div>
        )}

        {/* Mobile header */}
        <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between md:hidden">
          <button onClick={() => setMobileMenuOpen(true)}>
            <Menu className="h-6 w-6 text-foreground" />
          </button>
          <Link to="/">
            <Logo />
          </Link>
          <button className="relative p-2 text-muted-foreground hover:text-foreground">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-accent rounded-full" />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
};
