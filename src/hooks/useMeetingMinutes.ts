import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface MeetingMinutes {
  id: string;
  project_id: string;
  organisation_id: string;
  meeting_number: number;
  title: string;
  meeting_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  meeting_type: string;
  chairperson: string | null;
  minute_taker: string | null;
  attendees: { name: string; company: string; role?: string }[];
  apologies: { name: string; company: string }[];
  distribution: { name: string; email?: string }[];
  agenda_items: { ref: string; topic: string; discussion: string; action?: string; owner?: string; due?: string }[];
  general_notes: string | null;
  next_meeting_date: string | null;
  next_meeting_location: string | null;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useMeetingMinutes(projectId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["meeting-minutes", projectId];

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meeting_minutes")
        .select("*")
        .eq("project_id", projectId)
        .order("meeting_number", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as MeetingMinutes[];
    },
    enabled: !!projectId,
  });

  const addMeeting = useMutation({
    mutationFn: async (input: Partial<MeetingMinutes>) => {
      // Get next meeting number
      const { data: existing } = await supabase
        .from("meeting_minutes")
        .select("meeting_number")
        .eq("project_id", projectId)
        .order("meeting_number", { ascending: false })
        .limit(1);
      const nextNum = (existing?.[0]?.meeting_number ?? 0) + 1;

      const { data, error } = await supabase
        .from("meeting_minutes")
        .insert({
          project_id: projectId,
          meeting_number: nextNum,
          title: input.title!,
          meeting_date: input.meeting_date!,
          start_time: input.start_time || null,
          end_time: input.end_time || null,
          location: input.location || null,
          meeting_type: input.meeting_type || "progress",
          chairperson: input.chairperson || null,
          minute_taker: input.minute_taker || null,
          attendees: input.attendees || [],
          apologies: input.apologies || [],
          agenda_items: input.agenda_items || [],
          general_notes: input.general_notes || null,
          next_meeting_date: input.next_meeting_date || null,
          next_meeting_location: input.next_meeting_location || null,
          created_by: user!.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Meeting minutes created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMeeting = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MeetingMinutes> & { id: string }) => {
      const { error } = await supabase
        .from("meeting_minutes")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Meeting minutes updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMeeting = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("meeting_minutes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Meeting minutes deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { ...query, meetings: query.data || [], addMeeting, updateMeeting, deleteMeeting };
}
