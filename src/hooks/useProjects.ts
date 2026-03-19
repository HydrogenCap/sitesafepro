import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Project {
  id: string;
  name: string;
  address: string | null;
  client_name: string | null;
  status: "setup" | "active" | "completed" | "archived";
  start_date: string | null;
  estimated_end_date: string | null;
  created_at: string;
  image_url: string | null;
  is_live: boolean | null;
}

export const useProjects = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["projects", user?.id],
    queryFn: async (): Promise<Project[]> => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);

      if (error) throw error;
      return projectId;
    },
    onMutate: async (projectId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["projects"] });

      // Snapshot the previous value
      const previousProjects = queryClient.getQueryData<Project[]>(["projects"]);

      // Optimistically remove the project
      queryClient.setQueryData<Project[]>(["projects"], (old) =>
        old?.filter((project) => project.id !== projectId) ?? []
      );

      return { previousProjects };
    },
    onSuccess: () => {
      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project deleted");
    },
    onError: (error, _projectId, context) => {
      // Rollback on error
      if (context?.previousProjects) {
        queryClient.setQueryData(["projects"], context.previousProjects);
      }
      console.error("Error deleting project:", error);
      toast.error("Failed to delete project");
    },
  });
};

export const useArchiveProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase
        .from("projects")
        .update({ status: "archived" })
        .eq("id", projectId);

      if (error) throw error;
      return projectId;
    },
    onMutate: async (projectId) => {
      await queryClient.cancelQueries({ queryKey: ["projects"] });

      const previousProjects = queryClient.getQueryData<Project[]>(["projects"]);

      queryClient.setQueryData<Project[]>(["projects"], (old) =>
        old?.map((project) =>
          project.id === projectId
            ? { ...project, status: "archived" as const }
            : project
        ) ?? []
      );

      return { previousProjects };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project archived");
    },
    onError: (error, _projectId, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(["projects"], context.previousProjects);
      }
      console.error("Error archiving project:", error);
      toast.error("Failed to archive project");
    },
  });
};
