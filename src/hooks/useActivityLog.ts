import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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

interface LogActivityParams {
  activityType: ActivityType;
  entityType: string;
  entityId?: string;
  entityName?: string;
  description: string;
  projectId?: string;
  metadata?: Record<string, unknown>;
}

export function useActivityLog() {
  const { user } = useAuth();

  const logActivity = useCallback(
    async ({
      activityType,
      entityType,
      entityId,
      entityName,
      description,
      projectId,
      metadata = {},
    }: LogActivityParams) => {
      if (!user) {
        console.warn("Cannot log activity: No user authenticated");
        return;
      }

      try {
        // Get user's organisation
        const { data: memberData, error: memberError } = await supabase
          .from("organisation_members")
          .select("organisation_id")
          .eq("profile_id", user.id)
          .eq("status", "active")
          .maybeSingle();

        if (memberError || !memberData) {
          console.warn("Cannot log activity: User not in organisation");
          return;
        }

        const { error } = await supabase.from("activity_logs").insert({
          organisation_id: memberData.organisation_id,
          project_id: projectId || null,
          actor_id: user.id,
          activity_type: activityType,
          entity_type: entityType,
          entity_id: entityId || null,
          entity_name: entityName || null,
          description,
          metadata,
        } as any);

        if (error) {
          console.error("Error logging activity:", error);
        }
      } catch (err) {
        console.error("Failed to log activity:", err);
      }
    },
    [user]
  );

  return { logActivity };
}

// Helper functions for common activity types
export const activityDescriptions = {
  project_created: (name: string) => `Created project "${name}"`,
  project_updated: (name: string) => `Updated project "${name}"`,
  project_archived: (name: string) => `Archived project "${name}"`,
  document_uploaded: (name: string) => `Uploaded document "${name}"`,
  document_approved: (name: string) => `Approved document "${name}"`,
  document_rejected: (name: string) => `Rejected document "${name}"`,
  document_deleted: (name: string) => `Deleted document "${name}"`,
  member_invited: (email: string) => `Invited ${email} to the organisation`,
  member_joined: (name: string) => `${name} joined the organisation`,
  member_role_changed: (name: string, role: string) => `Changed ${name}'s role to ${role}`,
  member_deactivated: (name: string) => `Deactivated ${name}'s account`,
  site_access_created: (name: string) => `Created site access code "${name}"`,
  site_visit_checkin: (visitorName: string, projectName: string) => 
    `${visitorName} checked in at ${projectName}`,
  site_visit_checkout: (visitorName: string, projectName: string) => 
    `${visitorName} checked out from ${projectName}`,
  settings_updated: () => `Updated organisation settings`,
  subscription_changed: (tier: string) => `Changed subscription to ${tier}`,
};
