import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Shield, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  ActionSummaryCards,
  ActionFilters,
  ActionTable,
} from "@/components/actions";
import { toast } from "sonner";
import { startOfMonth, isBefore, startOfToday } from "date-fns";

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

interface Project {
  id: string;
  name: string;
}

interface TeamMember {
  id: string;
  full_name: string;
}

const Actions = () => {
  const { user } = useAuth();
  const { organisation, tier } = useSubscription();
  const [actions, setActions] = useState<Action[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    project: "all",
    priority: "all",
    status: "all",
    source: "all",
    assignedTo: "all",
    search: "",
  });
  const [activeStatusFilter, setActiveStatusFilter] = useState<string | null>(null);

  // Check if user has access (Professional+ tier)
  const hasAccess = tier === "professional" || tier === "enterprise" || tier === "trial";

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!organisation?.id) return;

      try {
        // Fetch actions with related data
        const { data: actionsData, error: actionsError } = await supabase
          .from("corrective_actions")
          .select(`
            *,
            projects:project_id(name)
          `)
          .eq("organisation_id", organisation.id)
          .order("due_date", { ascending: true });

        if (actionsError) throw actionsError;
        
        // Fetch assigned profiles separately to avoid relationship ambiguity
        const actionsWithProfiles = await Promise.all(
          (actionsData || []).map(async (action) => {
            let assigned_profile = null;
            if (action.assigned_to) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", action.assigned_to)
                .single();
              assigned_profile = profile;
            }
            return { ...action, assigned_profile } as Action;
          })
        );
        
        setActions(actionsWithProfiles);

        // Fetch projects
        const { data: projectsData } = await supabase
          .from("projects")
          .select("id, name")
          .eq("organisation_id", organisation.id)
          .eq("status", "active");
        setProjects(projectsData || []);

        // Fetch team members
        const { data: membersData } = await supabase
          .from("organisation_members")
          .select("profile_id, profiles:profile_id(id, full_name)")
          .eq("organisation_id", organisation.id)
          .eq("status", "active");

        const members = membersData
          ?.map((m: any) => m.profiles)
          .filter(Boolean) as TeamMember[];
        setTeamMembers(members || []);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load actions");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [organisation?.id]);

  // Calculate summary counts
  const today = startOfToday();
  const monthStart = startOfMonth(today);

  const isOverdue = (action: Action) => {
    return (
      action.status !== "closed" &&
      action.status !== "awaiting_verification" &&
      isBefore(new Date(action.due_date), today)
    );
  };

  const summaryStats = useMemo(() => {
    return {
      overdue: actions.filter(isOverdue).length,
      open: actions.filter(
        (a) => (a.status === "open" || a.status === "in_progress") && !isOverdue(a)
      ).length,
      awaitingVerification: actions.filter(
        (a) => a.status === "awaiting_verification"
      ).length,
      closedThisMonth: actions.filter(
        (a) =>
          a.status === "closed" &&
          a.closed_at &&
          new Date(a.closed_at) >= monthStart
      ).length,
    };
  }, [actions, today, monthStart]);

  // Filter actions
  const filteredActions = useMemo(() => {
    let result = [...actions];

    // Apply status card filter
    if (activeStatusFilter) {
      switch (activeStatusFilter) {
        case "overdue":
          result = result.filter(isOverdue);
          break;
        case "open":
          result = result.filter(
            (a) => (a.status === "open" || a.status === "in_progress") && !isOverdue(a)
          );
          break;
        case "awaiting_verification":
          result = result.filter((a) => a.status === "awaiting_verification");
          break;
        case "closed_this_month":
          result = result.filter(
            (a) =>
              a.status === "closed" &&
              a.closed_at &&
              new Date(a.closed_at) >= monthStart
          );
          break;
      }
    }

    // Apply dropdown filters
    if (filters.project !== "all") {
      result = result.filter((a) => a.project_id === filters.project);
    }
    if (filters.priority !== "all") {
      result = result.filter((a) => a.priority === filters.priority);
    }
    if (filters.status !== "all") {
      if (filters.status === "overdue") {
        result = result.filter(isOverdue);
      } else {
        result = result.filter((a) => a.status === filters.status);
      }
    }
    if (filters.source !== "all") {
      result = result.filter((a) => a.source === filters.source);
    }
    if (filters.assignedTo !== "all") {
      if (filters.assignedTo === "unassigned") {
        result = result.filter((a) => !a.assigned_to);
      } else {
        result = result.filter((a) => a.assigned_to === filters.assignedTo);
      }
    }
    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(search) ||
          (a.projects?.name || "").toLowerCase().includes(search)
      );
    }

    // Sort: overdue first, then by priority, then by due date
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    result.sort((a, b) => {
      // Overdue first
      const aOverdue = isOverdue(a);
      const bOverdue = isOverdue(b);
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      // Then by priority
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];
      if (aPriority !== bPriority) return aPriority - bPriority;

      // Then by due date
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });

    return result;
  }, [actions, filters, activeStatusFilter, today, monthStart]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setActiveStatusFilter(null); // Clear card filter when using dropdowns
  };

  const handleCardFilterClick = (filter: string) => {
    setActiveStatusFilter((prev) => (prev === filter ? null : filter));
  };

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

  // Check user role for admin permissions
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    const checkRole = async () => {
      if (!user || !organisation?.id) return;
      const { data } = await supabase
        .from("organisation_members")
        .select("role")
        .eq("profile_id", user.id)
        .eq("organisation_id", organisation.id)
        .single();
      setIsAdmin(data?.role === "owner" || data?.role === "admin");
    };
    checkRole();
  }, [user, organisation?.id]);

  if (!hasAccess) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="bg-card rounded-xl border-2 border-dashed border-border p-12 text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
              <Shield className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Professional Feature
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Corrective Actions tracking is available on Professional and Enterprise plans.
              Upgrade to track and resolve safety issues across your sites.
            </p>
            <Button asChild>
              <Link to="/settings">Upgrade Plan</Link>
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Corrective Actions</h1>
            <p className="text-sm text-muted-foreground">
              Track and resolve safety issues across your sites
            </p>
          </div>
          <Button asChild>
            <Link to="/actions/new">
              <Plus className="h-4 w-4 mr-2" />
              Raise Action
            </Link>
          </Button>
        </div>
      </header>

      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <ActionSummaryCards
              overdue={summaryStats.overdue}
              open={summaryStats.open}
              awaitingVerification={summaryStats.awaitingVerification}
              closedThisMonth={summaryStats.closedThisMonth}
              onFilterClick={handleCardFilterClick}
              activeFilter={activeStatusFilter}
            />

            {/* Filters */}
            <ActionFilters
              projects={projects}
              teamMembers={teamMembers}
              filters={filters}
              onFilterChange={handleFilterChange}
            />

            {/* Actions Table or Empty State */}
            {filteredActions.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-xl border-2 border-dashed border-border p-12 text-center"
              >
                <div className="h-16 w-16 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
                  <Shield className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {actions.length === 0
                    ? "No corrective actions yet"
                    : "No actions match your filters"}
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {actions.length === 0
                    ? "Raise an action when you spot something unsafe on site — from a loose cable to a missing guardrail."
                    : "Try adjusting your filters to see more results."}
                </p>
                {actions.length === 0 && (
                  <Button asChild>
                    <Link to="/actions/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Raise Your First Action
                    </Link>
                  </Button>
                )}
              </motion.div>
            ) : (
              <ActionTable
                actions={filteredActions}
                isAdmin={isAdmin}
                onClose={handleCloseAction}
                onDelete={handleDeleteAction}
              />
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Actions;
