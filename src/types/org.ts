export type MemberRole = "owner" | "admin" | "site_manager" | "contractor" | "client_viewer";

export interface OrgMembership {
  orgId: string;
  orgName: string;
  orgSlug: string;
  role: MemberRole;
  status: string;
}

const ROLE_HIERARCHY: MemberRole[] = [
  "client_viewer",
  "contractor",
  "site_manager",
  "admin",
  "owner",
];

/** Returns true if `userRole` is >= `required` in the hierarchy. */
export function hasMinimumRole(
  userRole: MemberRole | undefined,
  required: MemberRole
): boolean {
  if (!userRole) return false;
  return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(required);
}
