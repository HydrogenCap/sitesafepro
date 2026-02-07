import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProjectContractor {
  id: string;
  project_id: string;
  contractor_company_id: string;
  organisation_id: string;
  trade: string;
  scope_of_works: string | null;
  start_date: string | null;
  estimated_end_date: string | null;
  order_value: number | null;
  purchase_order_number: string | null;
  required_doc_types: string[] | null;
  status: string;
  assigned_by: string;
  created_at: string;
  contractor?: {
    id: string;
    company_name: string;
    primary_trade: string;
    compliance_status: string;
    primary_contact_name: string | null;
    primary_contact_email: string | null;
    primary_contact_phone: string | null;
  };
}

export const useProjectContractors = (projectId: string | undefined) => {
  return useQuery({
    queryKey: ["project-contractors", projectId],
    queryFn: async (): Promise<ProjectContractor[]> => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from("project_contractors")
        .select(`
          *,
          contractor:contractor_company_id (
            id,
            company_name,
            primary_trade,
            compliance_status,
            primary_contact_name,
            primary_contact_email,
            primary_contact_phone
          )
        `)
        .eq("project_id", projectId)
        .neq("status", "removed")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as ProjectContractor[];
    },
    enabled: !!projectId,
  });
};

export const useAssignContractor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      project_id: string;
      contractor_company_id: string;
      trade: string;
      scope_of_works?: string | null;
      start_date?: string | null;
      estimated_end_date?: string | null;
      purchase_order_number?: string | null;
    }) => {
      const { data: result, error } = await supabase
        .from("project_contractors")
        .insert(data as any)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["project-contractors", variables.project_id] });
      queryClient.invalidateQueries({ queryKey: ["contractor-projects"] });
      toast.success("Contractor assigned to project");
    },
    onError: (error: any) => {
      console.error("Error assigning contractor:", error);
      if (error.code === "23505") {
        toast.error("This contractor is already assigned to this project");
      } else {
        toast.error("Failed to assign contractor");
      }
    },
  });
};

export const useUpdateProjectContractor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProjectContractor> }) => {
      const { data: result, error } = await supabase
        .from("project_contractors")
        .update(data as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-contractors"] });
      queryClient.invalidateQueries({ queryKey: ["contractor-projects"] });
      toast.success("Assignment updated");
    },
    onError: (error) => {
      console.error("Error updating assignment:", error);
      toast.error("Failed to update assignment");
    },
  });
};

export const useRemoveProjectContractor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase
        .from("project_contractors")
        .update({ status: "removed" })
        .eq("id", id);

      if (error) throw error;
      return { id, projectId };
    },
    onSuccess: (variables) => {
      queryClient.invalidateQueries({ queryKey: ["project-contractors", variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ["contractor-projects"] });
      toast.success("Contractor removed from project");
    },
    onError: (error) => {
      console.error("Error removing contractor:", error);
      toast.error("Failed to remove contractor");
    },
  });
};
