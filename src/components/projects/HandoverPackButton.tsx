import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileDown, Loader2, CheckCircle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradePromptWrapper } from "@/components/upgrade";

interface HandoverPackButtonProps {
  projectId: string;
  projectName: string;
  projectStatus: string;
  orgId?: string;
}

export const HandoverPackButton = ({
  projectId,
  projectName,
  projectStatus,
  orgId,
}: HandoverPackButtonProps) => {
  const { canAccess } = useSubscription();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [existingExportId, setExistingExportId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  // Check for existing handover pack
  useEffect(() => {
    const check = async () => {
      if (!orgId) return;
      const { data } = await supabase
        .from("document_exports")
        .select("id, status, storage_path")
        .eq("project_id", projectId)
        .eq("export_type", "handover_pack")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setExistingExportId(data.id);
    };
    check();
  }, [projectId, orgId]);

  const handleGenerate = async () => {
    if (!orgId) {
      toast.error("Organisation not found");
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-handover-pack", {
        body: { org_id: orgId, project_id: projectId },
      });
      if (error) throw error;
      if (data?.ok) {
        setExistingExportId(data.export_id);
        toast.success("Handover pack generated successfully");
        setDialogOpen(false);
        // Auto-download after generation
        await downloadExport(data.export_id);
      } else {
        throw new Error(data?.error || "Generation failed");
      }
    } catch (err: any) {
      console.error("Handover pack error:", err);
      toast.error("Failed to generate handover pack");
    } finally {
      setGenerating(false);
    }
  };

  const downloadExport = async (exportId: string) => {
    if (!orgId) return;
    setDownloading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-signed-url", {
        body: { bucket: "exports", export_id: exportId, org_id: orgId },
      });
      if (error) throw error;
      if (data?.signed_url) {
        const response = await fetch(data.signed_url);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${projectName.replace(/[^a-zA-Z0-9]/g, "_")}_Handover_Pack.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Download error:", err);
      toast.error("Failed to download handover pack");
    } finally {
      setDownloading(false);
    }
  };

  const handleDownload = () => {
    if (existingExportId) downloadExport(existingExportId);
  };

  // Only show for completed projects or admin roles
  const showButton = projectStatus === "completed" || projectStatus === "active";
  if (!showButton) return null;

  const sections = [
    "Cover Page — project details, client, dates",
    "Project Summary — document counts, action stats",
    "Document Register — all uploaded documents",
    "Inspection History — dates, types, scores",
    "Incident Log — incidents with RIDDOR status",
    "Corrective Actions — open & closed actions",
  ];

  return (
    <>
      <UpgradePromptWrapper feature="handover_pack">
        {existingExportId ? (
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading}>
            {downloading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <FileDown className="h-4 w-4 mr-1" />}
            Handover Pack
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
            <Package className="h-4 w-4 mr-1" />
            Handover Pack
          </Button>
        )}
      </UpgradePromptWrapper>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Handover Pack</DialogTitle>
            <DialogDescription>
              Assemble a CDM Health & Safety File PDF for{" "}
              <span className="font-medium text-foreground">{projectName}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <p className="text-sm font-medium text-foreground mb-2">The pack will include:</p>
            {sections.map((s) => (
              <div key={s} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                <span>{s}</span>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={generating}>
              Cancel
            </Button>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Generating…
                </>
              ) : (
                <>
                  <Package className="h-4 w-4 mr-2" />
                  Generate Pack
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
