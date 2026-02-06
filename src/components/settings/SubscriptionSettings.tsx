import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  CreditCard, 
  Check, 
  Sparkles, 
  Building2,
  FolderOpen,
  Users,
  HardDrive,
  ExternalLink,
  AlertCircle
} from "lucide-react";
import { STRIPE_PRODUCTS, SubscriptionTier as StripeTier } from "@/config/stripe";

type SubscriptionTier = "starter" | "professional" | "enterprise";
type SubscriptionStatus = "active" | "past_due" | "cancelled" | "trialing";

interface OrganisationBilling {
  id: string;
  name: string;
  subscription_tier: SubscriptionTier | null;
  subscription_status: SubscriptionStatus | null;
  trial_ends_at: string | null;
  max_projects: number | null;
  storage_used_bytes: number | null;
}

export default function SubscriptionSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [organisation, setOrganisation] = useState<OrganisationBilling | null>(null);
  const [projectCount, setProjectCount] = useState(0);
  const [memberCount, setMemberCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchBillingData();
    }
  }, [user]);

  const fetchBillingData = async () => {
    try {
      // Get user's organisation
      const { data: memberData, error: memberError } = await supabase
        .from("organisation_members")
        .select("organisation_id")
        .eq("profile_id", user?.id)
        .eq("status", "active")
        .maybeSingle();

      if (memberError || !memberData) {
        setLoading(false);
        return;
      }

      // Get organisation billing details
      const { data: orgData, error: orgError } = await supabase
        .from("organisations")
        .select("id, name, subscription_tier, subscription_status, trial_ends_at, max_projects, storage_used_bytes")
        .eq("id", memberData.organisation_id)
        .single();

      if (orgError) throw orgError;
      setOrganisation(orgData);

      // Get project count
      const { count: projectCountData } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .eq("organisation_id", memberData.organisation_id);

      setProjectCount(projectCountData || 0);

      // Get member count
      const { count: memberCountData } = await supabase
        .from("organisation_members")
        .select("*", { count: "exact", head: true })
        .eq("organisation_id", memberData.organisation_id)
        .eq("status", "active");

      setMemberCount(memberCountData || 0);
    } catch (error: any) {
      console.error("Error fetching billing data:", error);
      toast({
        title: "Error",
        description: "Failed to load subscription details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        body: {},
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error("Error opening portal:", error);
      toast({
        title: "Error",
        description: "Failed to open billing portal",
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  const handleUpgrade = async (priceId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error("Error creating checkout:", error);
      toast({
        title: "Error",
        description: "Failed to start upgrade process",
        variant: "destructive",
      });
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 GB";
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(2)} GB`;
  };

  const getStorageLimit = (tier: SubscriptionTier | null) => {
    const limits: Record<SubscriptionTier, number> = {
      starter: 5 * 1024 * 1024 * 1024, // 5GB
      professional: 25 * 1024 * 1024 * 1024, // 25GB
      enterprise: 100 * 1024 * 1024 * 1024, // 100GB
    };
    return limits[tier || "starter"];
  };

  const getMemberLimit = (tier: SubscriptionTier | null) => {
    const limits: Record<SubscriptionTier, number> = {
      starter: 10,
      professional: 999, // Unlimited
      enterprise: 999, // Unlimited
    };
    return limits[tier || "starter"];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentTier = organisation?.subscription_tier || "starter";
  const currentPlan = STRIPE_PRODUCTS[currentTier];
  const storageUsed = organisation?.storage_used_bytes || 0;
  const storageLimit = getStorageLimit(currentTier);
  const storagePercent = (storageUsed / storageLimit) * 100;
  const memberLimit = getMemberLimit(currentTier);
  const isTrialing = organisation?.subscription_status === "trialing";
  const trialEndsAt = organisation?.trial_ends_at ? new Date(organisation.trial_ends_at) : null;

  const plans = Object.entries(STRIPE_PRODUCTS).map(([id, plan]) => ({
    id: id as SubscriptionTier,
    ...plan,
    stripePriceId: plan.priceId,
  }));

  return (
    <div className="space-y-6">
      {/* Trial Banner */}
      {isTrialing && trialEndsAt && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-6 w-6 text-amber-500 flex-shrink-0" />
              <div>
                <h3 className="font-semibold">Trial Period Active</h3>
                <p className="text-sm text-muted-foreground">
                  Your free trial ends on{" "}
                  <strong>{trialEndsAt.toLocaleDateString()}</strong>. Upgrade to
                  continue using all features.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>
                Manage your subscription and billing
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-1">
              {currentPlan?.name || "Starter"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Usage Stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-3 mb-2">
                <FolderOpen className="h-5 w-5 text-primary" />
                <span className="font-medium">Projects</span>
              </div>
              <p className="text-2xl font-bold">
                {projectCount} / {organisation?.max_projects || 1}
              </p>
              <Progress
                value={(projectCount / (organisation?.max_projects || 1)) * 100}
                className="mt-2"
              />
            </div>

            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-3 mb-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="font-medium">Team Members</span>
              </div>
              <p className="text-2xl font-bold">
                {memberCount} / {memberLimit === 999 ? "∞" : memberLimit}
              </p>
              <Progress
                value={memberLimit === 999 ? 10 : (memberCount / memberLimit) * 100}
                className="mt-2"
              />
            </div>

            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-3 mb-2">
                <HardDrive className="h-5 w-5 text-primary" />
                <span className="font-medium">Storage</span>
              </div>
              <p className="text-2xl font-bold">
                {formatBytes(storageUsed)}
              </p>
              <Progress value={storagePercent} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1">
                of {formatBytes(storageLimit)}
              </p>
            </div>
          </div>

          {/* Manage Billing Button */}
          <div className="flex justify-end">
            <Button onClick={handleManageBilling} disabled={portalLoading}>
              {portalLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              Manage Billing
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
          <CardDescription>
            Choose the plan that best fits your needs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => {
              const isCurrentPlan = plan.id === currentTier;
              const Icon = plan.id === "enterprise" ? Building2 : plan.id === "professional" ? Sparkles : CreditCard;

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-lg border p-6 ${
                    isCurrentPlan
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                >
                  {isCurrentPlan && (
                    <Badge className="absolute -top-3 left-4">
                      Current Plan
                    </Badge>
                  )}

                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-full bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold">{plan.name}</h3>
                  </div>

                  <div className="mb-4">
                    <span className="text-3xl font-bold">£{plan.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {plan.features.slice(0, 5).map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    variant={isCurrentPlan ? "outline" : "default"}
                    disabled={isCurrentPlan}
                    onClick={() => !isCurrentPlan && handleUpgrade(plan.stripePriceId)}
                  >
                    {isCurrentPlan ? "Current Plan" : "Upgrade"}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
