import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FolderPlus, 
  FileUp, 
  FileCheck, 
  FileX, 
  UserPlus, 
  UserCheck, 
  UserCog, 
  UserX,
  QrCode,
  LogIn,
  LogOut,
  Settings,
  CreditCard,
  Activity,
  Folder
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type ActivityType =
  | "project_created"
  | "project_updated"
  | "project_archived"
  | "document_uploaded"
  | "document_approved"
  | "document_rejected"
  | "document_deleted"
  | "member_invited"
  | "member_joined"
  | "member_role_changed"
  | "member_deactivated"
  | "site_access_created"
  | "site_visit_checkin"
  | "site_visit_checkout"
  | "settings_updated"
  | "subscription_changed";

interface ActivityLog {
  id: string;
  activity_type: ActivityType;
  entity_type: string;
  entity_name: string | null;
  description: string;
  created_at: string;
  actor: {
    full_name: string;
    avatar_url: string | null;
  } | null;
  project: {
    name: string;
  } | null;
}

interface ActivityFeedProps {
  projectId?: string;
  limit?: number;
  showHeader?: boolean;
  compact?: boolean;
}

const activityIcons: Record<ActivityType, React.ElementType> = {
  project_created: FolderPlus,
  project_updated: Folder,
  project_archived: Folder,
  document_uploaded: FileUp,
  document_approved: FileCheck,
  document_rejected: FileX,
  document_deleted: FileX,
  member_invited: UserPlus,
  member_joined: UserCheck,
  member_role_changed: UserCog,
  member_deactivated: UserX,
  site_access_created: QrCode,
  site_visit_checkin: LogIn,
  site_visit_checkout: LogOut,
  settings_updated: Settings,
  subscription_changed: CreditCard,
};

const activityColors: Record<ActivityType, string> = {
  project_created: "bg-primary/10 text-primary",
  project_updated: "bg-primary/10 text-primary",
  project_archived: "bg-muted text-muted-foreground",
  document_uploaded: "bg-primary/10 text-primary",
  document_approved: "bg-emerald-500/10 text-emerald-600",
  document_rejected: "bg-destructive/10 text-destructive",
  document_deleted: "bg-destructive/10 text-destructive",
  member_invited: "bg-primary/10 text-primary",
  member_joined: "bg-emerald-500/10 text-emerald-600",
  member_role_changed: "bg-amber-500/10 text-amber-600",
  member_deactivated: "bg-destructive/10 text-destructive",
  site_access_created: "bg-primary/10 text-primary",
  site_visit_checkin: "bg-emerald-500/10 text-emerald-600",
  site_visit_checkout: "bg-amber-500/10 text-amber-600",
  settings_updated: "bg-muted text-muted-foreground",
  subscription_changed: "bg-primary/10 text-primary",
};

export default function ActivityFeed({ 
  projectId, 
  limit = 20, 
  showHeader = true,
  compact = false 
}: ActivityFeedProps) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchActivities();
      subscribeToActivities();
    }
  }, [user, projectId]);

  const fetchActivities = async () => {
    try {
      let query = supabase
        .from("activity_logs")
        .select(`
          id,
          activity_type,
          entity_type,
          entity_name,
          description,
          created_at,
          actor:profiles!activity_logs_actor_id_fkey (
            full_name,
            avatar_url
          ),
          project:projects!activity_logs_project_id_fkey (
            name
          )
        `)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setActivities(data as unknown as ActivityLog[]);
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToActivities = () => {
    const channel = supabase
      .channel("activity-feed")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_logs",
        },
        (payload) => {
          // Fetch the full activity with relations
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const content = (
    <>
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-8">
          <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No activity yet</p>
        </div>
      ) : (
        <div className="space-y-1">
          {activities.map((activity, index) => {
            const Icon = activityIcons[activity.activity_type] || Activity;
            const colorClass = activityColors[activity.activity_type] || "bg-muted text-muted-foreground";

            return (
              <div
                key={activity.id}
                className={`flex items-start gap-3 ${compact ? "py-2" : "py-3"} ${
                  index !== activities.length - 1 ? "border-b" : ""
                }`}
              >
                <div className={`p-2 rounded-full ${colorClass} flex-shrink-0`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`${compact ? "text-sm" : ""} leading-snug`}>
                    <span className="font-medium">
                      {activity.actor?.full_name || "System"}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {activity.description}
                    </span>
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </span>
                    {activity.project && !projectId && (
                      <Badge variant="outline" className="text-xs">
                        {activity.project.name}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  if (!showHeader) {
    return content;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
        <CardDescription>
          {projectId ? "Activity on this project" : "Activity across your organisation"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {content}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
