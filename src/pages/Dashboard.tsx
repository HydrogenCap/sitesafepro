import { useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/hooks/useOrg";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ActionsDashboardWidget } from "@/components/dashboard/ActionsDashboardWidget";
import { ComplianceCalendarWidget } from "@/components/dashboard/ComplianceCalendarWidget";
import { UsageBars } from "@/components/dashboard/UsageBars";
import { toast } from "sonner";
import {
  Plus,
  FolderOpen,
  Building2,
  ChevronRight,
  CreditCard,
  Loader2,
  QrCode,
  Users,
  FileText,
} from "lucide-react";

const Dashboard = () => {
  const { user, checkSubscription, openCustomerPortal, subscriptionLoading } = useAuth();
  const { organisation, tier, isTrialing, loading: subLoading } = useSubscription();
  const { membership } = useOrg();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Redirect contractor-role users to their portal
  useEffect(() => {
    if (membership?.role === "contractor") {
      navigate("/contractor-portal", { replace: true });
    }
  }, [membership?.role, navigate]);

  // Handle checkout success
  useEffect(() => {
    const checkoutStatus = searchParams.get("checkout");
    if (checkoutStatus === "success") {
      toast.success("Subscription activated! Welcome to Site Safe.");
      checkSubscription();
      setSearchParams({});
    }
  }, [searchParams, checkSubscription, setSearchParams]);

  if (subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return null;

  const quickActions = [
    { icon: Plus, label: "New Project", description: "Create a new construction project", href: "/projects/new" },
    { icon: FolderOpen, label: "View Projects", description: "Manage your existing projects", href: "/projects" },
    { icon: Users, label: "Invite Contractor", description: "Add team members to your org", href: "/contractors" },
    { icon: QrCode, label: "Generate QR", description: "Create site access QR code", href: "/site-access" },
  ];

  const handleManageSubscription = async () => {
    await openCustomerPortal();
  };

  return (
    <DashboardLayout>
      {/* Desktop header */}
      <header className="hidden md:flex bg-card border-b border-border px-6 py-4 items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back, {user.user_metadata?.full_name || user.email}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button asChild>
            <Link to="/projects/new">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Link>
          </Button>
        </div>
      </header>

      {/* Dashboard content */}
      <div className="p-6">
        {/* Organisation card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl p-6 shadow-sm border border-border mb-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-foreground">
                {organisation?.name || "Your Organisation"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {tier === "trial" ? "Free Trial" : `${String(tier).charAt(0).toUpperCase() + String(tier).slice(1)} Plan`}
                {organisation?.slug ? ` · ${organisation.slug}` : ""}
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

        {/* Usage bars for Starter/Trial */}
        <div className="mb-8">
          <UsageBars />
        </div>

        {/* Quick actions */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link to={action.href}>
                  <div className="bg-card p-5 rounded-xl border border-border hover:border-primary/30 hover:shadow-md transition-all group h-full">
                    <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center mb-3 group-hover:bg-primary transition-colors">
                      <action.icon className="h-5 w-5 text-primary group-hover:text-primary-foreground transition-colors" />
                    </div>
                    <h4 className="font-semibold text-foreground mb-1">{action.label}</h4>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Actions Widget */}
        <div className="mb-8">
          <ActionsDashboardWidget />
        </div>

        {/* Document Expiry Widget */}
        <div className="mb-8">
          <ComplianceCalendarWidget />
        </div>

        {/* Recent activity / empty state */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl border-2 border-dashed border-border p-12 text-center"
          >
            <div className="h-16 w-16 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h4 className="text-lg font-semibold text-foreground mb-2">No activity yet</h4>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Your recent activity will appear here once you start creating projects, uploading documents, and inviting contractors.
            </p>
            <Button asChild>
              <Link to="/onboarding">
                <Plus className="h-4 w-4 mr-2" />
                Get Started
              </Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
