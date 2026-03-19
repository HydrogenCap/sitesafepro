import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Activity as ActivityIcon,
  Search,
  Filter,
  Download,
  Calendar,
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
  Folder,
  Loader2
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

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
  entity_id: string | null;
  entity_name: string | null;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
  actor: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  } | null;
  project: {
    id: string;
    name: string;
  } | null;
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

const activityLabels: Record<ActivityType, string> = {
  project_created: "Project Created",
  project_updated: "Project Updated",
  project_archived: "Project Archived",
  document_uploaded: "Document Uploaded",
  document_approved: "Document Approved",
  document_rejected: "Document Rejected",
  document_deleted: "Document Deleted",
  member_invited: "Member Invited",
  member_joined: "Member Joined",
  member_role_changed: "Role Changed",
  member_deactivated: "Member Deactivated",
  site_access_created: "Access Code Created",
  site_visit_checkin: "Site Check-in",
  site_visit_checkout: "Site Check-out",
  settings_updated: "Settings Updated",
  subscription_changed: "Subscription Changed",
};

export default function Activity() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchActivities();
  }, [user, navigate]);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from("activity_logs")
        .select(`
          id,
          activity_type,
          entity_type,
          entity_id,
          entity_name,
          description,
          metadata,
          created_at,
          actor:profiles!activity_logs_actor_id_fkey (
            id,
            full_name,
            email,
            avatar_url
          ),
          project:projects!activity_logs_project_id_fkey (
            id,
            name
          )
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setActivities(data as unknown as ActivityLog[]);
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredActivities = activities.filter((activity) => {
    const matchesSearch = 
      activity.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.actor?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.entity_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === "all" || activity.activity_type === typeFilter;
    const matchesEntity = entityFilter === "all" || activity.entity_type === entityFilter;

    return matchesSearch && matchesType && matchesEntity;
  });

  const entityTypes = [...new Set(activities.map((a) => a.entity_type))];

  const exportActivities = () => {
    const csv = [
      ["Date", "Time", "User", "Activity", "Description", "Project"].join(","),
      ...filteredActivities.map((a) => [
        format(new Date(a.created_at), "yyyy-MM-dd"),
        format(new Date(a.created_at), "HH:mm:ss"),
        a.actor?.full_name || "System",
        activityLabels[a.activity_type],
        `"${a.description.replace(/"/g, '""')}"`,
        a.project?.name || "",
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `activity-log-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Activity Log</h1>
            <p className="text-muted-foreground">
              Complete audit trail of all actions in your organisation
            </p>
          </div>
          <Button variant="outline" onClick={exportActivities}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search activities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Activity type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Activities</SelectItem>
                  {Object.entries(activityLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Entity type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  {entityTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Activity List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ActivityIcon className="h-5 w-5" />
              Activity Timeline
            </CardTitle>
            <CardDescription>
              Showing {filteredActivities.length} of {activities.length} activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredActivities.length === 0 ? (
              <div className="text-center py-12">
                <ActivityIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No activities found</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredActivities.map((activity, index) => {
                  const Icon = activityIcons[activity.activity_type] || ActivityIcon;
                  const colorClass = activityColors[activity.activity_type] || "bg-muted text-muted-foreground";

                  return (
                    <div
                      key={activity.id}
                      className={`flex items-start gap-4 py-4 ${
                        index !== filteredActivities.length - 1 ? "border-b" : ""
                      }`}
                    >
                      <div className={`p-2 rounded-full ${colorClass} flex-shrink-0`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="leading-snug">
                              <span className="font-medium">
                                {activity.actor?.full_name || "System"}
                              </span>{" "}
                              <span className="text-muted-foreground">
                                {activity.description}
                              </span>
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {activityLabels[activity.activity_type]}
                              </Badge>
                              {activity.project && (
                                <Badge variant="secondary" className="text-xs">
                                  {activity.project.name}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(activity.created_at), "MMM d, yyyy")}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(activity.created_at), "HH:mm")}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
