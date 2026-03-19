import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/hooks/useOrg";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format, differenceInDays, addDays } from "date-fns";
import {
  Users, Building2, Search, Shield, UserX, UserCheck, RefreshCw,
  AlertTriangle, CheckCircle, Clock, XCircle,
  Crown, Mail, Phone, Calendar, CreditCard, TrendingUp, Activity,
  Eye, Megaphone, PlusCircle, Zap, HardHat, FileText, BarChart2,
  AlertCircle, ExternalLink, Info, Send, Loader2, Ban,
  FileWarning, ShieldAlert, History, TrendingDown, Sparkles,
} from "lucide-react";

import {
  type Organisation, type OrgMember, type MemberRole, type MemberStatus,
  type SubTier, type SubStatus,
  type RiddorIncident, type ComplianceAlert, type AuditEvent, type AdminLogEntry,
  type ChurnOrg, type OnboardingOrg, type PlatformStats,
  tierColors, subStatusColors, roleColors, roleLabels, statusConfig,
} from "@/types/admin";
import { tierPrice, formatBytes, calcHealthScore, logAdminAction } from "@/lib/admin-utils";

import { PlatformOverview } from "@/components/admin/PlatformOverview";
import { OrganisationTable, AllUsersTable } from "@/components/admin/OrganisationTable";
import { RiddorTracker } from "@/components/admin/RiddorTracker";
import { ComplianceAlerts } from "@/components/admin/ComplianceAlerts";
import { AuditLogTab, AdminActionsTab } from "@/components/admin/AuditLogViewer";

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminPanel() {
  const { user } = useAuth();
  const { hasRole, loading: orgLoading } = useOrg();
  const navigate = useNavigate();

  const [orgs, setOrgs] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState<PlatformStats>({
    totalOrgs: 0, totalUsers: 0, activeUsers: 0, pendingInvites: 0,
    deactivatedUsers: 0, mrr: 0, activeSubscriptions: 0, trialing: 0, pastDue: 0, cancelled: 0,
  });

  const [riddorIncidents, setRiddorIncidents] = useState<RiddorIncident[]>([]);
  const [complianceAlerts, setComplianceAlerts] = useState<ComplianceAlert[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [adminLog, setAdminLog] = useState<AdminLogEntry[]>([]);
  const [churnOrgs, setChurnOrgs] = useState<ChurnOrg[]>([]);
  const [onboardingOrgs, setOnboardingOrgs] = useState<OnboardingOrg[]>([]);

  // Subscription override dialog
  const [subOverrideOrg, setSubOverrideOrg] = useState<Organisation | null>(null);
  const [subOverride, setSubOverride] = useState<{ tier: SubTier; status: SubStatus; trialDays: string }>({ tier: "starter", status: "trialing", trialDays: "14" });
  const [savingSubOverride, setSavingSubOverride] = useState(false);

  // Modals
  const [detailMember, setDetailMember] = useState<OrgMember | null>(null);
  const [detailOrgName, setDetailOrgName] = useState("");
  const [detailOrgId, setDetailOrgId] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: "deactivate" | "reactivate"; member: OrgMember; orgId: string } | null>(null);
  const [impersonateOrg, setImpersonateOrg] = useState<Organisation | null>(null);
  const [impersonating, setImpersonating] = useState(false);
  const [createOrgOpen, setCreateOrgOpen] = useState(false);
  const [newOrg, setNewOrg] = useState({ name: "", ownerEmail: "" });
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcast, setBroadcast] = useState({ subject: "", message: "", tier: "all" });
  const [broadcasting, setBroadcasting] = useState(false);

  // ── Guard ──
  useEffect(() => {
    if (!orgLoading && !hasRole("owner")) navigate("/access-denied", { replace: true });
  }, [orgLoading, hasRole, navigate]);

  // ── Fetch everything ──
  const fetchData = useCallback(async () => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const thirtyDaysFromNow = addDays(new Date(), 30).toISOString();

      const [orgsRes, membersRes, projectsRes, docsRes, incidentsRes, ramsRes,
        activityRes, riddorRes, complianceRes, auditRes,
        allDocsRes, inspectionsRes, toolboxRes, inductionsRes] = await Promise.all([
        supabase.from("organisations").select("id,name,slug,created_at,subscription_tier,subscription_status,trial_ends_at,stripe_customer_id,storage_used_bytes,max_projects,address,phone").order("created_at", { ascending: false }),
        supabase.from("organisation_members").select(`id,organisation_id,role,status,invited_at,accepted_at,profile:profiles!organisation_members_profile_id_fkey(id,full_name,email,phone,avatar_url,created_at)`).order("invited_at", { ascending: false }),
        supabase.from("projects").select("id,organisation_id,status,is_live"),
        supabase.from("documents").select("id,organisation_id,created_at").gte("created_at", thirtyDaysAgo),
        supabase.from("incidents").select("id,organisation_id"),
        supabase.from("rams_records").select("id,organisation_id"),
        supabase.from("activity_logs").select("organisation_id,created_at").order("created_at", { ascending: false }).limit(500),
        supabase.from("incidents").select(`id,incident_number,title,severity,status,incident_date,riddor_reported_at,organisation_id,project:projects(name)`).eq("is_riddor_reportable", true).neq("status", "closed").order("incident_date", { ascending: false }),
        supabase.from("contractor_compliance_docs").select(`id,doc_type,expiry_date,organisation_id,contractor:contractor_companies(company_name)`).not("expiry_date", "is", null).lte("expiry_date", thirtyDaysFromNow).order("expiry_date", { ascending: true }),
        supabase.from("audit_events").select("*").order("created_at", { ascending: false }).limit(300),
        supabase.from("documents").select("id,organisation_id"),
        supabase.from("inspections").select("id,organisation_id"),
        supabase.from("toolbox_talks").select("id,organisation_id"),
        supabase.from("site_induction_completions").select("id,organisation_id"),
      ]);

      const orgsData = orgsRes.data ?? [];
      const membersData = membersRes.data ?? [];
      const orgNameMap: Record<string, string> = {};
      orgsData.forEach((o) => { orgNameMap[o.id] = o.name; });

      // Group members by org
      const membersByOrg: Record<string, OrgMember[]> = {};
      membersData.forEach((m) => {
        if (!membersByOrg[m.organisation_id]) membersByOrg[m.organisation_id] = [];
        membersByOrg[m.organisation_id].push({
          id: m.id, role: m.role as MemberRole, status: m.status as MemberStatus,
          invited_at: m.invited_at, accepted_at: m.accepted_at,
          profile: m.profile as OrgMember["profile"],
        });
      });

      // Per-org metrics
      const projectsByOrg: Record<string, { total: number; live: number }> = {};
      (projectsRes.data ?? []).forEach((p) => {
        if (!projectsByOrg[p.organisation_id]) projectsByOrg[p.organisation_id] = { total: 0, live: 0 };
        projectsByOrg[p.organisation_id].total++;
        if (p.is_live) projectsByOrg[p.organisation_id].live++;
      });
      const docsByOrg: Record<string, number> = {};
      (docsRes.data ?? []).forEach((d) => { docsByOrg[d.organisation_id] = (docsByOrg[d.organisation_id] ?? 0) + 1; });
      const incidentsByOrg: Record<string, number> = {};
      (incidentsRes.data ?? []).forEach((i) => { incidentsByOrg[i.organisation_id] = (incidentsByOrg[i.organisation_id] ?? 0) + 1; });
      const ramsByOrg: Record<string, number> = {};
      (ramsRes.data ?? []).forEach((r) => { ramsByOrg[r.organisation_id] = (ramsByOrg[r.organisation_id] ?? 0) + 1; });
      const lastActivityByOrg: Record<string, string> = {};
      (activityRes.data ?? []).forEach((a) => { if (!lastActivityByOrg[a.organisation_id]) lastActivityByOrg[a.organisation_id] = a.created_at; });

      const builtOrgs: Organisation[] = orgsData.map((o) => {
        const proj = projectsByOrg[o.id] ?? { total: 0, live: 0 };
        const healthBase = { liveProjects: proj.live, totalProjects: proj.total, docsLast30: docsByOrg[o.id] ?? 0, totalIncidents: incidentsByOrg[o.id] ?? 0, ramsCreated: ramsByOrg[o.id] ?? 0, lastActivityAt: lastActivityByOrg[o.id] ?? null };
        return { ...o, members: membersByOrg[o.id] ?? [], health: { ...healthBase, score: calcHealthScore(healthBase) }, expanded: false } as Organisation;
      });
      setOrgs(builtOrgs);

      // Stats
      let mrr = 0, activeSubs = 0, trialing = 0, pastDue = 0, cancelled = 0;
      orgsData.forEach((o) => {
        if (o.subscription_status === "active") { mrr += tierPrice(o.subscription_tier as SubTier | null); activeSubs++; }
        if (o.subscription_status === "trialing") trialing++;
        if (o.subscription_status === "past_due") { mrr += tierPrice(o.subscription_tier as SubTier | null); pastDue++; }
        if (o.subscription_status === "cancelled") cancelled++;
      });
      setStats({
        totalOrgs: builtOrgs.length, totalUsers: membersData.length,
        activeUsers: membersData.filter((m) => m.status === "active").length,
        pendingInvites: membersData.filter((m) => m.status === "invited").length,
        deactivatedUsers: membersData.filter((m) => m.status === "deactivated").length,
        mrr, activeSubscriptions: activeSubs, trialing, pastDue, cancelled,
      });

      setRiddorIncidents((riddorRes.data ?? []).map((i) => ({ ...i, orgName: orgNameMap[i.organisation_id] ?? "Unknown" } as RiddorIncident)));
      setComplianceAlerts((complianceRes.data ?? []).map((d) => ({
        ...d, orgName: orgNameMap[d.organisation_id] ?? "Unknown",
        daysUntilExpiry: differenceInDays(new Date(d.expiry_date!), new Date()),
      } as ComplianceAlert)));

      const allAudit = (auditRes.data ?? []).map((e) => ({
        ...e, orgName: orgNameMap[e.organisation_id ?? ""] ?? "—",
        metadata: (e.metadata as Record<string, unknown>) ?? {},
      }));
      setAuditEvents(allAudit);
      setAdminLog(allAudit.filter((e) => (e.metadata as Record<string, unknown>)?._admin_action).map((e) => ({
        id: e.id, action: e.action,
        target: `${e.entity_type}${e.entity_id ? ` · ${e.entity_id.slice(0, 8)}…` : ""}`,
        created_at: e.created_at,
      })));

      // ── Churn computation ──
      const thirtyDaysAgoMs = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const sevenDaysFromNow = addDays(new Date(), 7).getTime();
      const ownerEmailByOrg: Record<string, string | null> = {};
      membersData.forEach((m) => {
        if (m.role === "owner" && (m.profile as OrgMember["profile"])?.email) {
          ownerEmailByOrg[m.organisation_id] = (m.profile as OrgMember["profile"])!.email;
        }
      });

      const builtChurn: ChurnOrg[] = [];
      orgsData.forEach((o) => {
        const reasons: string[] = [];
        let risk: "critical" | "high" | "medium" = "medium";
        const liveProjects = projectsByOrg[o.id]?.live ?? 0;
        const lastAct = lastActivityByOrg[o.id] ? new Date(lastActivityByOrg[o.id]).getTime() : null;
        const orgMrr = (o.subscription_status === "active" || o.subscription_status === "past_due") ? tierPrice(o.subscription_tier as SubTier | null) : 0;

        if (o.subscription_status === "trialing" && o.trial_ends_at) {
          const trialEnd = new Date(o.trial_ends_at).getTime();
          if (trialEnd <= sevenDaysFromNow) {
            reasons.push(`Trial ends ${differenceInDays(new Date(o.trial_ends_at), new Date())}d`);
            if (liveProjects === 0) reasons.push("No live projects");
            risk = "critical";
          }
        }
        if (o.subscription_status === "past_due") { reasons.push("Payment past due"); risk = "critical"; }
        if (o.subscription_status === "active" && lastAct && lastAct < thirtyDaysAgoMs) {
          reasons.push(`${Math.floor((Date.now() - lastAct) / (1000 * 60 * 60 * 24))}d inactive`);
          if (risk !== "critical") risk = "high";
        }
        if (o.subscription_status === "active" && !lastAct) {
          reasons.push("No activity recorded");
          if (risk !== "critical") risk = "high";
        }
        if (o.subscription_status === "active" && liveProjects === 0 && (projectsByOrg[o.id]?.total ?? 0) === 0) {
          reasons.push("No projects created");
        }
        if (reasons.length > 0) {
          builtChurn.push({
            id: o.id, name: o.name, slug: o.slug,
            subscription_tier: o.subscription_tier as SubTier | null,
            subscription_status: o.subscription_status as SubStatus | null,
            trial_ends_at: o.trial_ends_at, stripe_customer_id: o.stripe_customer_id,
            mrr: orgMrr, risk, reasons, ownerEmail: ownerEmailByOrg[o.id] ?? null,
            lastActivityAt: lastActivityByOrg[o.id] ?? null, liveProjects,
          });
        }
      });
      builtChurn.sort((a, b) => {
        const riskOrder = { critical: 0, high: 1, medium: 2 };
        if (riskOrder[a.risk] !== riskOrder[b.risk]) return riskOrder[a.risk] - riskOrder[b.risk];
        return b.mrr - a.mrr;
      });
      setChurnOrgs(builtChurn);

      // ── Onboarding progress ──
      const allDocsByOrg: Record<string, number> = {};
      (allDocsRes.data ?? []).forEach((d) => { allDocsByOrg[d.organisation_id] = (allDocsByOrg[d.organisation_id] ?? 0) + 1; });
      const inspByOrg: Record<string, number> = {};
      (inspectionsRes.data ?? []).forEach((i) => { inspByOrg[i.organisation_id] = (inspByOrg[i.organisation_id] ?? 0) + 1; });
      const toolboxByOrg: Record<string, number> = {};
      (toolboxRes.data ?? []).forEach((t) => { toolboxByOrg[t.organisation_id] = (toolboxByOrg[t.organisation_id] ?? 0) + 1; });
      const inductionByOrg: Record<string, number> = {};
      (inductionsRes.data ?? []).forEach((i) => { inductionByOrg[i.organisation_id] = (inductionByOrg[i.organisation_id] ?? 0) + 1; });

      const builtOnboarding: OnboardingOrg[] = orgsData.map((o) => {
        const memberCount = (membersByOrg[o.id] ?? []).length;
        const steps = {
          profileComplete: !!(o.address && o.phone),
          firstProject: (projectsByOrg[o.id]?.total ?? 0) > 0,
          firstDocument: (allDocsByOrg[o.id] ?? 0) > 0,
          firstRams: (ramsByOrg[o.id] ?? 0) > 0,
          teamMemberInvited: memberCount > 1,
          firstInspection: (inspByOrg[o.id] ?? 0) > 0,
          firstToolboxTalk: (toolboxByOrg[o.id] ?? 0) > 0,
          firstInduction: (inductionByOrg[o.id] ?? 0) > 0,
        };
        const completedSteps = Object.values(steps).filter(Boolean).length;
        return {
          id: o.id, name: o.name, slug: o.slug,
          subscription_tier: o.subscription_tier as SubTier | null,
          subscription_status: o.subscription_status as SubStatus | null,
          created_at: o.created_at, steps, completedSteps, totalSteps: 8,
        };
      }).sort((a, b) => a.completedSteps - b.completedSteps);
      setOnboardingOrgs(builtOnboarding);

    } catch (err: unknown) {
      toast.error("Failed to load admin data", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { if (!orgLoading && hasRole("owner")) fetchData(); }, [orgLoading, hasRole, fetchData]);
  const handleRefresh = () => { setRefreshing(true); fetchData(); };
  const toggleOrg = (id: string) => setOrgs((prev) => prev.map((o) => o.id === id ? { ...o, expanded: !o.expanded } : o));

  // ── Actions ──
  const handleUpdateRole = async (memberId: string, orgId: string, newRole: MemberRole, profile: OrgMember["profile"]) => {
    const { error } = await supabase.from("organisation_members").update({ role: newRole }).eq("id", memberId);
    if (error) { toast.error("Failed to update role", { description: error.message }); return; }
    await logAdminAction(user!.id, "ROLE_CHANGE", "organisation_member", memberId, orgId, { new_role: newRole, user_email: profile?.email });
    setOrgs((prev) => prev.map((o) => o.id === orgId ? { ...o, members: o.members.map((m) => m.id === memberId ? { ...m, role: newRole } : m) } : o));
    toast.success("Role updated", { description: `Changed to ${roleLabels[newRole]}` });
  };

  const handleToggleStatus = (member: OrgMember, orgId: string) => {
    if (member.status === "invited") { toast.success("Invite resent", { description: `Re-sent to ${member.profile?.email}` }); return; }
    setConfirmAction({ type: member.status === "active" ? "deactivate" : "reactivate", member, orgId });
  };

  const executeStatusChange = async () => {
    if (!confirmAction) return;
    const { type, member, orgId } = confirmAction;
    const newStatus: MemberStatus = type === "deactivate" ? "deactivated" : "active";
    const { error } = await supabase.from("organisation_members").update({ status: newStatus }).eq("id", member.id);
    setConfirmAction(null);
    if (error) { toast.error("Failed", { description: error.message }); return; }
    await logAdminAction(user!.id, type === "deactivate" ? "DEACTIVATE_USER" : "REACTIVATE_USER", "organisation_member", member.id, orgId, { user_email: member.profile?.email });
    setOrgs((prev) => prev.map((o) => o.id === orgId ? { ...o, members: o.members.map((m) => m.id === member.id ? { ...m, status: newStatus } : m) } : o));
    setStats((prev) => ({ ...prev, activeUsers: type === "deactivate" ? prev.activeUsers - 1 : prev.activeUsers + 1, deactivatedUsers: type === "deactivate" ? prev.deactivatedUsers + 1 : prev.deactivatedUsers - 1 }));
    toast.success(type === "deactivate" ? "User deactivated" : "User reactivated");
  };

  const handleImpersonate = async (org: Organisation) => {
    setImpersonating(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-impersonate", { body: { target_org_id: org.id } });
      if (error) throw error;
      await logAdminAction(user!.id, "IMPERSONATE_ORG", "organisation", org.id, org.id, { org_name: org.name });
      toast.success(`Viewing as ${org.name}`, { description: "Session active. All actions are logged." });
      setImpersonateOrg(null);
    } catch {
      toast.error("Backend function required", { description: "Deploy supabase/functions/admin-impersonate/index.ts to enable impersonation." });
    } finally {
      setImpersonating(false);
    }
  };

  const handleCreateOrg = async () => {
    if (!newOrg.name.trim() || !newOrg.ownerEmail.trim()) return;
    setCreatingOrg(true);
    try {
      const { data: ownerProfile, error: profileError } = await supabase
        .from("profiles").select("id").eq("email", newOrg.ownerEmail.trim().toLowerCase()).single();
      if (profileError || !ownerProfile) {
        toast.error("Owner not found", { description: "The owner must have an existing account." });
        setCreatingOrg(false);
        return;
      }
      const { data, error } = await supabase.functions.invoke("create-organisation", {
        body: { userId: ownerProfile.id, companyName: newOrg.name.trim(), email: newOrg.ownerEmail.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.organisation?.id) {
        await logAdminAction(user!.id, "CREATE_ORG", "organisation", data.organisation.id, data.organisation.id, { org_name: newOrg.name, owner_email: newOrg.ownerEmail });
      }
      toast.success("Organisation created", { description: `${newOrg.name} is live with a 14-day trial.` });
      setCreateOrgOpen(false);
      setNewOrg({ name: "", ownerEmail: "" });
      fetchData();
    } catch (err: unknown) {
      toast.error("Failed to create org", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setCreatingOrg(false);
    }
  };

  const handleSubOverride = async () => {
    if (!subOverrideOrg) return;
    setSavingSubOverride(true);
    try {
      const updates: Record<string, unknown> = { subscription_tier: subOverride.tier, subscription_status: subOverride.status };
      updates.trial_ends_at = subOverride.status === "trialing" ? addDays(new Date(), parseInt(subOverride.trialDays) || 14).toISOString() : null;
      const { error } = await supabase.from("organisations").update(updates as Record<string, unknown>).eq("id", subOverrideOrg.id);
      if (error) throw error;
      await logAdminAction(user!.id, "SUB_OVERRIDE", "organisation", subOverrideOrg.id, subOverrideOrg.id, {
        org_name: subOverrideOrg.name, prev_tier: subOverrideOrg.subscription_tier, new_tier: subOverride.tier, new_status: subOverride.status,
      });
      setOrgs((prev) => prev.map((o) => o.id === subOverrideOrg.id ? { ...o, subscription_tier: subOverride.tier, subscription_status: subOverride.status, trial_ends_at: updates.trial_ends_at as string | null } : o));
      toast.success("Subscription updated", { description: `${subOverrideOrg.name} → ${subOverride.tier} / ${subOverride.status}` });
      setSubOverrideOrg(null);
    } catch (err: unknown) {
      toast.error("Failed", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setSavingSubOverride(false);
    }
  };

  const handleBroadcast = async () => {
    if (!broadcast.message.trim()) return;
    setBroadcasting(true);
    try {
      const targetOrgs = orgs.filter((o) => broadcast.tier === "all" || o.subscription_tier === broadcast.tier);
      const inserts = targetOrgs.map((o) => ({ organisation_id: o.id, actor_id: user!.id, activity_type: "settings_updated" as const, entity_type: "broadcast", description: `📢 ${broadcast.subject || "Platform Announcement"}: ${broadcast.message}`, metadata: { broadcast: true, subject: broadcast.subject, message: broadcast.message } }));
      if (inserts.length > 0) await supabase.from("activity_logs").insert(inserts);
      await logAdminAction(user!.id, "BROADCAST", "broadcast", null, null, { subject: broadcast.subject, tier: broadcast.tier, org_count: inserts.length });
      toast.success("Broadcast sent", { description: `Delivered to ${inserts.length} organisation${inserts.length !== 1 ? "s" : ""}.` });
      setBroadcastOpen(false);
      setBroadcast({ subject: "", message: "", tier: "all" });
    } catch (err: unknown) {
      toast.error("Broadcast failed", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setBroadcasting(false);
    }
  };

  // ── Filtered data ──
  const q = searchQuery.toLowerCase();
  const filteredOrgs = orgs.map((org) => {
    if (!q) return org;
    const orgMatch = org.name.toLowerCase().includes(q) || org.slug.toLowerCase().includes(q);
    const filteredMembers = org.members.filter((m) => m.profile?.full_name?.toLowerCase().includes(q) || m.profile?.email?.toLowerCase().includes(q));
    if (!orgMatch && filteredMembers.length === 0) return null;
    return { ...org, members: orgMatch ? org.members : filteredMembers, expanded: true };
  }).filter(Boolean) as Organisation[];

  const allMembers = orgs.flatMap((o) => o.members.map((m) => ({ ...m, orgName: o.name, orgId: o.id })));
  const filteredAllMembers = q ? allMembers.filter((m) => m.profile?.full_name?.toLowerCase().includes(q) || m.profile?.email?.toLowerCase().includes(q) || m.orgName.toLowerCase().includes(q)) : allMembers;

  const onViewMember = (member: OrgMember, orgName: string, orgId: string) => {
    setDetailMember(member); setDetailOrgName(orgName); setDetailOrgId(orgId); setDetailOpen(true);
  };

  // ─────────────────────────────────────────────────────────────────────────

  if (orgLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading platform data…</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Crown className="h-4 w-4 text-purple-600" />
              </div>
              Platform Admin
            </h1>
            <p className="text-sm text-muted-foreground mt-1">SiteSafe Cloud · All actions logged</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setBroadcastOpen(true)}><Megaphone className="h-4 w-4 mr-2" />Broadcast</Button>
            <Button variant="outline" size="sm" onClick={() => setCreateOrgOpen(true)}><PlusCircle className="h-4 w-4 mr-2" />New Org</Button>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}><RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />Refresh</Button>
          </div>
        </div>

        <PlatformOverview stats={stats} riddorCount={riddorIncidents.length} />

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search users, emails, organisations…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="orgs">
          <TabsList className="flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="orgs" className="gap-1.5 text-xs h-8"><Building2 className="h-3.5 w-3.5" />Organisations</TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5 text-xs h-8"><Users className="h-3.5 w-3.5" />All Users</TabsTrigger>
            <TabsTrigger value="billing" className="gap-1.5 text-xs h-8"><CreditCard className="h-3.5 w-3.5" />Billing</TabsTrigger>
            <TabsTrigger value="riddor" className="gap-1.5 text-xs h-8 relative">
              <ShieldAlert className="h-3.5 w-3.5" />RIDDOR
              {riddorIncidents.length > 0 && <span className="ml-1 bg-destructive text-destructive-foreground text-[9px] rounded-full px-1 leading-4">{riddorIncidents.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="compliance" className="gap-1.5 text-xs h-8">
              <FileWarning className="h-3.5 w-3.5" />Compliance
              {complianceAlerts.filter(a => a.daysUntilExpiry <= 7).length > 0 && <span className="ml-1 bg-amber-500 text-white text-[9px] rounded-full px-1 leading-4">{complianceAlerts.filter(a => a.daysUntilExpiry <= 7).length}</span>}
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-1.5 text-xs h-8"><History className="h-3.5 w-3.5" />Audit Log</TabsTrigger>
            <TabsTrigger value="admin-log" className="gap-1.5 text-xs h-8"><Shield className="h-3.5 w-3.5" />Admin Actions</TabsTrigger>
            <TabsTrigger value="churn" className="gap-1.5 text-xs h-8 relative">
              <TrendingDown className="h-3.5 w-3.5" />Churn Risk
              {churnOrgs.filter(o => o.risk === "critical").length > 0 && <span className="ml-1 bg-destructive text-destructive-foreground text-[9px] rounded-full px-1 leading-4">{churnOrgs.filter(o => o.risk === "critical").length}</span>}
            </TabsTrigger>
            <TabsTrigger value="onboarding" className="gap-1.5 text-xs h-8"><Sparkles className="h-3.5 w-3.5" />Onboarding</TabsTrigger>
          </TabsList>

          <TabsContent value="orgs" className="mt-4">
            <OrganisationTable filteredOrgs={filteredOrgs} toggleOrg={toggleOrg} handleUpdateRole={handleUpdateRole} handleToggleStatus={handleToggleStatus} onViewMember={onViewMember} onImpersonate={(org) => setImpersonateOrg(org)} />
          </TabsContent>

          <TabsContent value="users" className="mt-4">
            <AllUsersTable members={filteredAllMembers} handleToggleStatus={handleToggleStatus} onViewMember={onViewMember} />
          </TabsContent>

          {/* Billing — kept inline as it uses setSubOverrideOrg */}
          <TabsContent value="billing" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4" />Subscription Overview</CardTitle>
                <CardDescription>Plan status and revenue across all organisations</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead className="text-xs pl-6">Organisation</TableHead>
                      <TableHead className="text-xs">Plan</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">MRR</TableHead>
                      <TableHead className="text-xs">Trial Ends</TableHead>
                      <TableHead className="text-xs">Storage</TableHead>
                      <TableHead className="text-xs">Stripe</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orgs.map((org) => (
                      <TableRow key={org.id} className="hover:bg-muted/20">
                        <TableCell className="pl-6">
                          <p className="font-medium text-xs">{org.name}</p>
                          <p className="text-xs text-muted-foreground">{org.members.filter(m => m.status === "active").length} active users</p>
                        </TableCell>
                        <TableCell><Badge variant="secondary" className={`text-xs ${tierColors[org.subscription_tier ?? "starter"]}`}>{org.subscription_tier ?? "—"}</Badge></TableCell>
                        <TableCell>
                          {org.subscription_status
                            ? <Badge variant="secondary" className={`text-xs gap-1 ${subStatusColors[org.subscription_status]}`}>{org.subscription_status === "past_due" && <AlertCircle className="h-3 w-3" />}{org.subscription_status}</Badge>
                            : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {org.subscription_status === "active" || org.subscription_status === "past_due" ? `£${tierPrice(org.subscription_tier)}` : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-xs">
                          {org.trial_ends_at ? (
                            <span className={differenceInDays(new Date(org.trial_ends_at), new Date()) <= 3 ? "text-red-600 font-medium" : "text-muted-foreground"}>
                              {format(new Date(org.trial_ends_at), "dd MMM yyyy")} <span className="text-muted-foreground">({differenceInDays(new Date(org.trial_ends_at), new Date())}d)</span>
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatBytes(org.storage_used_bytes)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {org.stripe_customer_id
                              ? <a href={`https://dashboard.stripe.com/customers/${org.stripe_customer_id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><ExternalLink className="h-3 w-3" />Stripe</a>
                              : <span className="text-xs text-muted-foreground">—</span>}
                            <Button variant="ghost" size="sm" className="h-6 text-xs px-2 text-muted-foreground hover:text-primary" onClick={() => { setSubOverrideOrg(org); setSubOverride({ tier: org.subscription_tier ?? "starter", status: org.subscription_status ?? "trialing", trialDays: "14" }); }}>
                              <CreditCard className="h-3 w-3 mr-1" />Override
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="riddor" className="mt-4"><RiddorTracker incidents={riddorIncidents} /></TabsContent>
          <TabsContent value="compliance" className="mt-4"><ComplianceAlerts alerts={complianceAlerts} /></TabsContent>
          <TabsContent value="audit" className="mt-4"><AuditLogTab auditEvents={auditEvents} /></TabsContent>
          <TabsContent value="admin-log" className="mt-4"><AdminActionsTab adminLog={adminLog} /></TabsContent>

          {/* Churn */}
          <TabsContent value="churn" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold flex items-center gap-2"><TrendingDown className="h-4 w-4 text-destructive" />Churn Risk Dashboard</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{churnOrgs.length} organisation{churnOrgs.length !== 1 ? "s" : ""} flagged</p>
              </div>
              <div className="flex gap-2 text-xs">
                <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Critical: {churnOrgs.filter(o => o.risk === "critical").length}</Badge>
                <Badge variant="secondary" className="gap-1 bg-amber-500/10 text-amber-700"><AlertCircle className="h-3 w-3" />High: {churnOrgs.filter(o => o.risk === "high").length}</Badge>
              </div>
            </div>
            {churnOrgs.length === 0 ? (
              <Card><CardContent className="py-12 text-center">
                <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                <p className="text-sm font-medium">No churn signals detected</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-2">
                {churnOrgs.map((org) => (
                  <Card key={org.id} className={`border-l-4 ${org.risk === "critical" ? "border-l-destructive" : org.risk === "high" ? "border-l-amber-500" : "border-l-slate-300"}`}>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 ${org.risk === "critical" ? "bg-destructive/10" : org.risk === "high" ? "bg-amber-500/10" : "bg-muted"}`}>
                            {org.risk === "critical" ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <AlertCircle className="h-4 w-4 text-amber-600" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm">{org.name}</p>
                              {org.subscription_tier && <Badge variant="secondary" className={`text-xs ${tierColors[org.subscription_tier]}`}>{org.subscription_tier}</Badge>}
                              {org.mrr > 0 && <Badge variant="secondary" className="text-xs font-mono">£{org.mrr}/mo</Badge>}
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {org.reasons.map((r, i) => (
                                <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${org.risk === "critical" ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-700"}`}>{r}</span>
                              ))}
                            </div>
                            {org.lastActivityAt && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Activity className="h-3 w-3" />Last active {format(new Date(org.lastActivityAt), "dd MMM yyyy")}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {org.ownerEmail && (
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" asChild>
                              <a href={`mailto:${org.ownerEmail}?subject=Your SiteSafe Cloud account`}><Mail className="h-3.5 w-3.5" />Contact</a>
                            </Button>
                          )}
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => {
                            const fullOrg = orgs.find(o => o.id === org.id);
                            if (fullOrg) { setSubOverrideOrg(fullOrg); setSubOverride({ tier: fullOrg.subscription_tier ?? "starter", status: fullOrg.subscription_status ?? "trialing", trialDays: "14" }); }
                          }}><CreditCard className="h-3.5 w-3.5" />Override</Button>
                          {org.stripe_customer_id && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" asChild>
                              <a href={`https://dashboard.stripe.com/customers/${org.stripe_customer_id}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" />Stripe</a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Onboarding */}
          <TabsContent value="onboarding" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Onboarding Progress Tracker</CardTitle>
                <CardDescription>Where each organisation is in their activation journey.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead className="text-xs pl-6">Organisation</TableHead>
                      <TableHead className="text-xs">Progress</TableHead>
                      <TableHead className="text-xs text-center">Profile</TableHead>
                      <TableHead className="text-xs text-center">Project</TableHead>
                      <TableHead className="text-xs text-center">Doc</TableHead>
                      <TableHead className="text-xs text-center">RAMS</TableHead>
                      <TableHead className="text-xs text-center">Team</TableHead>
                      <TableHead className="text-xs text-center">Inspect</TableHead>
                      <TableHead className="text-xs text-center">Talk</TableHead>
                      <TableHead className="text-xs text-center">Induct</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {onboardingOrgs.map((org) => {
                      const pct = Math.round((org.completedSteps / org.totalSteps) * 100);
                      const stepEntries = Object.entries(org.steps) as [string, boolean][];
                      return (
                        <TableRow key={org.id} className="hover:bg-muted/20">
                          <TableCell className="pl-6">
                            <p className="font-medium text-xs">{org.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {org.subscription_tier && <Badge variant="secondary" className={`text-xs ${tierColors[org.subscription_tier]}`}>{org.subscription_tier}</Badge>}
                              <span className="text-xs text-muted-foreground">since {format(new Date(org.created_at), "dd MMM yy")}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 min-w-[100px]">
                              <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${pct === 100 ? "bg-emerald-500" : pct >= 60 ? "bg-blue-500" : pct >= 30 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-muted-foreground tabular-nums">{org.completedSteps}/{org.totalSteps}</span>
                            </div>
                          </TableCell>
                          {stepEntries.map(([key, done]) => (
                            <TableCell key={key} className="text-center">
                              {done ? <CheckCircle className="h-4 w-4 text-emerald-500 mx-auto" /> : <XCircle className="h-4 w-4 text-muted-foreground/40 mx-auto" />}
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ═══ DIALOGS ═══ */}

      {/* User Detail */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md">
          {detailMember && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{detailMember.profile?.full_name?.charAt(0)?.toUpperCase() ?? "?"}</div>
                  <div>
                    <p>{detailMember.profile?.full_name ?? "Unknown"}</p>
                    <p className="text-sm font-normal text-muted-foreground">{detailOrgName}</p>
                  </div>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-1">
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Role</p><Badge variant="secondary" className={`text-xs ${roleColors[detailMember.role]}`}>{detailMember.role === "owner" && <Crown className="h-3 w-3 mr-1" />}{roleLabels[detailMember.role]}</Badge></div>
                  <div><p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Status</p><Badge variant="secondary" className={`text-xs gap-1 ${statusConfig[detailMember.status].color}`}>{statusConfig[detailMember.status].icon}{statusConfig[detailMember.status].label}</Badge></div>
                </div>
                <Separator />
                <div className="space-y-2.5 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-4 w-4" /><span className="break-all">{detailMember.profile?.email ?? "—"}</span></div>
                  {detailMember.profile?.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4" /><span>{detailMember.profile.phone}</span></div>}
                  <div className="flex items-center gap-2 text-muted-foreground"><Calendar className="h-4 w-4" /><span>Invited {format(new Date(detailMember.invited_at), "dd MMM yyyy, HH:mm")}</span></div>
                  {detailMember.accepted_at && <div className="flex items-center gap-2 text-muted-foreground"><CheckCircle className="h-4 w-4 text-emerald-600" /><span>Joined {format(new Date(detailMember.accepted_at), "dd MMM yyyy, HH:mm")}</span></div>}
                </div>
                {detailMember.role !== "owner" && (
                  <>
                    <Separator />
                    <div className="flex gap-2">
                      {detailMember.status === "active" && <Button variant="destructive" size="sm" className="flex-1" onClick={() => { setDetailOpen(false); handleToggleStatus(detailMember, detailOrgId); }}><UserX className="h-4 w-4 mr-2" />Deactivate</Button>}
                      {detailMember.status === "deactivated" && <Button variant="outline" size="sm" className="flex-1 border-emerald-500 text-emerald-700" onClick={() => { setDetailOpen(false); handleToggleStatus(detailMember, detailOrgId); }}><UserCheck className="h-4 w-4 mr-2" />Reactivate</Button>}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Impersonate */}
      <Dialog open={!!impersonateOrg} onOpenChange={(o) => !o && setImpersonateOrg(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Eye className="h-5 w-5 text-purple-600" />View As Organisation</DialogTitle>
            <DialogDescription>Access <strong>{impersonateOrg?.name}</strong> as an admin observer.</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 p-3 text-xs text-amber-700 flex gap-2">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <span>This session is fully logged. Requires <code className="font-mono bg-amber-100 px-1 rounded">admin-impersonate</code> Edge Function.</span>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setImpersonateOrg(null)}>Cancel</Button>
            <Button onClick={() => impersonateOrg && handleImpersonate(impersonateOrg)} disabled={impersonating} className="bg-purple-600 hover:bg-purple-700 text-white">
              {impersonating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              View as {impersonateOrg?.name}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Org */}
      <Dialog open={createOrgOpen} onOpenChange={setCreateOrgOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><PlusCircle className="h-5 w-5 text-primary" />Create New Organisation</DialogTitle>
            <DialogDescription>Creates with a 14-day trial.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label className="text-xs">Organisation Name</Label><Input placeholder="e.g. Acme Construction Ltd" value={newOrg.name} onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Owner Email</Label><Input type="email" placeholder="owner@example.com" value={newOrg.ownerEmail} onChange={(e) => setNewOrg({ ...newOrg, ownerEmail: e.target.value })} /></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateOrgOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateOrg} disabled={creatingOrg || !newOrg.name.trim() || !newOrg.ownerEmail.trim()}>
              {creatingOrg ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PlusCircle className="h-4 w-4 mr-2" />}Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Broadcast */}
      <Dialog open={broadcastOpen} onOpenChange={setBroadcastOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5 text-primary" />Platform Broadcast</DialogTitle>
            <DialogDescription>Posts to each org's Activity feed.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 space-y-1.5"><Label className="text-xs">Subject</Label><Input placeholder="e.g. Scheduled maintenance" value={broadcast.subject} onChange={(e) => setBroadcast({ ...broadcast, subject: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Send to</Label>
                <Select value={broadcast.tier} onValueChange={(v) => setBroadcast({ ...broadcast, tier: v })}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All orgs</SelectItem>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Message</Label><Textarea placeholder="Your announcement…" rows={4} value={broadcast.message} onChange={(e) => setBroadcast({ ...broadcast, message: e.target.value })} /></div>
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground flex gap-2">
              <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>Reaches <strong>{orgs.filter(o => broadcast.tier === "all" || o.subscription_tier === broadcast.tier).length}</strong> org(s) via Activity feed.</span>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBroadcastOpen(false)}>Cancel</Button>
            <Button onClick={handleBroadcast} disabled={broadcasting || !broadcast.message.trim()}>
              {broadcasting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm deactivate/reactivate */}
      <AlertDialog open={!!confirmAction} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {confirmAction?.type === "deactivate" ? "Deactivate User" : "Reactivate User"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "deactivate"
                ? <><strong>{confirmAction.member.profile?.full_name}</strong> will lose access immediately.</>
                : <><strong>{confirmAction?.member.profile?.full_name}</strong> will regain access.</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className={confirmAction?.type === "deactivate" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""} onClick={executeStatusChange}>
              {confirmAction?.type === "deactivate" ? "Deactivate" : "Reactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Subscription Override */}
      <Dialog open={!!subOverrideOrg} onOpenChange={(o) => !o && setSubOverrideOrg(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" />Override Subscription</DialogTitle>
            <DialogDescription>Manually set plan for <strong>{subOverrideOrg?.name}</strong>. Does not affect Stripe.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Plan Tier</Label>
                <Select value={subOverride.tier} onValueChange={(v) => setSubOverride({ ...subOverride, tier: v as SubTier })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter — £49/mo</SelectItem>
                    <SelectItem value="professional">Professional — £99/mo</SelectItem>
                    <SelectItem value="enterprise">Enterprise — £199/mo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Status</Label>
                <Select value={subOverride.status} onValueChange={(v) => setSubOverride({ ...subOverride, status: v as SubStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="trialing">Trialing</SelectItem>
                    <SelectItem value="past_due">Past Due</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {subOverride.status === "trialing" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Trial Length (days)</Label>
                <Input type="number" min="1" max="365" value={subOverride.trialDays} onChange={(e) => setSubOverride({ ...subOverride, trialDays: e.target.value })} />
                <p className="text-xs text-muted-foreground">Ends {addDays(new Date(), parseInt(subOverride.trialDays) || 14).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSubOverrideOrg(null)}>Cancel</Button>
            <Button onClick={handleSubOverride} disabled={savingSubOverride}>
              {savingSubOverride ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
