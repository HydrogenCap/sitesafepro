import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "./useOrg";
import { toast } from "sonner";

type WorkflowAction = "request_review" | "approve" | "reject" | "create_version";

export function useWorkflowActions(onSuccess?: () => void) {
  const { membership } = useOrg();
  const [loading, setLoading] = useState<WorkflowAction | null>(null);

  const perform = async (action: WorkflowAction, payload: Record<string, unknown>) => {
    if (!membership?.orgId) return false;
    setLoading(action);

    try {
      const fnMap: Record<WorkflowAction, string> = {
        request_review: "request-review",
        approve: "approve-document",
        reject: "reject-document",
        create_version: "create-version",
      };

      const { data, error } = await supabase.functions.invoke(fnMap[action], {
        body: { org_id: membership.orgId, ...payload },
      });

      if (error || !data?.ok) {
        const msg = data?.error ?? error?.message ?? "Action failed";
        const valErrors = data?.validation_errors as string[] | undefined;
        toast.error(valErrors ? valErrors.join(". ") : msg);
        return false;
      }

      toast.success(`Document ${action.replace(/_/g, " ")} completed.`);
      onSuccess?.();
      return true;
    } finally {
      setLoading(null);
    }
  };

  return { perform, loading };
}
