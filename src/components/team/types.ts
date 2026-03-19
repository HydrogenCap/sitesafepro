export type MemberRole = "owner" | "admin" | "site_manager" | "contractor" | "client_viewer";
export type MemberStatus = "invited" | "active" | "deactivated";

export interface TeamMember {
  id: string;
  role: MemberRole;
  status: MemberStatus;
  invited_at: string;
  accepted_at: string | null;
  profile: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  } | null;
}

export const roleLabels: Record<MemberRole, string> = {
  owner: "Owner",
  admin: "Admin",
  site_manager: "Site Manager",
  contractor: "Contractor",
  client_viewer: "Client Viewer",
};

export const roleColors: Record<MemberRole, string> = {
  owner: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  admin: "bg-primary/10 text-primary",
  site_manager: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  contractor: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  client_viewer: "bg-muted text-muted-foreground",
};

export const rolePermissions: Record<MemberRole, string[]> = {
  owner: [
    "Full organisation control",
    "Manage billing & subscription",
    "Delete organisation",
    "All admin permissions",
  ],
  admin: [
    "Manage team members",
    "Manage all projects",
    "Configure settings",
    "View all reports",
  ],
  site_manager: [
    "Manage assigned projects",
    "Create inspections & actions",
    "Upload documents",
    "Manage site access",
  ],
  contractor: [
    "View assigned projects",
    "Upload compliance docs",
    "Acknowledge documents",
    "Complete inductions",
  ],
  client_viewer: [
    "View project progress",
    "Download reports",
    "View documents",
    "Read-only access",
  ],
};
