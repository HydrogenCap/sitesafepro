import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  CheckCircle2,
  Circle,
  FileText,
  AlertTriangle,
  Upload,
  XCircle,
  Rocket,
  Loader2,
  FileCheck,
} from "lucide-react";
import { F10ExemptionDialog } from "./F10ExemptionDialog";
import { ComplianceDocumentUpload } from "./ComplianceDocumentUpload";

interface ComplianceRequirement {
  id: string;
  requirement_type: string;
  status: string;
  document_id: string | null;
  not_required_reason: string | null;
  completed_at: string | null;
}

interface ProjectComplianceChecklistProps {
  projectId: string;
  projectName: string;
  onGoLive: () => void;
}

const REQUIREMENTS = [
  {
    type: "f10",
    label: "F10 Notification to HSE",
    description: "HSE notification required for notifiable construction projects under CDM 2015",
    allowExemption: true,
  },
  {
    type: "asbestos_survey",
    label: "Asbestos Refurbishment & Demolition Survey",
    description: "R&D Survey confirming asbestos status of the building/site",
    allowExemption: false,
  },
  {
    type: "asbestos_cleanliness",
    label: "Schedule of Cleanliness",
    description: "Documented schedule of cleanliness for asbestos removal works",
    allowExemption: false,
  },
  {
    type: "consignment_note",
    label: "Consignment Note for Asbestos Removal",
    description: "Waste transfer consignment note for asbestos removal and disposal",
    allowExemption: false,
  },
  {
    type: "pci",
    label: "Pre-Construction Information (PCI)",
    description: "Health & safety information for the project from the client",
    allowExemption: false,
  },
];

