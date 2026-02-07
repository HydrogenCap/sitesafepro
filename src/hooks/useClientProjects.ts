import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClientPortal } from "@/contexts/ClientPortalContext";

interface ProjectStats {
  documentCount: number;
  acknowledgedCount: number;
  openActions: number;
  overdueActions: number;
  lastWorkforceCount: number;
  lastWorkforceDate: string | null;
  diaryMissingDays: number;
  ramsApproved: number;
  ramsTotal: number;
}

interface ClientProject {
  id: string;
  name: string;
  address: string | null;
  status: string | null;
  is_live: boolean;
  client_name: string | null;
  start_date: string | null;
  estimated_end_date: string | null;
  image_url: string | null;
  complianceScore: number;
  stats: ProjectStats;
}

export const useClientProjects = () => {
  const { clientUser } = useClientPortal();

  return useQuery({
    queryKey: ["client-projects", clientUser?.id],
    queryFn: async (): Promise<ClientProject[]> => {
      if (!clientUser) return [];

      // Fetch projects based on client access
      let query = supabase
        .from("projects")
        .select("*")
        .eq("organisation_id", clientUser.organisation_id);

      // If client has specific project access, filter
      if (clientUser.project_ids && clientUser.project_ids.length > 0) {
        query = query.in("id", clientUser.project_ids);
      }

      const { data: projects, error } = await query;

      if (error) throw error;
      if (!projects) return [];

      // Fetch stats for each project
      const projectsWithStats = await Promise.all(
        projects.map(async (project) => {
          // Get document stats
          const { count: docCount } = await supabase
            .from("documents")
            .select("*", { count: "exact", head: true })
            .eq("project_id", project.id);

          const { count: ackCount } = await supabase
            .from("document_acknowledgements")
            .select("*, documents!inner(project_id)", { count: "exact", head: true })
            .eq("documents.project_id", project.id);

          // Get action stats
          const { data: actions } = await supabase
            .from("corrective_actions")
            .select("status, due_date")
            .eq("project_id", project.id)
            .in("status", ["open", "in_progress"]);

          const openActions = actions?.length || 0;
          const overdueActions = actions?.filter(
            (a) => new Date(a.due_date) < new Date() && a.status !== "closed"
          ).length || 0;

          // Get RAMS stats
          const { count: ramsTotal } = await supabase
            .from("rams_records")
            .select("*", { count: "exact", head: true })
            .eq("project_id", project.id);

          const { count: ramsApproved } = await supabase
            .from("rams_records")
            .select("*", { count: "exact", head: true })
            .eq("project_id", project.id)
            .eq("status", "approved");

          // Get latest diary entry for workforce
          const { data: diaryEntry } = await supabase
            .from("site_diary_entries")
            .select("entry_date, workforce_entries")
            .eq("project_id", project.id)
            .order("entry_date", { ascending: false })
            .limit(1)
            .maybeSingle();

          // Count missing diary days (last 14 days)
          const today = new Date();
          const fourteenDaysAgo = new Date(today);
          fourteenDaysAgo.setDate(today.getDate() - 14);

          const { count: diaryCount } = await supabase
            .from("site_diary_entries")
            .select("*", { count: "exact", head: true })
            .eq("project_id", project.id)
            .gte("entry_date", fourteenDaysAgo.toISOString().split("T")[0]);

          const expectedDays = 10; // Assume 10 working days in 14 calendar days
          const diaryMissingDays = Math.max(0, expectedDays - (diaryCount || 0));

          // Calculate workforce count from JSONB
          let lastWorkforceCount = 0;
          if (diaryEntry?.workforce_entries) {
            const entries = diaryEntry.workforce_entries as any[];
            lastWorkforceCount = entries.reduce((sum, e) => sum + (e.count || 0), 0);
          }

          // Calculate compliance score
          const docScore = docCount ? ((ackCount || 0) / docCount) * 100 : 100;
          const actionScore = overdueActions === 0 ? 100 : Math.max(0, 100 - overdueActions * 20);
          const ramsScore = ramsTotal ? ((ramsApproved || 0) / ramsTotal) * 100 : 100;
          const diaryScore = Math.max(0, 100 - diaryMissingDays * 10);

          const complianceScore = (docScore + actionScore + ramsScore + diaryScore) / 4;

          return {
            ...project,
            complianceScore,
            stats: {
              documentCount: docCount || 0,
              acknowledgedCount: ackCount || 0,
              openActions,
              overdueActions,
              lastWorkforceCount,
              lastWorkforceDate: diaryEntry?.entry_date || null,
              diaryMissingDays,
              ramsApproved: ramsApproved || 0,
              ramsTotal: ramsTotal || 0,
            },
          };
        })
      );

      return projectsWithStats;
    },
    enabled: !!clientUser,
  });
};
