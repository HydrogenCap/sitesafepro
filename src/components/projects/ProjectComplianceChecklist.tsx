import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Rocket, Loader2, FileCheck } from "lucide-react";
import { F10ExemptionDialog } from "./F10ExemptionDialog";
import { ComplianceDocumentUpload } from "./ComplianceDocumentUpload";
import {
  RequirementCard,
  RequirementStatus,
  GoLiveConfirmDialog,
  ConfirmSubmissionDialog,
  AsbestosExemptionDialog,
  COMPLIANCE_REQUIREMENTS,
  getExemptionReasonForType,
} from "./compliance";
import { generateGoLiveDocuments } from "@/hooks/useGoLiveDocuments";

interface ProjectComplianceChecklistProps {
  projectId: string;
  projectName: string;
  onGoLive: () => void;
}

export const ProjectComplianceChecklist = ({
  projectId,
  projectName,
  onGoLive,
}: ProjectComplianceChecklistProps) => {
  const { user } = useAuth();
  const { organisation } = useSubscription();
  const [requirements, setRequirements] = useState<RequirementStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [goingLive, setGoingLive] = useState(false);

  // Dialog states
  const [f10DialogOpen, setF10DialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [goLiveDialogOpen, setGoLiveDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [asbestosExemptDialogOpen, setAsbestosExemptDialogOpen] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState<string | null>(null);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    title: string;
    description: string;
    requiresDate?: boolean;
    requiresReference?: boolean;
    requiresNotes?: boolean;
    notesLabel?: string;
    notesPlaceholder?: string;
  } | null>(null);

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

  const getRequirementStatus = (type: string): RequirementStatus | undefined => {
    return requirements.find((r) => r.requirement_type === type);
  };

  const completedCount = COMPLIANCE_REQUIREMENTS.filter((req) => {
    const status = getRequirementStatus(req.type);
    return (
      status?.status === "uploaded" ||
      status?.status === "not_required" ||
      status?.status === "generated" ||
      status?.status === "confirmed"
    );
  }).length;

  const progress = (completedCount / COMPLIANCE_REQUIREMENTS.length) * 100;
  const allComplete = completedCount === COMPLIANCE_REQUIREMENTS.length;

  const handleUploadClick = (type: string) => {
    setSelectedRequirement(type);
    setUploadDialogOpen(true);
  };

  const handleExemptClick = (type: string) => {
    setSelectedRequirement(type);
    if (type === "f10") {
      setF10DialogOpen(true);
    } else if (type === "asbestos_survey") {
      setAsbestosExemptDialogOpen(true);
    } else {
      // Generic exemption - mark as not required directly
      handleGenericExemption(type);
    }
  };

  const handleConfirmClick = (type: string) => {
    setSelectedRequirement(type);
    if (type === "f10") {
      setConfirmDialogConfig({
        title: "Confirm F10 Submission",
        description: "Confirm that the F10 notification has been submitted to HSE",
        requiresDate: true,
        requiresReference: true,
      });
    } else if (type === "pci") {
      setConfirmDialogConfig({
        title: "Confirm PCI Received",
        description:
          "Confirm that Pre-Construction Information has been received and reviewed",
        requiresNotes: true,
        notesLabel: "How was PCI provided?",
        notesPlaceholder:
          "e.g. Incorporated into project brief, provided via email correspondence, included in tender documents...",
      });
    }
    setConfirmDialogOpen(true);
  };

  const handleGenericExemption = async (type: string) => {
    if (!organisation || !user) return;

    try {
      const reason = getExemptionReasonForType(type);
      const existing = getRequirementStatus(type);

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
            requirement_type: type,
            status: "not_required",
            not_required_reason: reason,
            completed_at: new Date().toISOString(),
            completed_by: user.id,
          });

        if (error) throw error;
      }

      toast.success("Marked as not required");
      fetchRequirements();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
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

  const handleAsbestosExemption = async (reason: string) => {
    if (!organisation || !user) return;

    try {
      const existing = getRequirementStatus("asbestos_survey");

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
            requirement_type: "asbestos_survey",
            status: "not_required",
            not_required_reason: reason,
            completed_at: new Date().toISOString(),
            completed_by: user.id,
          });

        if (error) throw error;
      }

      toast.success("Asbestos survey marked as not applicable");
      fetchRequirements();
    } catch (error) {
      console.error("Error updating asbestos status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleConfirmSubmission = async (data: {
    date?: string;
    reference?: string;
    notes?: string;
  }) => {
    if (!organisation || !user || !selectedRequirement) return;

    try {
      const notes = [
        data.date && `Submitted: ${data.date}`,
        data.reference && `Reference: ${data.reference}`,
        data.notes,
      ]
        .filter(Boolean)
        .join(" | ");

      const existing = getRequirementStatus(selectedRequirement);

      if (existing) {
        const { error } = await supabase
          .from("project_compliance_requirements")
          .update({
            status: "confirmed",
            not_required_reason: notes,
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
            status: "confirmed",
            not_required_reason: notes,
            completed_at: new Date().toISOString(),
            completed_by: user.id,
          });

        if (error) throw error;
      }

      toast.success("Confirmed successfully");
      fetchRequirements();
    } catch (error) {
      console.error("Error confirming:", error);
      toast.error("Failed to confirm");
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
    if (!allComplete || !organisation || !user) {
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
          went_live_by: user.id,
        })
        .eq("id", projectId);

      if (projectError) throw projectError;

      // Generate documents from templates
      const result = await generateGoLiveDocuments(projectId, organisation.id, user.id);
      
      if (result.errors.length > 0) {
        console.warn("Some documents failed to generate:", result.errors);
      }

      setGoLiveDialogOpen(false);
      
      if (result.documentsGenerated > 0) {
        toast.success(`Site is now live! ${result.documentsGenerated} document${result.documentsGenerated !== 1 ? 's' : ''} generated.`);
      } else {
        toast.success("Site is now live!");
      }
      
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
              Pre-Construction Checklist
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Complete these items before the site can go live
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-foreground">
              {completedCount}/{COMPLIANCE_REQUIREMENTS.length}
            </span>
            <p className="text-xs text-muted-foreground">Complete</p>
          </div>
        </div>

        <div className="mb-6">
          <Progress value={progress} className="h-2" />
        </div>

        <div className="space-y-3">
          {COMPLIANCE_REQUIREMENTS.map((req, index) => (
            <RequirementCard
              key={req.type}
              requirement={req}
              status={getRequirementStatus(req.type)}
              index={index}
              onUpload={() => handleUploadClick(req.type)}
              onExempt={() => handleExemptClick(req.type)}
              onConfirm={
                req.actions.some((a) => a.type === "confirm")
                  ? () => handleConfirmClick(req.type)
                  : undefined
              }
            />
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-border">
          <Button
            onClick={() => setGoLiveDialogOpen(true)}
            disabled={!allComplete}
            className="w-full"
            size="lg"
          >
            <Rocket className="h-4 w-4 mr-2" />
            Go Live & Generate Site Documents
          </Button>
          {!allComplete && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Complete all {COMPLIANCE_REQUIREMENTS.length - completedCount} remaining
              item{COMPLIANCE_REQUIREMENTS.length - completedCount !== 1 ? "s" : ""} to
              enable
            </p>
          )}
        </div>
      </motion.div>

      {/* Dialogs */}
      <F10ExemptionDialog
        open={f10DialogOpen}
        onOpenChange={setF10DialogOpen}
        onConfirm={handleF10Exemption}
      />

      <AsbestosExemptionDialog
        open={asbestosExemptDialogOpen}
        onOpenChange={setAsbestosExemptDialogOpen}
        onConfirm={handleAsbestosExemption}
      />

      <ComplianceDocumentUpload
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        projectId={projectId}
        requirementType={selectedRequirement || ""}
        onDocumentUploaded={handleDocumentUploaded}
      />

      <GoLiveConfirmDialog
        open={goLiveDialogOpen}
        onOpenChange={setGoLiveDialogOpen}
        projectName={projectName}
        onConfirm={handleGoLive}
        isLoading={goingLive}
      />

      {confirmDialogConfig && (
        <ConfirmSubmissionDialog
          open={confirmDialogOpen}
          onOpenChange={setConfirmDialogOpen}
          title={confirmDialogConfig.title}
          description={confirmDialogConfig.description}
          requiresDate={confirmDialogConfig.requiresDate}
          requiresReference={confirmDialogConfig.requiresReference}
          requiresNotes={confirmDialogConfig.requiresNotes}
          notesLabel={confirmDialogConfig.notesLabel}
          notesPlaceholder={confirmDialogConfig.notesPlaceholder}
          onConfirm={handleConfirmSubmission}
        />
      )}
    </>
  );
};