export const ProjectComplianceChecklist = ({
  projectId,
  projectName,
  onGoLive,
}: ProjectComplianceChecklistProps) => {
  const { user } = useAuth();
  const { organisation } = useSubscription();
  const [requirements, setRequirements] = useState<ComplianceRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [goingLive, setGoingLive] = useState(false);
  const [f10DialogOpen, setF10DialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState<string | null>(null);

  useEffect(() => {
    fetchRequirements();
  }, [projectId]);

  const fetchRequirements = async () => {
    try {
      const { data, error } = await supabase
        .from("project_compliance_requirements")
        .select("*")
        .eq("project_id", projectId);

      if (error) throw error;
      setRequirements(data || []);
    } catch (error) {
      console.error("Error fetching requirements:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRequirementStatus = (type: string) => {
    return requirements.find((r) => r.requirement_type === type);
  };

  const completedCount = REQUIREMENTS.filter((req) => {
    const status = getRequirementStatus(req.type);
    return status?.status === "uploaded" || status?.status === "not_required" || status?.status === "generated";
  }).length;

  const progress = (completedCount / REQUIREMENTS.length) * 100;
  const allComplete = completedCount === REQUIREMENTS.length;

  const handleUploadClick = (type: string) => {
    setSelectedRequirement(type);
    setUploadDialogOpen(true);
  };

  const handleF10Exemption = async (reason: string) => {
    if (!organisation || !user) return;

    try {
      const existing = getRequirementStatus("f10");
      
      if (existing) {
        const { error } = await supabase
          .from("project_compliance_requirements")
          .update({
            status: "not_required",
            not_required_reason: reason,
            completed_at: new Date().toISOString(),
            completed_by: user.id,
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("project_compliance_requirements")
          .insert({
            organisation_id: organisation.id,
            project_id: projectId,
            requirement_type: "f10",
            status: "not_required",
            not_required_reason: reason,
            completed_at: new Date().toISOString(),
            completed_by: user.id,
          });

        if (error) throw error;
      }

      toast.success("F10 marked as not required");
      fetchRequirements();
    } catch (error) {
      console.error("Error updating F10 status:", error);
      toast.error("Failed to update F10 status");
    }
  };

  const handleDocumentUploaded = async (documentId: string) => {
    if (!organisation || !user || !selectedRequirement) return;

    try {
      const existing = getRequirementStatus(selectedRequirement);
      
      if (existing) {
        const { error } = await supabase
          .from("project_compliance_requirements")
          .update({
            status: "uploaded",
            document_id: documentId,
            completed_at: new Date().toISOString(),
            completed_by: user.id,
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("project_compliance_requirements")
          .insert({
            organisation_id: organisation.id,
            project_id: projectId,
            requirement_type: selectedRequirement,
            status: "uploaded",
            document_id: documentId,
            completed_at: new Date().toISOString(),
            completed_by: user.id,
          });

        if (error) throw error;
      }

      toast.success("Document uploaded successfully");
      setUploadDialogOpen(false);
      fetchRequirements();
    } catch (error) {
      console.error("Error updating requirement:", error);
      toast.error("Failed to update requirement");
    }
  };

  const handleGoLive = async () => {
    if (!allComplete) {
      toast.error("Please complete all requirements before going live");
      return;
    }

    setGoingLive(true);
    try {
      // Update project to live status with tracking
      const { error: projectError } = await supabase
        .from("projects")
        .update({ 
          is_live: true,
          status: "active",
          went_live_at: new Date().toISOString(),
          went_live_by: user?.id,
        })
        .eq("id", projectId);

      if (projectError) throw projectError;

      toast.success("Site is now live! Generating site-specific documents...");
      onGoLive();
    } catch (error) {
      console.error("Error going live:", error);
      toast.error("Failed to go live");
    } finally {
      setGoingLive(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-xl p-6 border border-border">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl p-6 border border-border"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary" />
              Pre-Start Compliance
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Complete these requirements before the site can go live
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-foreground">
              {completedCount}/{REQUIREMENTS.length}
            </span>
            <p className="text-xs text-muted-foreground">Complete</p>
          </div>
        </div>

        <div className="mb-6">
          <Progress value={progress} className="h-2" />
        </div>

        <div className="space-y-4">
          {REQUIREMENTS.map((req, index) => {
            const status = getRequirementStatus(req.type);
            const isComplete = status?.status === "uploaded" || status?.status === "not_required" || status?.status === "generated";

            return (
              <motion.div
                key={req.type}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`
                  flex items-start gap-4 p-4 rounded-lg border transition-colors
                  ${isComplete ? "bg-success/5 border-success/20" : "bg-muted/30 border-border"}
                `}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {isComplete ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground">{req.label}</h4>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {req.description}
                  </p>
                  {status?.status === "not_required" && status.not_required_reason && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Not required: {status.not_required_reason}
                    </p>
                  )}
                  {status?.status === "uploaded" && (
                    <p className="text-xs text-success mt-2 flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      Document uploaded
                    </p>
                  )}
                </div>

                <div className="flex-shrink-0 flex items-center gap-2">
                  {!isComplete && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUploadClick(req.type)}
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        Upload
                      </Button>
                      {req.allowExemption && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setF10DialogOpen(true)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Not Required
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-6 pt-6 border-t border-border">
          <Button
            onClick={handleGoLive}
            disabled={!allComplete || goingLive}
            className="w-full"
            size="lg"
          >
            {goingLive ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Going Live...
              </>
            ) : (
              <>
                <Rocket className="h-4 w-4 mr-2" />
                Go Live & Generate Site Documents
              </>
            )}
          </Button>
          {!allComplete && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Complete all requirements to enable
            </p>
          )}
        </div>
      </motion.div>

      <F10ExemptionDialog
        open={f10DialogOpen}
        onOpenChange={setF10DialogOpen}
        onConfirm={handleF10Exemption}
      />

      <ComplianceDocumentUpload
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        projectId={projectId}
        requirementType={selectedRequirement || ""}
        onDocumentUploaded={handleDocumentUploaded}
      />
    </>
  );
};
