import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/hooks/useOrg";
import { toast } from "sonner";

export interface CompliancePreset {
  id: string;
  organisation_id: string;
  trade_category: string;
  required_doc_types: string[];
  min_public_liability: string | null;
  min_employers_liability: string | null;
  expiry_warning_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useCompliancePresets() {
  const { membership } = useOrg();
  const orgId = membership?.orgId;

  return useQuery({
    queryKey: ["compliance-presets", orgId],
    queryFn: async (): Promise<CompliancePreset[]> => {
      const { data, error } = await supabase
        .from("compliance_requirement_presets")
        .select("*")
        .eq("organisation_id", orgId!)
        .order("trade_category");
      if (error) throw error;
      return (data ?? []) as unknown as CompliancePreset[];
    },
    enabled: !!orgId,
  });
}

export function useUpsertPreset() {
  const queryClient = useQueryClient();
  const { membership } = useOrg();
  const orgId = membership?.orgId;

  return useMutation({
    mutationFn: async (preset: Partial<CompliancePreset> & { trade_category: string }) => {
      const payload = { ...preset, organisation_id: orgId! };
      const { data, error } = await supabase
        .from("compliance_requirement_presets")
        .upsert(payload as any, { onConflict: "organisation_id,trade_category" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compliance-presets", orgId] });
      toast.success("Compliance preset saved");
    },
    onError: (err) => {
      console.error("Error saving preset:", err);
      toast.error("Failed to save preset");
    },
  });
}

export function useDeletePreset() {
  const queryClient = useQueryClient();
  const { membership } = useOrg();
  const orgId = membership?.orgId;

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("compliance_requirement_presets")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compliance-presets", orgId] });
      toast.success("Preset deleted");
    },
    onError: (err) => {
      console.error("Error deleting preset:", err);
      toast.error("Failed to delete preset");
    },
  });
}

/** Resolve required doc types for a given trade from presets */
export function usePresetForTrade(trade: string) {
  const { data: presets } = useCompliancePresets();
  return presets?.find((p) => p.trade_category === trade && p.is_active) ?? null;
}
