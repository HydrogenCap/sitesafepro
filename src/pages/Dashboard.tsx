import { useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/landing/Logo";
import { toast } from "sonner";
import {
  LayoutDashboard,
  FolderOpen,
  QrCode,
  Users,
  ClipboardList,
  Calendar,
  Settings,
  LogOut,
  Plus,
  AlertTriangle,
  Building2,
  ChevronRight,
  Bell,
  CreditCard,
  Loader2,
} from "lucide-react";

const Dashboard = () => {
  const { user, signOut, loading: authLoading, checkSubscription, openCustomerPortal, subscriptionLoading } = useAuth();
  const { organisation, tier, isTrialing, trialDaysRemaining, loading: subLoading } = useSubscription();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle checkout success
  useEffect(() => {
    const checkoutStatus = searchParams.get("checkout");
    if (checkoutStatus === "success") {
      toast.success("Subscription activated! Welcome to SafeSite Pro.");
      checkSubscription(); // Refresh subscription status
      setSearchParams({}); // Clear the URL param
    }
  }, [searchParams, checkSubscription, setSearchParams]);

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

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", active: true },
    { icon: FolderOpen, label: "Documents", href: "/documents" },
    { icon: QrCode, label: "Site Access", href: "/site-access" },
    { icon: Users, label: "Contractors", href: "/contractors" },
    { icon: ClipboardList, label: "Permits", href: "/permits", tier: "professional" },
    { icon: Calendar, label: "Compliance", href: "/compliance", tier: "professional" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ];

  const quickActions = [
    { icon: Plus, label: "New Project", description: "Create a new construction project" },
    { icon: FolderOpen, label: "Upload Document", description: "Add RAMS or safety documents" },
    { icon: Users, label: "Invite Contractor", description: "Add team members to your org" },
    { icon: QrCode, label: "Generate QR", description: "Create site access QR code" },
  ];

  const handleManageSubscription = async () => {
    await openCustomerPortal();
  };

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Sidebar */}
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
                item.active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
              {item.tier === "professional" && tier === "starter" && (
                <span className="ml-auto text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                  Pro
                </span>
              )}
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

      {/* Main content */}
      <div className="flex-1 flex flex-col">
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

        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Welcome back, {user.user_metadata?.full_name || user.email}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-muted-foreground hover:text-foreground">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-accent rounded-full" />
            </button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>
        </header>

        {/* Dashboard content */}
        <main className="flex-1 p-6 overflow-auto">
          {/* Organisation card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl p-6 shadow-sm border border-border mb-6"
          >
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-foreground">
                  {organisation?.name || "Your Organisation"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {tier === "trial" ? "Free Trial" : `${String(tier).charAt(0).toUpperCase() + String(tier).slice(1)} Plan`}
                  {" · "}
                  {organisation?.slug ? `app.sitesafepro.co.uk/${organisation.slug}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!isTrialing && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleManageSubscription}
                    disabled={subscriptionLoading}
                  >
                    {subscriptionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-1" />
                        Billing
                      </>
                    )}
                  </Button>
                )}
                <Link to="/settings">
                  <Button variant="outline" size="sm">
                    Manage
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Quick actions */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action, index) => (
                <motion.button
                  key={action.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-card p-5 rounded-xl border border-border hover:border-primary/30 hover:shadow-md transition-all text-left group"
                >
                  <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center mb-3 group-hover:bg-primary transition-colors">
                    <action.icon className="h-5 w-5 text-primary group-hover:text-primary-foreground transition-colors" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-1">{action.label}</h4>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Empty state for projects */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-foreground mb-4">Your Projects</h3>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-xl border-2 border-dashed border-border p-12 text-center"
            >
              <div className="h-16 w-16 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
                <FolderOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <h4 className="text-lg font-semibold text-foreground mb-2">No projects yet</h4>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Create your first project to start managing site safety compliance, documents, and contractor access.
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Project
              </Button>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
