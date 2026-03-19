import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProcurementItem {
  id: string;
  organisation_id: string;
  project_id: string;
  description: string;
  category: string | null;
  supplier_name: string | null;
  contractor_id: string | null;
  design_info_required_date: string | null;
  order_date: string | null;
  lead_time_weeks: number | null;
  required_on_site_date: string | null;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  budget_value: number | null;
  order_value: number | null;
  purchase_order_number: string | null;
  status: string;
  notes: string | null;
  linked_task_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useProcurement(projectId: string) {
  const queryClient = useQueryClient();

  const itemsQuery = useQuery({
    queryKey: ["procurement", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("procurement_items")
        .select("*")
        .eq("project_id", projectId)
        .order("required_on_site_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as ProcurementItem[];
    },
    enabled: !!projectId,
  });

  const addItem = useMutation({
    mutationFn: async (item: Omit<ProcurementItem, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("procurement_items")
        .insert(item as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procurement", projectId] });
      toast.success("Procurement item added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProcurementItem> & { id: string }) => {
      const { error } = await supabase
        .from("procurement_items")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procurement", projectId] });
      toast.success("Procurement item updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("procurement_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procurement", projectId] });
      toast.success("Item removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { itemsQuery, addItem, updateItem, deleteItem };
}
