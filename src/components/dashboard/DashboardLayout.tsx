import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Logo } from "@/components/landing/Logo";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  FileCheck,
  CheckSquare,
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
  FileBarChart,
  FileWarning,
  Shield,
  CalendarClock,
  ChevronDown,
  HardHat,
  HelpCircle,
  LucideIcon,
} from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
}

interface NavItem {
  icon: LucideIcon;
  label: string;
  href: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Core",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
      { icon: FolderOpen, label: "Projects", href: "/projects" },
      { icon: FileText, label: "Documents", href: "/documents" },
      { icon: FileCheck, label: "RAMS", href: "/rams" },
    ],
  },
  {
    label: "Safety",
    items: [
      { icon: CheckSquare, label: "Actions", href: "/actions" },
      { icon: FileWarning, label: "Permits", href: "/permits" },
      { icon: Shield, label: "Inspections", href: "/inspections" },
      { icon: AlertTriangle, label: "Incidents", href: "/incidents" },
    ],
  },
  {
    label: "People",
    items: [
      { icon: QrCode, label: "Site Access", href: "/site-access" },
      { icon: ClipboardCheck, label: "Inductions", href: "/inductions" },
      { icon: MessageSquare, label: "Toolbox Talks", href: "/toolbox-talks" },
      { icon: HardHat, label: "Contractors", href: "/contractors" },
      { icon: CalendarClock, label: "Compliance Calendar", href: "/compliance-calendar" },
      { icon: Users, label: "Team", href: "/team" },
    ],
  },
  {
    label: "Reports",
    items: [
      { icon: Activity, label: "Activity", href: "/activity" },
      { icon: BarChart3, label: "Analytics", href: "/analytics" },
      { icon: FileBarChart, label: "Reports", href: "/reports" },
    ],
  },
];

interface NavSectionProps {
  group: NavGroup;
  isActive: (href: string) => boolean;
  onItemClick?: () => void;
  defaultOpen?: boolean;
}

const NavSection = ({ group, isActive, onItemClick, defaultOpen = true }: NavSectionProps) => {
  const [open, setOpen] = useState(defaultOpen);
  const hasActiveItem = group.items.some((item) => isActive(item.href));

  // Auto-expand if an item is active
  useEffect(() => {
    if (hasActiveItem && !open) {
      setOpen(true);
    }
  }, [hasActiveItem]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
        {group.label}
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? "rotate-0" : "-rotate-90"}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1">
        {group.items.map((item) => (
          <Link
            key={item.label}
            to={item.href}
            onClick={onItemClick}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive(item.href)
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, signOut, loading: authLoading } = useAuth();
  const { isTrialing, trialDaysRemaining, loading: subLoading } = useSubscription();
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

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + "/");

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 flex-col bg-card border-r border-border">
        <div className="p-6 border-b border-border">
          <Link to="/">
            <Logo />
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-2 overflow-y-auto">
          {navGroups.map((group) => (
            <NavSection key={group.label} group={group} isActive={isActive} />
          ))}
        </nav>

        {/* Settings & Help - always visible */}
        <div className="p-3 border-t border-border space-y-1">
          <Link
            to="/help"
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive("/help")
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <HelpCircle className="h-4 w-4" />
            Help & Support
          </Link>
          <Link
            to="/settings"
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive("/settings")
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground w-full transition-colors"
          >
            <LogOut className="h-4 w-4" />
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
        className={`fixed inset-y-0 left-0 w-64 bg-card border-r border-border z-50 transform transition-transform md:hidden overflow-y-auto ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-card">
          <Link to="/" onClick={() => setMobileMenuOpen(false)}>
            <Logo />
          </Link>
          <button onClick={() => setMobileMenuOpen(false)}>
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <nav className="p-3 space-y-2">
          {navGroups.map((group) => (
            <NavSection
              key={group.label}
              group={group}
              isActive={isActive}
              onItemClick={() => setMobileMenuOpen(false)}
            />
          ))}
        </nav>

        <div className="p-3 border-t border-border space-y-1 sticky bottom-0 bg-card">
          <Link
            to="/help"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive("/help")
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <HelpCircle className="h-4 w-4" />
            Help & Support
          </Link>
          <Link
            to="/settings"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive("/settings")
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
          <button
            onClick={() => {
              signOut();
              setMobileMenuOpen(false);
            }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground w-full transition-colors"
          >
            <LogOut className="h-4 w-4" />
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
