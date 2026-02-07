import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { format, isBefore, startOfToday } from "date-fns";
import {
  ArrowLeft,
  Edit,
  MoreVertical,
  MapPin,
  Calendar,
  User,
  Building2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ActionPriorityDot,
  ActionStatusBadge,
  ActionSourceBadge,
  StatusWorkflowButtons,
  ActionActivityFeed,
  EvidenceUpload,
} from "@/components/actions";
import { toast } from "sonner";

interface Action {
  id: string;
  title: string;
  description: string;
  location_on_site: string | null;
  priority: "critical" | "high" | "medium" | "low";
  status: string;
  source: string;
  due_date: string;
  raised_at: string;
  raised_by: string;
  assigned_to: string | null;
  assigned_to_company: string | null;
  resolution_notes: string | null;
  completed_at: string | null;
  verified_at: string | null;
  verified_by: string | null;
  closed_at: string | null;
  project_id: string;
  organisation_id: string;
  projects?: { name: string };
  raised_profile?: { full_name: string };
  assigned_profile?: { full_name: string };
  verified_profile?: { full_name: string };
}

interface Evidence {
  id: string;
  file_path: string;
  caption: string | null;
  evidence_type: string;
  created_at: string;
}

interface Comment {
  id: string;
  content: string;
  is_status_change: boolean;
  old_status: string | null;
  new_status: string | null;
  created_at: string;
  author?: { full_name: string; avatar_url: string | null };
}

const ActionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { organisation } = useSubscription();
  const navigate = useNavigate();

  const [action, setAction] = useState<Action | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Fetch action data
  useEffect(() => {
    const fetchAction = async () => {
      if (!id) return;

      try {
        const { data, error } = await supabase
          .from("corrective_actions")
          .select(`
            *,
            projects:project_id(name)
          `)
          .eq("id", id)
          .single();

        if (error) throw error;
        
        // Fetch related profiles separately to avoid relationship ambiguity
        let raised_profile = null;
        let assigned_profile = null;
        let verified_profile = null;
        
        if (data.raised_by) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", data.raised_by)
            .single();
          raised_profile = profile;
        }
        
        if (data.assigned_to) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", data.assigned_to)
            .single();
          assigned_profile = profile;
        }
        
        if (data.verified_by) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", data.verified_by)
            .single();
          verified_profile = profile;
        }
        
        setAction({
          ...data,
          raised_profile,
          assigned_profile,
          verified_profile,
        } as Action);

        // Fetch evidence
        const { data: evidenceData } = await supabase
          .from("action_evidence")
          .select("*")
          .eq("action_id", id)
          .order("created_at", { ascending: true });
        setEvidence(evidenceData || []);

        // Fetch comments with author profiles
        const { data: commentsData } = await supabase
          .from("action_comments")
          .select("*")
          .eq("action_id", id)
          .order("created_at", { ascending: true });
        
        // Fetch comment authors
        const commentsWithAuthors = await Promise.all(
          (commentsData || []).map(async (comment) => {
            const { data: author } = await supabase
              .from("profiles")
              .select("full_name, avatar_url")
              .eq("id", comment.author_id)
              .single();
            return { ...comment, author } as Comment;
          })
        );
        
        setComments(commentsWithAuthors);
      } catch (error) {
        console.error("Error fetching action:", error);
        toast.error("Failed to load action");
        navigate("/actions");
      } finally {
        setLoading(false);
      }
    };

    fetchAction();
  }, [id, navigate]);

  // Check admin status
  useEffect(() => {
    const checkRole = async () => {
      if (!user || !organisation?.id) return;
      const { data } = await supabase
        .from("organisation_members")
        .select("role")
        .eq("profile_id", user.id)
        .eq("organisation_id", organisation.id)
        .single();
      setIsAdmin(data?.role === "owner" || data?.role === "admin" || data?.role === "site_manager");
    };
    checkRole();
  }, [user, organisation?.id]);

  const isOverdue = action
    ? action.status !== "closed" &&
      action.status !== "awaiting_verification" &&
      isBefore(new Date(action.due_date), startOfToday())
    : false;

  const handleStatusChange = async (
    newStatus: string,
    data?: { resolutionNotes?: string; rejectReason?: string }
  ) => {
    if (!action || !user) return;

    try {
      const updates: any = {
        status: newStatus,
      };

      if (newStatus === "awaiting_verification" && data?.resolutionNotes) {
        updates.resolution_notes = data.resolutionNotes;
        updates.completed_at = new Date().toISOString();
      }

      if (newStatus === "closed") {
        updates.verified_at = new Date().toISOString();
        updates.verified_by = user.id;
        updates.closed_at = new Date().toISOString();
      }

      if (newStatus === "open" && action.status === "closed") {
        // Reopening - increment recurrence
        updates.is_recurring = true;
        updates.recurrence_count = (action as any).recurrence_count + 1;
        updates.closed_at = null;
        updates.verified_at = null;
        updates.verified_by = null;
      }

      const { error } = await supabase
        .from("corrective_actions")
        .update(updates)
        .eq("id", action.id);

      if (error) throw error;

      // Add status change comment
      const commentContent = data?.rejectReason || `Status changed to ${newStatus}`;
      await supabase.from("action_comments").insert({
        action_id: action.id,
        organisation_id: action.organisation_id,
        author_id: user.id,
        content: commentContent,
        is_status_change: true,
        old_status: action.status as any,
        new_status: newStatus as any,
      });

      // Refresh data
      const { data: updatedAction } = await supabase
        .from("corrective_actions")
        .select(`*, projects:project_id(name)`)
        .eq("id", action.id)
        .single();

      if (updatedAction) {
        // Fetch profiles
        let raised_profile = null;
        let assigned_profile = null;
        let verified_profile = null;
        
        if (updatedAction.raised_by) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", updatedAction.raised_by)
            .single();
          raised_profile = profile;
        }
        
        if (updatedAction.assigned_to) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", updatedAction.assigned_to)
            .single();
          assigned_profile = profile;
        }
        
        if (updatedAction.verified_by) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", updatedAction.verified_by)
            .single();
          verified_profile = profile;
        }
        
        setAction({
          ...updatedAction,
          raised_profile,
          assigned_profile,
          verified_profile,
        } as Action);
      }

      const { data: updatedComments } = await supabase
        .from("action_comments")
        .select(`*, author:author_id(full_name, avatar_url)`)
        .eq("action_id", action.id)
        .order("created_at", { ascending: true });

      if (updatedComments) setComments(updatedComments);

      toast.success(`Action ${newStatus === "closed" ? "closed" : "updated"}`);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleAddComment = async (content: string) => {
    if (!action || !user) return;

    try {
      const { error } = await supabase.from("action_comments").insert({
        action_id: action.id,
        organisation_id: action.organisation_id,
        author_id: user.id,
        content,
        is_status_change: false,
      });

      if (error) throw error;

      // Refresh comments
      const { data: updatedCommentsData } = await supabase
        .from("action_comments")
        .select("*")
        .eq("action_id", action.id)
        .order("created_at", { ascending: true });

      if (updatedCommentsData) {
        const commentsWithAuthors = await Promise.all(
          updatedCommentsData.map(async (comment) => {
            const { data: author } = await supabase
              .from("profiles")
              .select("full_name, avatar_url")
              .eq("id", comment.author_id)
              .single();
            return { ...comment, author } as Comment;
          })
        );
        setComments(commentsWithAuthors);
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    }
  };

  const handleDelete = async () => {
    if (!action) return;

    try {
      const { error } = await supabase
        .from("corrective_actions")
        .delete()
        .eq("id", action.id);

      if (error) throw error;

      toast.success("Action deleted");
      navigate("/actions");
    } catch (error) {
      console.error("Error deleting action:", error);
      toast.error("Failed to delete action");
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!action) return null;

  const beforeEvidence = evidence.filter((e) => e.evidence_type === "before");
  const duringEvidence = evidence.filter((e) => e.evidence_type === "during");
  const afterEvidence = evidence.filter((e) => e.evidence_type === "after");

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/actions")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Actions
          </Button>

          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <ActionPriorityDot priority={action.priority} className="h-4 w-4" />
                <h1 className="text-2xl font-bold text-foreground">{action.title}</h1>
              </div>
              <div className="flex items-center gap-2">
                <ActionStatusBadge status={action.status} isOverdue={isOverdue} />
                {isOverdue && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Overdue
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to={`/actions/${action.id}?edit=true`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Change Priority</DropdownMenuItem>
                  <DropdownMenuItem>Reassign</DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={handleDelete}
                    >
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Action Details Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-xl p-6 shadow-sm border border-border"
            >
              <h2 className="text-lg font-semibold text-foreground mb-4">Details</h2>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="text-foreground mt-1">{action.description}</p>
                </div>

                {action.location_on_site && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="text-foreground">{action.location_on_site}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border">
                  <div>
                    <p className="text-sm text-muted-foreground">Priority</p>
                    <div className="flex items-center gap-2 mt-1">
                      <ActionPriorityDot priority={action.priority} />
                      <span className="capitalize">{action.priority}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Source</p>
                    <div className="mt-1">
                      <ActionSourceBadge source={action.source} />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Project</p>
                    <Link
                      to={`/projects/${action.project_id}`}
                      className="text-primary hover:underline mt-1 block"
                    >
                      {action.projects?.name}
                    </Link>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Due Date</p>
                    <p
                      className={`mt-1 ${
                        isOverdue ? "text-red-600 font-medium" : "text-foreground"
                      }`}
                    >
                      {format(new Date(action.due_date), "dd MMM yyyy")}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Raised by</p>
                      <p className="text-foreground">
                        {action.raised_profile?.full_name || "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(action.raised_at), "dd MMM yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Assigned to</p>
                      <p className="text-foreground">
                        {action.assigned_profile?.full_name ||
                          action.assigned_to_company || (
                            <span className="italic text-muted-foreground">
                              Unassigned
                            </span>
                          )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Photo Evidence */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card rounded-xl p-6 shadow-sm border border-border"
            >
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Photo Evidence
              </h2>

              <div className="space-y-6">
                {/* Before photos */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    Before (Problem)
                  </h3>
                  {beforeEvidence.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {beforeEvidence.map((e) => (
                        <div key={e.id} className="relative group">
                          <img
                            src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/authenticated/action-evidence/${e.file_path}`}
                            alt={e.caption || "Before evidence"}
                            className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          />
                          {e.caption && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {e.caption}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No photos uploaded</p>
                  )}
                </div>

                {/* During photos (if any) */}
                {duringEvidence.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">
                      During (In Progress)
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {duringEvidence.map((e) => (
                        <div key={e.id} className="relative group">
                          <img
                            src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/authenticated/action-evidence/${e.file_path}`}
                            alt={e.caption || "During evidence"}
                            className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          />
                          {e.caption && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {e.caption}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* After photos */}
                {(action.status === "awaiting_verification" ||
                  action.status === "closed") && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">
                      After (Fixed)
                    </h3>
                    {afterEvidence.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {afterEvidence.map((e) => (
                          <div key={e.id} className="relative group">
                            <img
                              src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/authenticated/action-evidence/${e.file_path}`}
                              alt={e.caption || "After evidence"}
                              className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                            />
                            {e.caption && (
                              <p className="text-xs text-muted-foreground mt-1 truncate">
                                {e.caption}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No photos uploaded</p>
                    )}
                  </div>
                )}

                {/* Upload more button for in_progress */}
                {action.status === "in_progress" && (
                  <EvidenceUpload
                    evidenceType="during"
                    actionId={action.id}
                    organisationId={action.organisation_id}
                  />
                )}
              </div>
            </motion.div>

            {/* Resolution Section */}
            {(action.status === "awaiting_verification" || action.status === "closed") &&
              action.resolution_notes && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-card rounded-xl p-6 shadow-sm border border-border"
                >
                  <h2 className="text-lg font-semibold text-foreground mb-4">
                    Resolution
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Resolution Notes</p>
                      <p className="text-foreground mt-1">{action.resolution_notes}</p>
                    </div>

                    {action.completed_at && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        Completed on{" "}
                        {format(new Date(action.completed_at), "dd MMM yyyy 'at' HH:mm")}
                      </div>
                    )}

                    {action.verified_at && action.verified_profile && (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <User className="h-4 w-4" />
                        Verified by {action.verified_profile.full_name} on{" "}
                        {format(new Date(action.verified_at), "dd MMM yyyy")}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
          </div>

          {/* Right column - Status & Activity */}
          <div className="space-y-6">
            {/* Status Workflow */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-xl p-6 shadow-sm border border-border"
            >
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Status
              </h2>
              <StatusWorkflowButtons
                status={action.status}
                isAdmin={isAdmin}
                onStatusChange={handleStatusChange}
                actionId={action.id}
                organisationId={action.organisation_id}
              />
            </motion.div>

            {/* Activity Feed */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card rounded-xl p-6 shadow-sm border border-border"
            >
              <ActionActivityFeed
                comments={comments}
                onAddComment={handleAddComment}
              />
            </motion.div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ActionDetail;
