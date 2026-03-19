import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "./useOrg";
import { toast } from "sonner";

type ExportStatus = "idle" | "pending" | "processing" | "completed" | "failed";

export function useExportPdf(versionId: string | null) {
  const { membership } = useOrg();
  const [status, setStatus] = useState<ExportStatus>("idle");
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  const fetchSignedUrl = async (eid: string) => {
    const { data } = await supabase.functions.invoke("get-signed-url", {
      body: { org_id: membership!.orgId, bucket: "exports", export_id: eid },
    });
    if (data?.signed_url) setSignedUrl(data.signed_url);
  };

  const triggerExport = useCallback(async () => {
    if (!membership?.orgId || !versionId) return;
    setStatus("pending");

    const { data, error } = await supabase.functions.invoke("export-pdf", {
      body: { org_id: membership.orgId, version_id: versionId },
    });

    if (error || !data?.export_id) {
      setStatus("failed");
      toast.error(error?.message ?? "Export failed");
      return;
    }

    if (data.status === "completed") {
      setStatus("completed");
      await fetchSignedUrl(data.export_id);
      return;
    }

    let attempts = 0;
    const poll = setInterval(async () => {
      attempts++;
      const { data: expRow } = await supabase
        .from("document_exports")
        .select("status")
        .eq("id", data.export_id)
        .single();

      if (expRow?.status === "completed") {
        clearInterval(poll);
        setStatus("completed");
        await fetchSignedUrl(data.export_id);
      } else if (expRow?.status === "failed" || attempts >= 20) {
        clearInterval(poll);
        setStatus("failed");
        toast.error("PDF generation did not complete.");
      } else {
        setStatus("processing");
      }
    }, 3000);
  }, [membership, versionId]);

  return { triggerExport, status, signedUrl };
}
