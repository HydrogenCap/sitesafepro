import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  ChevronRight,
  FileText,
  FolderOpen,
  AlertTriangle,
  CheckCircle2,
  Upload,
  UserPlus,
  Shield,
  HardHat,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: string;
  activity_type: string;
  entity_type: string;
  entity_name: string | null;
  description: string;
  created_at: string;
  actor_name: string | null;
}

const ICON_MAP: Record<string, typeof Activity> = {
  project: FolderOpen,
  document: FileText,
  incident: AlertTriangle,
  action: Shield,
  contractor: HardHat,
  inspection: CheckCircle2,
  member: UserPlus,
  compliance_doc: Upload,
};

const TYPE_COLOR: Record<string, string> = {
  create: "bg-green-500/10 text-green-600",
  upload: "bg-primary/10 text-primary",
  approve: "bg-green-500/10 text-green-600",
  reject: "bg-destructive/10 text-destructive",
  status_change: "bg-accent/10 text-accent",
  delete: "bg-destructive/10 text-destructive",
  update: "bg-muted text-muted-foreground",
};

export function ActivityFeedWidget() {
  const { organisation } = useSubscription();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organisation?.id) {
      setLoading(false);
      return;
    }

    const fetchActivities = async () => {
      try {
        const { data, error } = await supabase
          .from("activity_logs")
          .select("id, activity_type, entity_type, entity_name, description, created_at, actor_id")
          .eq("organisation_id", organisation.id)
          .order("created_at", { ascending: false })
          .limit(8);

        if (error) throw error;

        // Fetch actor names
        const actorIds = [...new Set((data || []).map((a) => a.actor_id).filter(Boolean))];
        let actorMap: Record<string, string> = {};

        if (actorIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", actorIds);

          if (profiles) {
            actorMap = Object.fromEntries(profiles.map((p) => [p.id, p.full_name || "Unknown"]));
          }
        }

        setActivities(
          (data || []).map((a) => ({
            id: a.id,
            activity_type: a.activity_type,
            entity_type: a.entity_type,
            entity_name: a.entity_name,
            description: a.description,
            created_at: a.created_at,
            actor_name: a.actor_id ? actorMap[a.actor_id] || null : null,
          }))
        );
      } catch (err) {
        console.error("Error fetching activity feed:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("activity-feed")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_logs",
          filter: `organisation_id=eq.${organisation.id}`,
        },
        (payload) => {
          const newItem = payload.new as any;
          setActivities((prev) => [
            {
              id: newItem.id,
              activity_type: newItem.activity_type,
              entity_type: newItem.entity_type,
              entity_name: newItem.entity_name,
              description: newItem.description,
              created_at: newItem.created_at,
              actor_name: null,
            },
            ...prev.slice(0, 7),
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organisation?.id]);

  if (loading) {
    return (
      <div className="bg-card rounded-xl p-6 border border-border animate-pulse">
        <div className="h-6 w-36 bg-muted rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-muted rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (activities.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
            <Link
              to="/activity"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {activities.map((item, index) => {
              const Icon = ICON_MAP[item.entity_type] || Activity;
              const colorClass = TYPE_COLOR[item.activity_type] || TYPE_COLOR.update;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-snug">
                      {item.description}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.actor_name && (
                        <span className="text-xs text-muted-foreground">{item.actor_name}</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  {item.entity_name && (
                    <Badge variant="outline" className="text-xs shrink-0 hidden sm:inline-flex">
                      {item.entity_name}
                    </Badge>
                  )}
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
