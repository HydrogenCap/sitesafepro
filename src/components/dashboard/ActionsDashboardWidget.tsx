import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, ChevronRight, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { startOfToday, isBefore } from "date-fns";

interface ActionStats {
  open: number;
  overdue: number;
  criticalOverdue: number;
}

export function ActionsDashboardWidget() {
  const { organisation, tier } = useSubscription();
  const [stats, setStats] = useState<ActionStats>({ open: 0, overdue: 0, criticalOverdue: 0 });
  const [loading, setLoading] = useState(true);

  // Check if user has access (Professional+ tier)
  const hasAccess = tier === "professional" || tier === "enterprise" || tier === "trial";

  useEffect(() => {
    const fetchStats = async () => {
      if (!organisation?.id || !hasAccess) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("corrective_actions")
          .select("status, priority, due_date")
          .eq("organisation_id", organisation.id)
          .neq("status", "closed");

        if (error) throw error;

        const today = startOfToday();
        const actions = data || [];

        const openCount = actions.filter(
          (a) => a.status === "open" || a.status === "in_progress"
        ).length;

        const overdueCount = actions.filter(
          (a) =>
            a.status !== "awaiting_verification" &&
            isBefore(new Date(a.due_date), today)
        ).length;

        const criticalOverdueCount = actions.filter(
          (a) =>
            a.priority === "critical" &&
            a.status !== "awaiting_verification" &&
            isBefore(new Date(a.due_date), today)
        ).length;

        setStats({
          open: openCount,
          overdue: overdueCount,
          criticalOverdue: criticalOverdueCount,
        });
      } catch (error) {
        console.error("Error fetching action stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [organisation?.id, hasAccess]);

  if (!hasAccess) return null;

  if (loading) {
    return (
      <div className="bg-card rounded-xl p-6 border border-border animate-pulse">
        <div className="h-6 w-32 bg-muted rounded mb-4" />
        <div className="h-10 w-full bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Critical overdue alert */}
      {stats.criticalOverdue > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-destructive/10 border border-destructive/30 rounded-xl p-4"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-destructive/20 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive animate-pulse" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-destructive">
                {stats.criticalOverdue} critical action{stats.criticalOverdue > 1 ? "s" : ""} overdue
              </p>
              <p className="text-sm text-destructive/80">
                Immediate attention required
              </p>
            </div>
            <Button variant="destructive" size="sm" asChild>
              <Link to="/actions?status=overdue&priority=critical">
                View Now
              </Link>
            </Button>
          </div>
        </motion.div>
      )}

      {/* Actions summary card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl p-6 shadow-sm border border-border"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              Corrective Actions
            </h3>
          </div>
          <Link
            to="/actions"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            View All
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Link
            to="/actions?status=open"
            className="bg-secondary/50 rounded-lg p-4 hover:bg-secondary transition-colors"
          >
            <p className="text-2xl font-bold text-foreground">
              {stats.open}
            </p>
            <p className="text-sm text-muted-foreground">Open Actions</p>
          </Link>

          <Link
            to="/actions?status=overdue"
            className={`rounded-lg p-4 transition-colors ${
              stats.overdue > 0
                ? "bg-destructive/10 hover:bg-destructive/20"
                : "bg-secondary/50 hover:bg-secondary"
            }`}
          >
            <div className="flex items-center gap-2">
              <p
                className={`text-2xl font-bold ${
                  stats.overdue > 0 ? "text-destructive" : "text-foreground"
                }`}
              >
                {stats.overdue}
              </p>
              {stats.overdue > 0 && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
                </span>
              )}
            </div>
            <p
              className={`text-sm ${
                stats.overdue > 0
                  ? "text-destructive/80"
                  : "text-muted-foreground"
              }`}
            >
              Overdue
            </p>
          </Link>
        </div>

        {stats.open === 0 && stats.overdue === 0 && (
          <div className="text-center py-4 mt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              No open corrective actions. Great job!
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
