import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { GanttChart, AlertTriangle, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface TaskStats {
  project_id: string;
  project_name: string;
  total: number;
  complete: number;
  delayed: number;
  at_risk: number;
  in_progress: number;
  avg_progress: number;
}

export function ProgrammeHealthWidget() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["programme-health-dashboard"],
    queryFn: async () => {
      // Get all active projects
      const { data: projects } = await supabase
        .from("projects")
        .select("id, name")
        .in("status", ["active", "setup"]);

      if (!projects?.length) return [];

      const projectIds = projects.map((p) => p.id);

      // Get programme tasks for those projects
      const { data: tasks } = await supabase
        .from("programme_tasks")
        .select("project_id, status, progress")
        .in("project_id", projectIds);

      if (!tasks?.length) return [];

      // Aggregate per project
      const map = new Map<string, TaskStats>();
      for (const p of projects) {
        map.set(p.id, {
          project_id: p.id,
          project_name: p.name,
          total: 0,
          complete: 0,
          delayed: 0,
          at_risk: 0,
          in_progress: 0,
          avg_progress: 0,
        });
      }

      for (const t of tasks) {
        const s = map.get(t.project_id);
        if (!s) continue;
        s.total++;
        if (t.status === "complete") s.complete++;
        else if (t.status === "delayed") s.delayed++;
        else if (t.status === "at_risk") s.at_risk++;
        else if (t.status === "in_progress") s.in_progress++;
        s.avg_progress += (t.progress ?? 0);
      }

      const result: TaskStats[] = [];
      for (const s of map.values()) {
        if (s.total === 0) continue;
        s.avg_progress = Math.round(s.avg_progress / s.total);
        result.push(s);
      }

      return result;
    },
  });

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl p-6 border border-border">
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-48 bg-muted rounded" />
          <div className="h-20 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!stats?.length) return null;

  const totalDelayed = stats.reduce((a, s) => a + s.delayed, 0);
  const totalAtRisk = stats.reduce((a, s) => a + s.at_risk, 0);
  const totalComplete = stats.reduce((a, s) => a + s.complete, 0);
  const totalTasks = stats.reduce((a, s) => a + s.total, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <GanttChart className="h-5 w-5 text-primary" />
          Programme Health
        </h3>
        <div className="flex gap-3 text-xs">
          {totalDelayed > 0 && (
            <span className="flex items-center gap-1 text-destructive font-medium">
              <AlertTriangle className="h-3.5 w-3.5" /> {totalDelayed} delayed
            </span>
          )}
          {totalAtRisk > 0 && (
            <span className="flex items-center gap-1 text-amber-600 font-medium">
              <Clock className="h-3.5 w-3.5" /> {totalAtRisk} at risk
            </span>
          )}
          <span className="flex items-center gap-1 text-muted-foreground">
            <CheckCircle className="h-3.5 w-3.5" /> {totalComplete}/{totalTasks} complete
          </span>
        </div>
      </div>

      <div className="grid gap-3">
        {stats.map((s) => {
          const health = s.delayed > 0 ? "delayed" : s.at_risk > 0 ? "at_risk" : "on_track";
          return (
            <Link
              key={s.project_id}
              to={`/projects/${s.project_id}`}
              className="bg-card rounded-xl p-4 border border-border hover:border-primary/30 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-foreground text-sm truncate mr-4">
                  {s.project_name}
                </span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    health === "delayed"
                      ? "bg-destructive/10 text-destructive"
                      : health === "at_risk"
                      ? "bg-amber-500/10 text-amber-600"
                      : "bg-success/10 text-success"
                  }`}
                >
                  {health === "delayed" ? "Delayed" : health === "at_risk" ? "At Risk" : "On Track"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Progress value={s.avg_progress} className="flex-1 h-2" />
                <span className="text-xs text-muted-foreground w-10 text-right">{s.avg_progress}%</span>
              </div>
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                <span>{s.complete} done</span>
                <span>{s.in_progress} active</span>
                {s.delayed > 0 && <span className="text-destructive">{s.delayed} delayed</span>}
                {s.at_risk > 0 && <span className="text-amber-600">{s.at_risk} at risk</span>}
              </div>
            </Link>
          );
        })}
      </div>
    </motion.div>
  );
}
