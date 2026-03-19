import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { ContractorCompany, ContractorComplianceDoc, ContractorOperative, ProjectContractor, ComplianceDocType } from "@/types/contractor";

export const useContractors = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["contractors", user?.id],
    queryFn: async (): Promise<ContractorCompany[]> => {
      const { data, error } = await supabase
        .from("contractor_companies")
        .select("*")
        .order("company_name");

      if (error) throw error;
      return (data || []) as ContractorCompany[];
    },
    enabled: !!user,
  });
};

export const useContractor = (id: string | undefined) => {
  return useQuery({
    queryKey: ["contractor", id],
    queryFn: async (): Promise<ContractorCompany | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("contractor_companies")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as ContractorCompany;
    },
    enabled: !!id,
  });
};

export const useContractorComplianceDocs = (contractorId: string | undefined) => {
  return useQuery({
    queryKey: ["contractor-compliance-docs", contractorId],
    queryFn: async (): Promise<ContractorComplianceDoc[]> => {
      if (!contractorId) return [];
      const { data, error } = await supabase
        .from("contractor_compliance_docs")
        .select("*")
        .eq("contractor_company_id", contractorId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as ContractorComplianceDoc[];
    },
    enabled: !!contractorId,
  });
};

export const useContractorOperatives = (contractorId: string | undefined) => {
  return useQuery({
    queryKey: ["contractor-operatives", contractorId],
    queryFn: async (): Promise<ContractorOperative[]> => {
      if (!contractorId) return [];
      const { data, error } = await supabase
        .from("contractor_operatives")
        .select("*")
        .eq("contractor_company_id", contractorId)
        .eq("is_active", true)
        .order("full_name");

      if (error) throw error;
      return (data || []) as ContractorOperative[];
    },
    enabled: !!contractorId,
  });
};

export const useContractorProjects = (contractorId: string | undefined) => {
  return useQuery({
    queryKey: ["contractor-projects", contractorId],
    queryFn: async () => {
      if (!contractorId) return [];
      const { data, error } = await supabase
        .from("project_contractors")
        .select(`
          *,
          projects:project_id (
            id,
            name,
            address,
            status
          )
        `)
        .eq("contractor_company_id", contractorId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!contractorId,
  });
};

export const useCreateContractor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<ContractorCompany>) => {
      const { data: result, error } = await supabase
        .from("contractor_companies")
        .insert(data as any)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractors"] });
      toast.success("Contractor created successfully");
    },
    onError: (error) => {
      console.error("Error creating contractor:", error);
      toast.error("Failed to create contractor");
    },
  });
};

export const useUpdateContractor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ContractorCompany> }) => {
      const { data: result, error } = await supabase
        .from("contractor_companies")
        .update(data as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contractors"] });
      queryClient.invalidateQueries({ queryKey: ["contractor", variables.id] });
      toast.success("Contractor updated successfully");
    },
    onError: (error) => {
      console.error("Error updating contractor:", error);
      toast.error("Failed to update contractor");
    },
  });
};

export const useDeleteContractor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contractor_companies")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractors"] });
      toast.success("Contractor deleted");
    },
    onError: (error) => {
      console.error("Error deleting contractor:", error);
      toast.error("Failed to delete contractor");
    },
  });
};

export const useCreateOperative = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<ContractorOperative>) => {
      const { data: result, error } = await supabase
        .from("contractor_operatives")
        .insert(data as any)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contractor-operatives", variables.contractor_company_id] });
      toast.success("Operative added successfully");
    },
    onError: (error) => {
      console.error("Error creating operative:", error);
      toast.error("Failed to add operative");
    },
  });
};

export const useUpdateOperative = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ContractorOperative> }) => {
      const { data: result, error } = await supabase
        .from("contractor_operatives")
        .update(data as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["contractor-operatives", (result as any).contractor_company_id] });
      toast.success("Operative updated");
    },
    onError: (error) => {
      console.error("Error updating operative:", error);
      toast.error("Failed to update operative");
    },
  });
};

export const useDeleteOperative = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, contractorCompanyId }: { id: string; contractorCompanyId: string }) => {
      const { error } = await supabase
        .from("contractor_operatives")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return contractorCompanyId;
    },
    onSuccess: (contractorCompanyId) => {
      queryClient.invalidateQueries({ queryKey: ["contractor-operatives", contractorCompanyId] });
      toast.success("Operative removed");
    },
    onError: (error) => {
      console.error("Error deleting operative:", error);
      toast.error("Failed to remove operative");
    },
  });
};

export const useContractorStats = () => {
  const { data: contractors } = useContractors();

  const stats = {
    total: contractors?.filter(c => c.is_active).length || 0,
    compliant: contractors?.filter(c => c.is_active && c.compliance_status === 'compliant').length || 0,
    expiringSoon: contractors?.filter(c => c.is_active && c.compliance_status === 'expiring_soon').length || 0,
    nonCompliant: contractors?.filter(c => c.is_active && (c.compliance_status === 'expired' || c.compliance_status === 'incomplete')).length || 0,
  };

  return stats;
};
