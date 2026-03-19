import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Drawing {
  id: string;
  organisation_id: string;
  project_id: string;
  drawing_number: string;
  title: string;
  discipline: string | null;
  current_revision: string | null;
  status: string;
  scale: string | null;
  paper_size: string | null;
  file_path: string | null;
  file_name: string | null;
  issued_by: string | null;
  issued_date: string | null;
  ifc_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DrawingRevision {
  id: string;
  drawing_id: string;
  organisation_id: string;
  revision: string;
  status: string | null;
  file_path: string;
  file_name: string | null;
  issued_by: string | null;
  issued_date: string | null;
  revision_description: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
}

export interface RFI {
  id: string;
  organisation_id: string;
  project_id: string;
  rfi_number: string;
  title: string;
  description: string;
  discipline: string | null;
  priority: string;
  raised_by: string | null;
  assigned_to_name: string | null;
  assigned_to_email: string | null;
  raised_date: string | null;
  required_by: string | null;
  response_date: string | null;
  status: string;
  response: string | null;
  cost_impact: boolean;
  time_impact: boolean;
  linked_variation_id: string | null;
  linked_drawing_ids: string[] | null;
  created_at: string;
  updated_at: string;
}

export function useDrawings(projectId: string) {
  const queryClient = useQueryClient();

  const drawingsQuery = useQuery({
    queryKey: ["drawings", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drawings")
        .select("*")
        .eq("project_id", projectId)
        .order("drawing_number");
      if (error) throw error;
      return data as Drawing[];
    },
    enabled: !!projectId,
  });

  const addDrawing = useMutation({
    mutationFn: async (drawing: Omit<Drawing, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("drawings")
        .insert(drawing as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drawings", projectId] });
      toast.success("Drawing added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateDrawing = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Drawing> & { id: string }) => {
      const { error } = await supabase
        .from("drawings")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drawings", projectId] });
      toast.success("Drawing updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { drawingsQuery, addDrawing, updateDrawing };
}

export function useDrawingRevisions(drawingId: string | null) {
  return useQuery({
    queryKey: ["drawing-revisions", drawingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drawing_revisions")
        .select("*")
        .eq("drawing_id", drawingId!)
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return data as DrawingRevision[];
    },
    enabled: !!drawingId,
  });
}

export function useRFIs(projectId: string) {
  const queryClient = useQueryClient();

  const rfisQuery = useQuery({
    queryKey: ["rfis", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rfis")
        .select("*")
        .eq("project_id", projectId)
        .order("rfi_number");
      if (error) throw error;
      return data as RFI[];
    },
    enabled: !!projectId,
  });

  const addRFI = useMutation({
    mutationFn: async (rfi: Omit<RFI, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("rfis")
        .insert(rfi as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rfis", projectId] });
      toast.success("RFI created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateRFI = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RFI> & { id: string }) => {
      const { error } = await supabase
        .from("rfis")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rfis", projectId] });
      toast.success("RFI updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { rfisQuery, addRFI, updateRFI };
}
