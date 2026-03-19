import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ProgrammeTask {
  id: string;
  organisation_id: string;
  project_id: string;
  parent_id: string | null;
  title: string;
  description: string | null;
  task_type: "task" | "milestone" | "summary";
  baseline_start: string | null;
  baseline_finish: string | null;
  planned_start: string;
  planned_finish: string;
  actual_start: string | null;
  actual_finish: string | null;
  progress: number;
  status: "not_started" | "in_progress" | "complete" | "delayed" | "at_risk";
  trade: string | null;
  is_critical: boolean;
  sort_order: number;
  early_start: string | null;
  late_finish: string | null;
  constraint_type: string | null;
  constraint_date: string | null;
  assigned_contractor_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProgrammeDependency {
  id: string;
  organisation_id: string;
  from_task_id: string;
  to_task_id: string;
  type: "FS" | "SS" | "FF" | "SF";
  lag: number;
}

export const useProgrammeTasks = (projectId: string | undefined) => {
  const { user } = useAuth();

  const tasksQuery = useQuery({
    queryKey: ["programme-tasks", projectId],
    queryFn: async (): Promise<ProgrammeTask[]> => {
      const { data, error } = await supabase
        .from("programme_tasks")
        .select("*")
        .eq("project_id", projectId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as ProgrammeTask[];
    },
    enabled: !!user && !!projectId,
  });

  const dependenciesQuery = useQuery({
    queryKey: ["programme-dependencies", projectId],
    queryFn: async (): Promise<ProgrammeDependency[]> => {
      if (!projectId) return [];
      // Get task IDs for this project first
      const { data: tasks } = await supabase
        .from("programme_tasks")
        .select("id")
        .eq("project_id", projectId);
      if (!tasks || tasks.length === 0) return [];
      const taskIds = tasks.map((t) => t.id);
      const { data, error } = await supabase
        .from("programme_dependencies")
        .select("*")
        .in("from_task_id", taskIds);
      if (error) throw error;
      return (data || []) as ProgrammeDependency[];
    },
    enabled: !!user && !!projectId,
  });

  return { tasksQuery, dependenciesQuery };
};

export const useCreateProgrammeTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (task: Partial<ProgrammeTask> & { project_id: string; organisation_id: string; title: string; planned_start: string; planned_finish: string }) => {
      const { data, error } = await supabase
        .from("programme_tasks")
        .insert(task as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["programme-tasks", data.project_id] });
      toast.success("Task created");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create task");
    },
  });
};

export const useUpdateProgrammeTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId, ...updates }: { id: string; projectId: string } & Partial<ProgrammeTask>) => {
      const { error } = await supabase
        .from("programme_tasks")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
      return { id, projectId };
    },
    onSuccess: ({ projectId }) => {
      qc.invalidateQueries({ queryKey: ["programme-tasks", projectId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update task");
    },
  });
};

export const useDeleteProgrammeTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase
        .from("programme_tasks")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return { projectId };
    },
    onSuccess: ({ projectId }) => {
      qc.invalidateQueries({ queryKey: ["programme-tasks", projectId] });
      toast.success("Task deleted");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete task");
    },
  });
};
