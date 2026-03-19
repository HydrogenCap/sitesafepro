import React from "react";
import { STRIPE_PRODUCTS } from "@/config/stripe";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MemberRole = "owner" | "admin" | "site_manager" | "contractor" | "client_viewer";
export type MemberStatus = "invited" | "active" | "deactivated";
export type SubStatus = "active" | "past_due" | "cancelled" | "trialing";
export type SubTier = "starter" | "professional" | "enterprise";

export interface OrgMember {
  id: string;
  role: MemberRole;
  status: MemberStatus;
  invited_at: string;
  accepted_at: string | null;
  profile: {
    id: string; full_name: string; email: string;
    phone: string | null; avatar_url: string | null; created_at: string;
  } | null;
}

export interface OrgHealth {
  liveProjects: number;
  totalProjects: number;
  docsLast30: number;
  totalIncidents: number;
  ramsCreated: number;
  lastActivityAt: string | null;
  score: number;
}

export interface Organisation {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  subscription_tier: SubTier | null;
  subscription_status: SubStatus | null;
  trial_ends_at: string | null;
  stripe_customer_id: string | null;
  storage_used_bytes: number | null;
  max_projects: number | null;
  members: OrgMember[];
  health: OrgHealth | null;
  expanded: boolean;
}

export interface RiddorIncident {
  id: string;
  incident_number: string;
  title: string;
  severity: string;
  status: string;
  incident_date: string;
  riddor_reported_at: string | null;
  organisation_id: string;
  orgName: string;
  project?: { name: string } | null;
}

export interface ComplianceAlert {
  id: string;
  doc_type: string;
  expiry_date: string;
  organisation_id: string;
  orgName: string;
  contractor?: { company_name: string } | null;
  daysUntilExpiry: number;
}

export interface AuditEvent {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  actor_id: string | null;
  created_at: string;
  organisation_id: string | null;
  metadata: Record<string, unknown>;
  orgName?: string;
}

export interface AdminLogEntry {
  id: string;
  action: string;
  target: string;
  created_at: string;
}

export interface ChurnOrg {
  id: string; name: string; slug: string;
  subscription_tier: SubTier | null; subscription_status: SubStatus | null;
  trial_ends_at: string | null; stripe_customer_id: string | null;
  mrr: number; risk: "critical" | "high" | "medium";
  reasons: string[]; ownerEmail: string | null;
  lastActivityAt: string | null; liveProjects: number;
}

export interface OnboardingOrg {
  id: string; name: string; slug: string;
  subscription_tier: SubTier | null; subscription_status: SubStatus | null;
  created_at: string;
  steps: {
    profileComplete: boolean; firstProject: boolean; firstDocument: boolean;
    firstRams: boolean; teamMemberInvited: boolean; firstInspection: boolean;
    firstToolboxTalk: boolean; firstInduction: boolean;
  };
  completedSteps: number; totalSteps: number;
}

export interface PlatformStats {
  totalOrgs: number;
  totalUsers: number;
  activeUsers: number;
  pendingInvites: number;
  deactivatedUsers: number;
  mrr: number;
  activeSubscriptions: number;
  trialing: number;
  pastDue: number;
  cancelled: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const tierColors: Record<string, string> = {
  starter: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  professional: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  enterprise: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
};

export const subStatusColors: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-700",
  trialing: "bg-amber-500/10 text-amber-700",
  past_due: "bg-red-500/10 text-red-700",
  cancelled: "bg-muted text-muted-foreground",
};

export const roleColors: Record<MemberRole, string> = {
  owner: "bg-purple-500/10 text-purple-700",
  admin: "bg-primary/10 text-primary",
  site_manager: "bg-emerald-500/10 text-emerald-700",
  contractor: "bg-amber-500/10 text-amber-700",
  client_viewer: "bg-muted text-muted-foreground",
};

export const roleLabels: Record<MemberRole, string> = {
  owner: "Owner", admin: "Admin", site_manager: "Site Manager",
  contractor: "Contractor", client_viewer: "Client Viewer",
};

import { Clock, CheckCircle, XCircle } from "lucide-react";

export const statusConfig: Record<MemberStatus, { icon: React.ReactNode; color: string; label: string }> = {
  invited: { icon: <Clock className="h-3 w-3" />, color: "bg-amber-500/10 text-amber-700", label: "Pending" },
  active: { icon: <CheckCircle className="h-3 w-3" />, color: "bg-emerald-500/10 text-emerald-700", label: "Active" },
  deactivated: { icon: <XCircle className="h-3 w-3" />, color: "bg-destructive/10 text-destructive", label: "Deactivated" },
};
