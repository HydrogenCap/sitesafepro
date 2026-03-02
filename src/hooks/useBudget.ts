import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ProjectBudget {
  id: string;
  organisation_id: string;
  project_id: string;
  contract_sum: number | null;
  contract_currency: string;
  contract_type: string | null;
  approved_variations: number;
  current_contract_sum: number | null;
  anticipated_final_cost: number | null;
  contingency: number | null;
  certified_to_date: number;
  paid_to_date: number;
  created_at: string;
  updated_at: string;
}

export interface BudgetItem {
  id: string;
  organisation_id: string;
  project_id: string;
  code: string | null;
  description: string;
  category: string | null;
  budget_value: number | null;
  committed_value: number;
  certified_value: number;
  forecast_final: number | null;
  contractor_id: string | null;
  linked_task_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Variation {
  id: string;
  organisation_id: string;
  project_id: string;
  variation_number: string;
  title: string;
  description: string | null;
  type: "addition" | "omission" | "substitution";
  status: "submitted" | "under_review" | "approved" | "rejected" | "withdrawn";
  is_compensation_event: boolean;
  early_warning_reference: string | null;
  quoted_value: number | null;
  agreed_value: number | null;
  time_impact_days: number;
  submitted_date: string | null;
  approved_date: string | null;
  submitted_by: string | null;
  approved_by: string | null;
  linked_task_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentApplication {
  id: string;
  organisation_id: string;
  project_id: string;
  application_number: number;
  valuation_date: string;
  submission_date: string | null;
  due_date: string | null;
  gross_value: number | null;
  retention: number | null;
  net_value: number | null;
  previous_certified: number | null;
  this_application: number | null;
  certified_value: number | null;
  certified_date: string | null;
  paid_value: number | null;
  paid_date: string | null;
  status: "draft" | "submitted" | "certified" | "disputed" | "paid";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ---- Budget ----
export const useBudget = (projectId: string | undefined) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["project-budget", projectId],
    queryFn: async (): Promise<ProjectBudget | null> => {
      const { data, error } = await supabase
        .from("project_budget")
        .select("*")
        .eq("project_id", projectId!)
        .maybeSingle();
      if (error) throw error;
      return data as ProjectBudget | null;
    },
    enabled: !!user && !!projectId,
  });
};

export const useUpsertBudget = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (budget: Partial<ProjectBudget> & { project_id: string; organisation_id: string }) => {
      const { data, error } = await supabase
        .from("project_budget")
        .upsert(budget as any, { onConflict: "project_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["project-budget", data.project_id] });
      toast.success("Budget updated");
    },
    onError: (err: any) => toast.error(err.message || "Failed to update budget"),
  });
};

// ---- Budget Items ----
export const useBudgetItems = (projectId: string | undefined) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["budget-items", projectId],
    queryFn: async (): Promise<BudgetItem[]> => {
      const { data, error } = await supabase
        .from("budget_items")
        .select("*")
        .eq("project_id", projectId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as BudgetItem[];
    },
    enabled: !!user && !!projectId,
  });
};

export const useCreateBudgetItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: Partial<BudgetItem> & { project_id: string; organisation_id: string; description: string }) => {
      const { data, error } = await supabase
        .from("budget_items")
        .insert(item as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["budget-items", data.project_id] });
      toast.success("Budget item added");
    },
    onError: (err: any) => toast.error(err.message || "Failed to add budget item"),
  });
};

export const useUpdateBudgetItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId, ...updates }: { id: string; projectId: string } & Partial<BudgetItem>) => {
      const { error } = await supabase
        .from("budget_items")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
      return { projectId };
    },
    onSuccess: ({ projectId }) => {
      qc.invalidateQueries({ queryKey: ["budget-items", projectId] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to update budget item"),
  });
};

export const useDeleteBudgetItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase
        .from("budget_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return { projectId };
    },
    onSuccess: ({ projectId }) => {
      qc.invalidateQueries({ queryKey: ["budget-items", projectId] });
      toast.success("Budget item deleted");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete budget item"),
  });
};

// ---- Variations ----
export const useVariations = (projectId: string | undefined) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["variations", projectId],
    queryFn: async (): Promise<Variation[]> => {
      const { data, error } = await supabase
        .from("variations")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Variation[];
    },
    enabled: !!user && !!projectId,
  });
};

export const useCreateVariation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: Partial<Variation> & { project_id: string; organisation_id: string; variation_number: string; title: string }) => {
      const { data, error } = await supabase
        .from("variations")
        .insert(v as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["variations", data.project_id] });
      toast.success("Variation created");
    },
    onError: (err: any) => toast.error(err.message || "Failed to create variation"),
  });
};

export const useUpdateVariation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId, ...updates }: { id: string; projectId: string } & Partial<Variation>) => {
      const { error } = await supabase
        .from("variations")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
      return { projectId };
    },
    onSuccess: ({ projectId }) => {
      qc.invalidateQueries({ queryKey: ["variations", projectId] });
      toast.success("Variation updated");
    },
    onError: (err: any) => toast.error(err.message || "Failed to update variation"),
  });
};

// ---- Payment Applications ----
export const usePaymentApplications = (projectId: string | undefined) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["payment-applications", projectId],
    queryFn: async (): Promise<PaymentApplication[]> => {
      const { data, error } = await supabase
        .from("payment_applications")
        .select("*")
        .eq("project_id", projectId!)
        .order("application_number", { ascending: true });
      if (error) throw error;
      return (data || []) as PaymentApplication[];
    },
    enabled: !!user && !!projectId,
  });
};

export const useCreatePaymentApplication = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pa: Partial<PaymentApplication> & { project_id: string; organisation_id: string; application_number: number; valuation_date: string }) => {
      const { data, error } = await supabase
        .from("payment_applications")
        .insert(pa as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["payment-applications", data.project_id] });
      toast.success("Payment application created");
    },
    onError: (err: any) => toast.error(err.message || "Failed to create payment application"),
  });
};

export const useUpdatePaymentApplication = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId, ...updates }: { id: string; projectId: string } & Partial<PaymentApplication>) => {
      const { error } = await supabase
        .from("payment_applications")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
      return { projectId };
    },
    onSuccess: ({ projectId }) => {
      qc.invalidateQueries({ queryKey: ["payment-applications", projectId] });
      toast.success("Payment application updated");
    },
    onError: (err: any) => toast.error(err.message || "Failed to update payment application"),
  });
};
