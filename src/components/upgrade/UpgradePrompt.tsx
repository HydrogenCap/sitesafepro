import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";

interface FeatureCopy {
  headline: string;
  bullets: string[];
  recommendedPlan: "professional" | "enterprise";
}

const FEATURE_COPY: Record<string, FeatureCopy> = {
  projects: {
    headline: "You've reached your project limit",
    bullets: ["Up to 5 active projects", "Multi-site dashboard", "Project archiving & handover packs"],
    recommendedPlan: "professional",
  },
  toolbox_talks: {
    headline: "Toolbox Talks are available on Professional",
    bullets: ["35+ pre-built talk library", "QR code attendance tracking", "PDF export & compliance reports"],
    recommendedPlan: "professional",
  },
  client_report: {
    headline: "Client Reports are available on Professional",
    bullets: ["Branded PDF reports", "Section toggles & customisation", "One-click generation from live data"],
    recommendedPlan: "professional",
  },
  handover_pack: {
    headline: "Handover Packs are available on Professional",
    bullets: ["CDM Health & Safety File generator", "One-click PDF assembly", "Auto-assembled from project data"],
    recommendedPlan: "professional",
  },
  permits_to_work: {
    headline: "Permits to Work are available on Professional",
    bullets: ["Digital permit workflow", "Approval separation enforcement", "Expiry tracking & notifications"],
    recommendedPlan: "professional",
  },
  inspections: {
    headline: "Inspections are available on Professional",
    bullets: ["Site inspection checklists", "Photo evidence capture", "Corrective action tracking"],
    recommendedPlan: "professional",
  },
  incident_reporting: {
    headline: "Incident Reporting is available on Professional",
    bullets: ["RIDDOR-compliant reporting", "Investigation workflow", "Incident trend analysis"],
    recommendedPlan: "professional",
  },
  coshh_register: {
    headline: "COSHH Register is available on Professional",
    bullets: ["Substance tracking & SDS management", "AI-powered auto-fill", "GHS pictogram display"],
    recommendedPlan: "professional",
  },
  compliance_calendar: {
    headline: "Compliance Calendar is available on Professional",
    bullets: ["Document expiry tracking", "Automated reminder notifications", "30/60/90 day visibility"],
    recommendedPlan: "professional",
  },
  rams_workflow: {
    headline: "RAMS Workflow is available on Professional",
    bullets: ["Guided RAMS builder", "Risk assessment templates", "Digital approval workflow"],
    recommendedPlan: "professional",
  },
  client_portal: {
    headline: "Client Portal is available on Enterprise",
    bullets: ["Client self-service dashboard", "Granular permission controls", "Branded client experience"],
    recommendedPlan: "enterprise",
  },
  ai_document_analysis: {
    headline: "AI Document Analysis is available on Enterprise",
    bullets: ["Automatic document classification", "Compliance gap detection", "Smart categorisation"],
    recommendedPlan: "enterprise",
  },
  prequalification: {
    headline: "Pre-Qualification is available on Enterprise",
    bullets: ["Contractor pre-qual portal", "Approval workflow & scoring", "Expiry tracking & badges"],
    recommendedPlan: "enterprise",
  },
};

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  professional: "Professional",
  enterprise: "Enterprise",
  trial: "Free Trial",
};

interface UpgradePromptProps {
  feature: string;
  variant?: "inline" | "dialog" | "banner";
  currentUsage?: number;
  limit?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const UpgradePrompt = ({
  feature,
  variant = "inline",
  currentUsage,
  limit,
  open,
  onOpenChange,
}: UpgradePromptProps) => {
  const { tier } = useSubscription();
  const [loading, setLoading] = useState(false);
  const copy = FEATURE_COPY[feature] || {
    headline: "Upgrade to unlock this feature",
    bullets: ["Access premium features", "Priority support", "Advanced tools"],
    recommendedPlan: "professional" as const,
  };

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { tier: copy.recommendedPlan },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
      toast.error("Could not start checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-accent" />
        </div>
        <h4 className="font-semibold text-foreground">{copy.headline}</h4>
      </div>

      {currentUsage !== undefined && limit !== undefined && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Usage</span>
            <span className="font-medium text-foreground">
              {currentUsage} / {limit}
            </span>
          </div>
          <Progress value={(currentUsage / limit) * 100} className="h-2" />
        </div>
      )}

      <ul className="space-y-2">
        {copy.bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-2 text-sm text-muted-foreground">
            <ArrowRight className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-muted-foreground">
          Current: <span className="font-medium">{PLAN_LABELS[tier] || tier}</span>
          {" → "}
          <span className="font-medium text-primary">{PLAN_LABELS[copy.recommendedPlan]}</span>
        </p>
        <Button size="sm" onClick={handleUpgrade} disabled={loading}>
          {loading ? "Loading…" : "Upgrade Now"}
          {!loading && <ArrowRight className="h-3.5 w-3.5 ml-1" />}
        </Button>
      </div>
    </div>
  );

  if (variant === "dialog") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="sr-only">Upgrade your plan</DialogTitle>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  if (variant === "banner") {
    return (
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-accent/5 border border-accent/20 rounded-xl p-4"
      >
        {content}
      </motion.div>
    );
  }

  // inline (default)
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl border border-border p-5 shadow-sm"
    >
      {content}
    </motion.div>
  );
};
