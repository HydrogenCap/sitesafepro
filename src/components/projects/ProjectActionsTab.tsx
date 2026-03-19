import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Shield, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { ActionTable } from "@/components/actions/ActionTable";
import { ActionPriorityDot } from "@/components/actions/ActionPriorityDot";
import { startOfToday, isBefore } from "date-fns";
import { toast } from "sonner";

interface Action {
  id: string;
  title: string;
  priority: "critical" | "high" | "medium" | "low";
  status: string;
  source: string;
  due_date: string;
  assigned_to: string | null;
  assigned_to_company: string | null;
  project_id: string;
  closed_at: string | null;
  projects?: { name: string };
  assigned_profile?: { full_name: string };
}

interface ProjectActionsTabProps {
  projectId: string;
  projectName: string;
}

export function ProjectActionsTab({ projectId, projectName }: ProjectActionsTabProps) {
  const { organisation, tier } = useSubscription();
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);

  // Check if user has access (Professional+ tier)
  const hasAccess = tier === "professional" || tier === "enterprise" || tier === "trial";

  useEffect(() => {
    const fetchActions = async () => {
      if (!organisation?.id || !hasAccess) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("corrective_actions")
          .select("*")
          .eq("organisation_id", organisation.id)
          .eq("project_id", projectId)
          .order("due_date", { ascending: true });

        if (error) throw error;

        // Fetch assigned profiles
        const actionsWithProfiles = await Promise.all(
          (data || []).map(async (action) => {
            let assigned_profile = null;
            if (action.assigned_to) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", action.assigned_to)
                .single();
              assigned_profile = profile;
            }
            return { 
              ...action, 
              assigned_profile,
              projects: { name: projectName }
            } as Action;
          })
        );

        setActions(actionsWithProfiles);
      } catch (error) {
        console.error("Error fetching actions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchActions();
  }, [organisation?.id, projectId, projectName, hasAccess]);

  const today = startOfToday();

  const isOverdue = (action: Action) => {
    return (
      action.status !== "closed" &&
      action.status !== "awaiting_verification" &&
      isBefore(new Date(action.due_date), today)
    );
  };

  const stats = useMemo(() => {
    const open = actions.filter(
      (a) => a.status === "open" || a.status === "in_progress"
    ).length;
    const overdue = actions.filter(isOverdue).length;
    const closed = actions.filter((a) => a.status === "closed").length;
    return { open, overdue, closed };
  }, [actions]);

  const handleCloseAction = async (id: string) => {
    try {
      const { error } = await supabase
        .from("corrective_actions")
        .update({
          status: "closed",
          closed_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      setActions((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, status: "closed", closed_at: new Date().toISOString() }
            : a
        )
      );
      toast.success("Action closed");
    } catch (error) {
      console.error("Error closing action:", error);
      toast.error("Failed to close action");
    }
  };

  const handleDeleteAction = async (id: string) => {
    try {
      const { error } = await supabase
        .from("corrective_actions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setActions((prev) => prev.filter((a) => a.id !== id));
      toast.success("Action deleted");
    } catch (error) {
      console.error("Error deleting action:", error);
      toast.error("Failed to delete action");
    }
  };

  if (!hasAccess) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl border-2 border-dashed border-border p-12 text-center"
      >
        <div className="h-16 w-16 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
          <Shield className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Professional Feature
        </h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Corrective Actions tracking is available on Professional and Enterprise plans.
        </p>
        <Button asChild>
          <Link to="/settings">Upgrade Plan</Link>
        </Button>
      </motion.div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">{stats.open}</span> open
          </span>
          {stats.overdue > 0 && (
            <span className="text-destructive">
              <span className="font-medium">{stats.overdue}</span> overdue
            </span>
          )}
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">{stats.closed}</span> closed
          </span>
        </div>
        <Button asChild>
          <Link to={`/actions/new?project=${projectId}`}>
            <Plus className="h-4 w-4 mr-2" />
            Raise Action
          </Link>
        </Button>
      </div>

      {/* Actions list or empty state */}
      {actions.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl border-2 border-dashed border-border p-12 text-center"
        >
          <div className="h-16 w-16 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
            <Shield className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No actions for this project
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Raise a corrective action when you spot something unsafe on site.
          </p>
          <Button asChild>
            <Link to={`/actions/new?project=${projectId}`}>
              <Plus className="h-4 w-4 mr-2" />
              Raise First Action
            </Link>
          </Button>
        </motion.div>
      ) : (
        <ActionTable
          actions={actions}
          isAdmin={true}
          onClose={handleCloseAction}
          onDelete={handleDeleteAction}
        />
      )}
    </div>
  );
}
