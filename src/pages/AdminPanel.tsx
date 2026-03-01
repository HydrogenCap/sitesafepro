import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/hooks/useOrg";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays, addDays } from "date-fns";
import {
  Users, Building2, Search, Shield, UserX, UserCheck, RefreshCw,
  ChevronDown, ChevronRight, AlertTriangle, CheckCircle, Clock, XCircle,
  Crown, Mail, Phone, Calendar, CreditCard, TrendingUp, Activity,
  Eye, Megaphone, PlusCircle, Zap, HardHat, FileText, BarChart2,
  AlertCircle, ExternalLink, Info, Send, Loader2, Ban,
  FileWarning, ShieldAlert, History, Building, TrendingDown, Sparkles,
} from "lucide-react";
import { STRIPE_PRODUCTS } from "@/config/stripe";

// ─── Types ────────────────────────────────────────────────────────────────────

type MemberRole = "owner" | "admin" | "site_manager" | "contractor" | "client_viewer";
type MemberStatus = "invited" | "active" | "deactivated";
type SubStatus = "active" | "past_due" | "cancelled" | "trialing";
type SubTier = "starter" | "professional" | "enterprise";

interface OrgMember {
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

interface OrgHealth {
  liveProjects: number;
  totalProjects: number;
  docsLast30: number;
  totalIncidents: number;
  ramsCreated: number;
  lastActivityAt: string | null;
  score: number;
}

interface Organisation {
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

interface RiddorIncident {
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

interface ComplianceAlert {
  id: string;
  doc_type: string;
  expiry_date: string;
  organisation_id: string;
  orgName: string;
  contractor?: { company_name: string } | null;
  daysUntilExpiry: number;
}

interface AuditEvent {
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

interface AdminLogEntry {
  id: string;
  action: string;
  target: string;
  created_at: string;
}

interface ChurnOrg {
  id: string; name: string; slug: string;
  subscription_tier: SubTier | null; subscription_status: SubStatus | null;
  trial_ends_at: string | null; stripe_customer_id: string | null;
  mrr: number; risk: "critical" | "high" | "medium";
  reasons: string[]; ownerEmail: string | null;
  lastActivityAt: string | null; liveProjects: number;
}

interface OnboardingOrg {
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

interface PlatformStats {
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const tierColors: Record<string, string> = {
  starter: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  professional: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  enterprise: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
};
const subStatusColors: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-700",
  trialing: "bg-amber-500/10 text-amber-700",
  past_due: "bg-red-500/10 text-red-700",
  cancelled: "bg-muted text-muted-foreground",
};
const roleColors: Record<MemberRole, string> = {
  owner: "bg-purple-500/10 text-purple-700",
  admin: "bg-primary/10 text-primary",
  site_manager: "bg-emerald-500/10 text-emerald-700",
  contractor: "bg-amber-500/10 text-amber-700",
  client_viewer: "bg-muted text-muted-foreground",
};
const roleLabels: Record<MemberRole, string> = {
  owner: "Owner", admin: "Admin", site_manager: "Site Manager",
  contractor: "Contractor", client_viewer: "Client Viewer",
};
const statusConfig: Record<MemberStatus, { icon: React.ReactNode; color: string; label: string }> = {
  invited: { icon: <Clock className="h-3 w-3" />, color: "bg-amber-500/10 text-amber-700", label: "Pending" },
  active: { icon: <CheckCircle className="h-3 w-3" />, color: "bg-emerald-500/10 text-emerald-700", label: "Active" },
  deactivated: { icon: <XCircle className="h-3 w-3" />, color: "bg-destructive/10 text-destructive", label: "Deactivated" },
};

function tierPrice(tier: SubTier | null): number {
  if (!tier) return 0;
  return (STRIPE_PRODUCTS as any)[tier]?.price ?? 0;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "0 MB";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function calcHealthScore(h: Omit<OrgHealth, "score">): number {
  let score = 0;
  if (h.liveProjects > 0) score += 30;
  else if (h.totalProjects > 0) score += 10;
  if (h.docsLast30 >= 5) score += 20;
  else if (h.docsLast30 > 0) score += 10;
  if (h.ramsCreated > 0) score += 20;
  if (h.lastActivityAt) {
    const d = differenceInDays(new Date(), new Date(h.lastActivityAt));
    if (d <= 7) score += 30;
    else if (d <= 30) score += 20;
    else if (d <= 90) score += 10;
  }
  return Math.min(100, score);
}

async function logAdminAction(
  adminId: string, action: string, entityType: string,
  entityId: string | null, orgId: string | null, metadata: Record<string, unknown> = {}
) {
  try {
    await supabase.from("audit_events").insert({
      action: `ADMIN_${action}`,
      actor_id: adminId,
      entity_type: entityType,
      entity_id: entityId,
      organisation_id: orgId,
      metadata: { ...metadata, _admin_action: true },
    } as any);
  } catch { /* silent */ }
}

// ─── Small components ─────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color, alert }: {
  icon: React.ReactNode; label: string; value: number | string;
  sub?: string; color: string; alert?: boolean;
}) {
  return (
    <Card className={alert ? "border-destructive/40" : ""}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-0.5 tabular-nums">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg flex-shrink-0 ${color}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function HealthBadge({ score }: { score: number }) {
  const color = score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-amber-500" : "bg-red-500";
  const textColor = score >= 70 ? "text-emerald-700" : score >= 40 ? "text-amber-700" : "text-red-700";
  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      <div className="flex-1 max-w-[52px] bg-muted rounded-full h-1.5 overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-semibold tabular-nums ${textColor}`}>{score}</span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminPanel() {
  const { user } = useAuth();
  const { hasRole, loading: orgLoading } = useOrg();
  const navigate = useNavigate();
  const { toast } = useToast();

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
  const [auditSearch, setAuditSearch] = useState("");
  const [auditEntityFilter, setAuditEntityFilter] = useState("all");
  const [adminLog, setAdminLog] = useState<AdminLogEntry[]>([]);

  // Churn + onboarding state
  const [churnOrgs, setChurnOrgs] = useState<ChurnOrg[]>([]);
  const [onboardingOrgs, setOnboardingOrgs] = useState<OnboardingOrg[]>([]);

  // Subscription override dialog
  const [subOverrideOrg, setSubOverrideOrg] = useState<Organisation | null>(null);
  const [subOverride, setSubOverride] = useState<{ tier: SubTier; status: SubStatus; trialDays: string }>({ tier: 'starter', status: 'trialing', trialDays: '14' });
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
      orgsData.forEach((o: any) => { orgNameMap[o.id] = o.name; });

      // Group members by org
      const membersByOrg: Record<string, OrgMember[]> = {};
      membersData.forEach((m: any) => {
        if (!membersByOrg[m.organisation_id]) membersByOrg[m.organisation_id] = [];
        membersByOrg[m.organisation_id].push({ id: m.id, role: m.role, status: m.status, invited_at: m.invited_at, accepted_at: m.accepted_at, profile: m.profile });
      });

      // Per-org metrics
      const projectsByOrg: Record<string, { total: number; live: number }> = {};
      (projectsRes.data ?? []).forEach((p: any) => {
        if (!projectsByOrg[p.organisation_id]) projectsByOrg[p.organisation_id] = { total: 0, live: 0 };
        projectsByOrg[p.organisation_id].total++;
        if (p.is_live) projectsByOrg[p.organisation_id].live++;
      });
      const docsByOrg: Record<string, number> = {};
      (docsRes.data ?? []).forEach((d: any) => { docsByOrg[d.organisation_id] = (docsByOrg[d.organisation_id] ?? 0) + 1; });
      const incidentsByOrg: Record<string, number> = {};
      (incidentsRes.data ?? []).forEach((i: any) => { incidentsByOrg[i.organisation_id] = (incidentsByOrg[i.organisation_id] ?? 0) + 1; });
      const ramsByOrg: Record<string, number> = {};
      (ramsRes.data ?? []).forEach((r: any) => { ramsByOrg[r.organisation_id] = (ramsByOrg[r.organisation_id] ?? 0) + 1; });
      const lastActivityByOrg: Record<string, string> = {};
      (activityRes.data ?? []).forEach((a: any) => { if (!lastActivityByOrg[a.organisation_id]) lastActivityByOrg[a.organisation_id] = a.created_at; });

      const builtOrgs: Organisation[] = orgsData.map((o: any) => {
        const proj = projectsByOrg[o.id] ?? { total: 0, live: 0 };
        const healthBase = { liveProjects: proj.live, totalProjects: proj.total, docsLast30: docsByOrg[o.id] ?? 0, totalIncidents: incidentsByOrg[o.id] ?? 0, ramsCreated: ramsByOrg[o.id] ?? 0, lastActivityAt: lastActivityByOrg[o.id] ?? null };
        return { ...o, members: membersByOrg[o.id] ?? [], health: { ...healthBase, score: calcHealthScore(healthBase) }, expanded: false };
      });
      setOrgs(builtOrgs);

      // Stats
      const allMembers = membersData as any[];
      let mrr = 0, activeSubs = 0, trialing = 0, pastDue = 0, cancelled = 0;
      orgsData.forEach((o: any) => {
        if (o.subscription_status === "active") { mrr += tierPrice(o.subscription_tier); activeSubs++; }
        if (o.subscription_status === "trialing") trialing++;
        if (o.subscription_status === "past_due") { mrr += tierPrice(o.subscription_tier); pastDue++; }
        if (o.subscription_status === "cancelled") cancelled++;
      });
      setStats({ totalOrgs: builtOrgs.length, totalUsers: allMembers.length, activeUsers: allMembers.filter((m) => m.status === "active").length, pendingInvites: allMembers.filter((m) => m.status === "invited").length, deactivatedUsers: allMembers.filter((m) => m.status === "deactivated").length, mrr, activeSubscriptions: activeSubs, trialing, pastDue, cancelled });

      setRiddorIncidents((riddorRes.data ?? []).map((i: any) => ({ ...i, orgName: orgNameMap[i.organisation_id] ?? "Unknown" })));
      setComplianceAlerts((complianceRes.data ?? []).map((d: any) => ({ ...d, orgName: orgNameMap[d.organisation_id] ?? "Unknown", daysUntilExpiry: differenceInDays(new Date(d.expiry_date), new Date()) })));

      const allAudit = (auditRes.data ?? []).map((e: any) => ({ ...e, orgName: orgNameMap[e.organisation_id] ?? "—", metadata: (e.metadata as Record<string, unknown>) ?? {} }));
      setAuditEvents(allAudit);
      setAdminLog(allAudit.filter((e: any) => e.metadata?._admin_action).map((e: any) => ({ id: e.id, action: e.action, target: `${e.entity_type}${e.entity_id ? ` · ${e.entity_id.slice(0, 8)}…` : ""}`, created_at: e.created_at })));

      // ── Churn computation ──
      const thirtyDaysAgoMs = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const sevenDaysFromNow = addDays(new Date(), 7).getTime();
      const ownerEmailByOrg: Record<string, string | null> = {};
      membersData.forEach((m: any) => {
        if (m.role === "owner" && m.profile?.email) ownerEmailByOrg[m.organisation_id] = m.profile.email;
      });

      const builtChurn: ChurnOrg[] = [];
      orgsData.forEach((o: any) => {
        const reasons: string[] = [];
        let risk: "critical" | "high" | "medium" = "medium";
        const liveProjects = projectsByOrg[o.id]?.live ?? 0;
        const lastAct = lastActivityByOrg[o.id] ? new Date(lastActivityByOrg[o.id]).getTime() : null;
        const mrr = (o.subscription_status === "active" || o.subscription_status === "past_due") ? tierPrice(o.subscription_tier) : 0;

        // Trial ending <7 days with no live project
        if (o.subscription_status === "trialing" && o.trial_ends_at) {
          const trialEnd = new Date(o.trial_ends_at).getTime();
          if (trialEnd <= sevenDaysFromNow) {
            reasons.push(`Trial ends ${differenceInDays(new Date(o.trial_ends_at), new Date())}d`);
            if (liveProjects === 0) reasons.push("No live projects");
            risk = "critical";
          }
        }
        // Past due
        if (o.subscription_status === "past_due") {
          reasons.push("Payment past due");
          risk = "critical";
        }
        // Active but no activity in 30+ days
        if (o.subscription_status === "active" && lastAct && lastAct < thirtyDaysAgoMs) {
          const daysInactive = Math.floor((Date.now() - lastAct) / (1000 * 60 * 60 * 24));
          reasons.push(`${daysInactive}d inactive`);
          if (risk !== "critical") risk = "high";
        }
        // Active but no activity ever
        if (o.subscription_status === "active" && !lastAct) {
          reasons.push("No activity recorded");
          if (risk !== "critical") risk = "high";
        }
        // Active with no live projects
        if (o.subscription_status === "active" && liveProjects === 0 && (projectsByOrg[o.id]?.total ?? 0) === 0) {
          reasons.push("No projects created");
          if (risk === "medium") risk = "medium";
        }

        if (reasons.length > 0) {
          builtChurn.push({
            id: o.id, name: o.name, slug: o.slug,
            subscription_tier: o.subscription_tier, subscription_status: o.subscription_status,
            trial_ends_at: o.trial_ends_at, stripe_customer_id: o.stripe_customer_id,
            mrr, risk, reasons, ownerEmail: ownerEmailByOrg[o.id] ?? null,
            lastActivityAt: lastActivityByOrg[o.id] ?? null, liveProjects,
          });
        }
      });
      // Sort: critical first, then by MRR desc
      builtChurn.sort((a, b) => {
        const riskOrder = { critical: 0, high: 1, medium: 2 };
        if (riskOrder[a.risk] !== riskOrder[b.risk]) return riskOrder[a.risk] - riskOrder[b.risk];
        return b.mrr - a.mrr;
      });
      setChurnOrgs(builtChurn);

      // ── Onboarding progress computation ──
      const allDocsData = allDocsRes.data ?? [];
      const inspData = inspectionsRes.data ?? [];
      const toolboxData = toolboxRes.data ?? [];
      const inductionData = inductionsRes.data ?? [];

      const allDocsByOrg: Record<string, number> = {};
      allDocsData.forEach((d: any) => { allDocsByOrg[d.organisation_id] = (allDocsByOrg[d.organisation_id] ?? 0) + 1; });
      const inspByOrg: Record<string, number> = {};
      inspData.forEach((i: any) => { inspByOrg[i.organisation_id] = (inspByOrg[i.organisation_id] ?? 0) + 1; });
      const toolboxByOrg: Record<string, number> = {};
      toolboxData.forEach((t: any) => { toolboxByOrg[t.organisation_id] = (toolboxByOrg[t.organisation_id] ?? 0) + 1; });
      const inductionByOrg: Record<string, number> = {};
      inductionData.forEach((i: any) => { inductionByOrg[i.organisation_id] = (inductionByOrg[i.organisation_id] ?? 0) + 1; });

      const builtOnboarding: OnboardingOrg[] = orgsData.map((o: any) => {
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
          subscription_tier: o.subscription_tier, subscription_status: o.subscription_status,
          created_at: o.created_at, steps, completedSteps, totalSteps: 8,
        };
      }).sort((a, b) => a.completedSteps - b.completedSteps); // stuck orgs first
      setOnboardingOrgs(builtOnboarding);

    } catch (err: any) {
      toast({ title: "Failed to load admin data", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => { if (!orgLoading && hasRole("owner")) fetchData(); }, [orgLoading, hasRole, fetchData]);
  const handleRefresh = () => { setRefreshing(true); fetchData(); };
  const toggleOrg = (id: string) => setOrgs((prev) => prev.map((o) => o.id === id ? { ...o, expanded: !o.expanded } : o));

  const handleUpdateRole = async (memberId: string, orgId: string, newRole: MemberRole, profile: OrgMember["profile"]) => {
    const { error } = await supabase.from("organisation_members").update({ role: newRole }).eq("id", memberId);
    if (error) { toast({ title: "Failed to update role", description: error.message, variant: "destructive" }); return; }
    await logAdminAction(user!.id, "ROLE_CHANGE", "organisation_member", memberId, orgId, { new_role: newRole, user_email: profile?.email });
    setOrgs((prev) => prev.map((o) => o.id === orgId ? { ...o, members: o.members.map((m) => m.id === memberId ? { ...m, role: newRole } : m) } : o));
    toast({ title: "Role updated", description: `Changed to ${roleLabels[newRole]}` });
  };

  const handleToggleStatus = (member: OrgMember, orgId: string) => {
    if (member.status === "invited") { toast({ title: "Invite resent", description: `Re-sent to ${member.profile?.email}` }); return; }
    setConfirmAction({ type: member.status === "active" ? "deactivate" : "reactivate", member, orgId });
  };

  const executeStatusChange = async () => {
    if (!confirmAction) return;
    const { type, member, orgId } = confirmAction;
    const newStatus: MemberStatus = type === "deactivate" ? "deactivated" : "active";
    const { error } = await supabase.from("organisation_members").update({ status: newStatus }).eq("id", member.id);
    setConfirmAction(null);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    await logAdminAction(user!.id, type === "deactivate" ? "DEACTIVATE_USER" : "REACTIVATE_USER", "organisation_member", member.id, orgId, { user_email: member.profile?.email });
    setOrgs((prev) => prev.map((o) => o.id === orgId ? { ...o, members: o.members.map((m) => m.id === member.id ? { ...m, status: newStatus } : m) } : o));
    setStats((prev) => ({ ...prev, activeUsers: type === "deactivate" ? prev.activeUsers - 1 : prev.activeUsers + 1, deactivatedUsers: type === "deactivate" ? prev.deactivatedUsers + 1 : prev.deactivatedUsers - 1 }));
    toast({ title: type === "deactivate" ? "User deactivated" : "User reactivated" });
  };

  const handleImpersonate = async (org: Organisation) => {
    setImpersonating(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-impersonate", { body: { target_org_id: org.id } });
      if (error) throw error;
      await logAdminAction(user!.id, "IMPERSONATE_ORG", "organisation", org.id, org.id, { org_name: org.name });
      toast({ title: `Viewing as ${org.name}`, description: "Session active. All actions are logged." });
      setImpersonateOrg(null);
    } catch {
      toast({ title: "Backend function required", description: "Deploy supabase/functions/admin-impersonate/index.ts to enable impersonation.", variant: "destructive" });
    } finally {
      setImpersonating(false);
    }
  };

  const handleCreateOrg = async () => {
    if (!newOrg.name.trim() || !newOrg.ownerEmail.trim()) return;
    setCreatingOrg(true);
    try {
      const slug = `${newOrg.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now().toString(36)}`;
      const { data: orgData, error } = await supabase.from("organisations").insert({ name: newOrg.name.trim(), slug, subscription_status: "trialing", trial_ends_at: addDays(new Date(), 14).toISOString() } as any).select().single();
      if (error) throw error;
      await logAdminAction(user!.id, "CREATE_ORG", "organisation", orgData.id, orgData.id, { org_name: newOrg.name, owner_email: newOrg.ownerEmail });
      toast({ title: "Organisation created", description: `${newOrg.name} is live with a 14-day trial.` });
      setCreateOrgOpen(false);
      setNewOrg({ name: "", ownerEmail: "" });
      fetchData();
    } catch (err: any) {
      toast({ title: "Failed to create org", description: err.message, variant: "destructive" });
    } finally {
      setCreatingOrg(false);
    }
  };

  const handleSubOverride = async () => {
    if (!subOverrideOrg) return;
    setSavingSubOverride(true);
    try {
      const updates: Record<string, unknown> = {
        subscription_tier: subOverride.tier,
        subscription_status: subOverride.status,
      };
      if (subOverride.status === "trialing") {
        updates.trial_ends_at = addDays(new Date(), parseInt(subOverride.trialDays) || 14).toISOString();
      } else {
        updates.trial_ends_at = null;
      }
      const { error } = await supabase.from("organisations").update(updates as any).eq("id", subOverrideOrg.id);
      if (error) throw error;
      await logAdminAction(user!.id, "SUB_OVERRIDE", "organisation", subOverrideOrg.id, subOverrideOrg.id, {
        org_name: subOverrideOrg.name,
        prev_tier: subOverrideOrg.subscription_tier,
        prev_status: subOverrideOrg.subscription_status,
        new_tier: subOverride.tier,
        new_status: subOverride.status,
      });
      setOrgs((prev) => prev.map((o) => o.id === subOverrideOrg.id ? {
        ...o,
        subscription_tier: subOverride.tier,
        subscription_status: subOverride.status,
        trial_ends_at: updates.trial_ends_at as string | null,
      } : o));
      toast({ title: "Subscription updated", description: `${subOverrideOrg.name} → ${subOverride.tier} / ${subOverride.status}` });
      setSubOverrideOrg(null);
    } catch (err: any) {
      toast({ title: "Failed to update subscription", description: err.message, variant: "destructive" });
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
      if (inserts.length > 0) await supabase.from("activity_logs").insert(inserts as any);
      await logAdminAction(user!.id, "BROADCAST", "broadcast", null, null, { subject: broadcast.subject, tier: broadcast.tier, org_count: inserts.length });
      toast({ title: "Broadcast sent", description: `Delivered to ${inserts.length} organisation${inserts.length !== 1 ? "s" : ""}.` });
      setBroadcastOpen(false);
      setBroadcast({ subject: "", message: "", tier: "all" });
    } catch (err: any) {
      toast({ title: "Broadcast failed", description: err.message, variant: "destructive" });
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

  const filteredAuditEvents = auditEvents.filter((e) => {
    const qs = auditSearch.toLowerCase();
    const matchSearch = !qs || e.action.toLowerCase().includes(qs) || e.entity_type.toLowerCase().includes(qs) || (e.orgName ?? "").toLowerCase().includes(qs);
    const matchEntity = auditEntityFilter === "all" || e.entity_type === auditEntityFilter;
    return matchSearch && matchEntity;
  });
  const auditEntityTypes = [...new Set(auditEvents.map((e) => e.entity_type))].sort();

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
            <Button variant="outline" size="sm" onClick={() => setBroadcastOpen(true)}>
              <Megaphone className="h-4 w-4 mr-2" />Broadcast
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCreateOrgOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />New Org
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats — Users */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard icon={<Building2 className="h-4 w-4 text-primary" />} label="Organisations" value={stats.totalOrgs} color="bg-primary/10" />
          <StatCard icon={<Users className="h-4 w-4 text-blue-600" />} label="Total Users" value={stats.totalUsers} color="bg-blue-500/10" />
          <StatCard icon={<CheckCircle className="h-4 w-4 text-emerald-600" />} label="Active Users" value={stats.activeUsers} color="bg-emerald-500/10" />
          <StatCard icon={<Clock className="h-4 w-4 text-amber-600" />} label="Pending Invites" value={stats.pendingInvites} color="bg-amber-500/10" />
          <StatCard icon={<XCircle className="h-4 w-4 text-destructive" />} label="Deactivated" value={stats.deactivatedUsers} color="bg-destructive/10" />
        </div>

        {/* Stats — Revenue */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard icon={<TrendingUp className="h-4 w-4 text-emerald-600" />} label="Est. MRR" value={`£${stats.mrr.toLocaleString()}`} sub="active + past_due" color="bg-emerald-500/10" />
          <StatCard icon={<CreditCard className="h-4 w-4 text-blue-600" />} label="Active Subs" value={stats.activeSubscriptions} color="bg-blue-500/10" />
          <StatCard icon={<Zap className="h-4 w-4 text-amber-600" />} label="On Trial" value={stats.trialing} color="bg-amber-500/10" />
          <StatCard icon={<AlertCircle className="h-4 w-4 text-red-600" />} label="Past Due" value={stats.pastDue} color="bg-red-500/10" alert={stats.pastDue > 0} />
          <StatCard icon={<Ban className="h-4 w-4 text-muted-foreground" />} label="Cancelled" value={stats.cancelled} color="bg-muted" />
        </div>

        {/* Alert banners */}
        {stats.pastDue > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-800">
            <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">
              <strong>{stats.pastDue} organisation{stats.pastDue !== 1 ? "s" : ""}</strong> have past-due subscriptions. Check Stripe.
            </p>
          </div>
        )}
        {riddorIncidents.length > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
            <ShieldAlert className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              <strong>{riddorIncidents.length} open RIDDOR-reportable incident{riddorIncidents.length !== 1 ? "s" : ""}</strong> across the platform.
            </p>
          </div>
        )}

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search users, emails, organisations…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="orgs">
          <TabsList className="flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="orgs" className="gap-1.5 text-xs h-8">
              <Building2 className="h-3.5 w-3.5" />Organisations
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5 text-xs h-8">
              <Users className="h-3.5 w-3.5" />All Users
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-1.5 text-xs h-8">
              <CreditCard className="h-3.5 w-3.5" />Billing
            </TabsTrigger>
            <TabsTrigger value="riddor" className="gap-1.5 text-xs h-8 relative">
              <ShieldAlert className="h-3.5 w-3.5" />RIDDOR
              {riddorIncidents.length > 0 && <span className="ml-1 bg-destructive text-destructive-foreground text-[9px] rounded-full px-1 leading-4">{riddorIncidents.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="compliance" className="gap-1.5 text-xs h-8">
              <FileWarning className="h-3.5 w-3.5" />Compliance Alerts
              {complianceAlerts.filter(a => a.daysUntilExpiry <= 7).length > 0 && <span className="ml-1 bg-amber-500 text-white text-[9px] rounded-full px-1 leading-4">{complianceAlerts.filter(a => a.daysUntilExpiry <= 7).length}</span>}
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-1.5 text-xs h-8">
              <History className="h-3.5 w-3.5" />Audit Log
            </TabsTrigger>
            <TabsTrigger value="admin-log" className="gap-1.5 text-xs h-8">
              <Shield className="h-3.5 w-3.5" />Admin Actions
            </TabsTrigger>
            <TabsTrigger value="churn" className="gap-1.5 text-xs h-8 relative">
              <TrendingDown className="h-3.5 w-3.5" />Churn Risk
              {churnOrgs.filter(o => o.risk === "critical").length > 0 && <span className="ml-1 bg-destructive text-destructive-foreground text-[9px] rounded-full px-1 leading-4">{churnOrgs.filter(o => o.risk === "critical").length}</span>}
            </TabsTrigger>
            <TabsTrigger value="onboarding" className="gap-1.5 text-xs h-8">
              <Sparkles className="h-3.5 w-3.5" />Onboarding
            </TabsTrigger>
          </TabsList>

          {/* ════ ORGANISATIONS ════ */}
          <TabsContent value="orgs" className="mt-4 space-y-3">
            {filteredOrgs.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No organisations match your search.</CardContent></Card>
            ) : filteredOrgs.map((org) => (
              <Card key={org.id} className="overflow-hidden">
                <button className="w-full text-left" onClick={() => toggleOrg(org.id)}>
                  <div className="px-5 py-4 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        {org.expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        <Building2 className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-semibold text-sm">{org.name}</p>
                          <p className="text-xs text-muted-foreground">{org.slug} · {format(new Date(org.created_at), "dd MMM yyyy")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {org.health && <HealthBadge score={org.health.score} />}
                        {org.subscription_tier && <Badge variant="secondary" className={`text-xs ${tierColors[org.subscription_tier]}`}>{org.subscription_tier}</Badge>}
                        {org.subscription_status && <Badge variant="secondary" className={`text-xs ${subStatusColors[org.subscription_status]}`}>{org.subscription_status}</Badge>}
                        <Badge variant="secondary" className="text-xs gap-1"><Users className="h-3 w-3" />{org.members.length}</Badge>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-purple-600" title="View as this org" onClick={(e) => { e.stopPropagation(); setImpersonateOrg(org); }}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {/* Health metrics row */}
                    {org.health && (
                      <div className="flex items-center gap-4 mt-2.5 ml-11 flex-wrap text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><HardHat className="h-3 w-3" />{org.health.liveProjects} live / {org.health.totalProjects} total</span>
                        <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{org.health.docsLast30} docs (30d)</span>
                        <span className="flex items-center gap-1"><BarChart2 className="h-3 w-3" />{org.health.ramsCreated} RAMS</span>
                        <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{org.health.totalIncidents} incidents</span>
                        {org.health.lastActivityAt && <span className="flex items-center gap-1"><Activity className="h-3 w-3" />Last active {format(new Date(org.health.lastActivityAt), "dd MMM")}</span>}
                        <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{formatBytes(org.storage_used_bytes)}</span>
                      </div>
                    )}
                  </div>
                </button>
                {org.expanded && (
                  <>
                    <Separator />
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/20">
                          <TableHead className="text-xs pl-6">User</TableHead>
                          <TableHead className="text-xs">Role</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                          <TableHead className="text-xs">Joined</TableHead>
                          <TableHead className="text-xs w-16">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {org.members.length === 0 ? (
                          <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-xs">No members.</TableCell></TableRow>
                        ) : org.members.map((member) => (
                          <TableRow key={member.id} className="hover:bg-muted/20">
                            <TableCell className="pl-6">
                              <button className="flex items-center gap-2.5 text-left hover:underline" onClick={() => { setDetailMember(member); setDetailOrgName(org.name); setDetailOrgId(org.id); setDetailOpen(true); }}>
                                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                                  {member.profile?.full_name?.charAt(0)?.toUpperCase() ?? "?"}
                                </div>
                                <div>
                                  <p className="font-medium text-xs">{member.profile?.full_name ?? "—"}</p>
                                  <p className="text-xs text-muted-foreground">{member.profile?.email ?? "—"}</p>
                                </div>
                              </button>
                            </TableCell>
                            <TableCell>
                              <Select value={member.role} onValueChange={(v) => handleUpdateRole(member.id, org.id, v as MemberRole, member.profile)} disabled={member.role === "owner"}>
                                <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {(Object.keys(roleLabels) as MemberRole[]).filter(r => r !== "owner").map(r => (
                                    <SelectItem key={r} value={r} className="text-xs">{roleLabels[r]}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={`text-xs gap-1 ${statusConfig[member.status].color}`}>
                                {statusConfig[member.status].icon}{statusConfig[member.status].label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {member.accepted_at ? format(new Date(member.accepted_at), "dd MMM yyyy") : member.invited_at ? `Invited ${format(new Date(member.invited_at), "dd MMM")}` : "—"}
                            </TableCell>
                            <TableCell>
                              {member.status === "active" && member.role !== "owner" && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => handleToggleStatus(member, org.id)}><UserX className="h-3.5 w-3.5" /></Button>
                              )}
                              {member.status === "deactivated" && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-emerald-600" onClick={() => handleToggleStatus(member, org.id)}><UserCheck className="h-3.5 w-3.5" /></Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}
              </Card>
            ))}
          </TabsContent>

          {/* ════ ALL USERS ════ */}
          <TabsContent value="users" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">All Platform Users</CardTitle>
                <CardDescription>{filteredAllMembers.length} user{filteredAllMembers.length !== 1 ? "s" : ""}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead className="text-xs pl-6">User</TableHead>
                      <TableHead className="text-xs">Organisation</TableHead>
                      <TableHead className="text-xs">Role</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Joined</TableHead>
                      <TableHead className="text-xs w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAllMembers.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">No users match search.</TableCell></TableRow>
                    ) : filteredAllMembers.map((m) => (
                      <TableRow key={m.id} className="hover:bg-muted/20">
                        <TableCell className="pl-6">
                          <button className="flex items-center gap-2.5 text-left hover:underline" onClick={() => { setDetailMember(m); setDetailOrgName(m.orgName); setDetailOrgId(m.orgId); setDetailOpen(true); }}>
                            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                              {m.profile?.full_name?.charAt(0)?.toUpperCase() ?? "?"}
                            </div>
                            <div>
                              <p className="font-medium text-xs">{m.profile?.full_name ?? "—"}</p>
                              <p className="text-xs text-muted-foreground">{m.profile?.email ?? "—"}</p>
                            </div>
                          </button>
                        </TableCell>
                        <TableCell className="text-xs"><span className="flex items-center gap-1.5"><Building className="h-3 w-3 text-muted-foreground" />{m.orgName}</span></TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`text-xs ${roleColors[m.role]}`}>
                            {m.role === "owner" && <Crown className="h-3 w-3 mr-1" />}{roleLabels[m.role]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`text-xs gap-1 ${statusConfig[m.status].color}`}>
                            {statusConfig[m.status].icon}{statusConfig[m.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{m.accepted_at ? format(new Date(m.accepted_at), "dd MMM yyyy") : "—"}</TableCell>
                        <TableCell>
                          {m.status === "active" && m.role !== "owner" && <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => handleToggleStatus(m, m.orgId)}><UserX className="h-3.5 w-3.5" /></Button>}
                          {m.status === "deactivated" && <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-emerald-600" onClick={() => handleToggleStatus(m, m.orgId)}><UserCheck className="h-3.5 w-3.5" /></Button>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ════ BILLING ════ */}
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
                        <TableCell>
                          <Badge variant="secondary" className={`text-xs ${tierColors[org.subscription_tier ?? "starter"]}`}>{org.subscription_tier ?? "—"}</Badge>
                        </TableCell>
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

          {/* ════ RIDDOR TRACKER ════ */}
          <TabsContent value="riddor" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-destructive" />RIDDOR Tracker
                  {riddorIncidents.length > 0 && <Badge variant="destructive" className="text-xs">{riddorIncidents.length} open</Badge>}
                </CardTitle>
                <CardDescription>Open RIDDOR-reportable incidents across all organisations. Fatal/specified injuries must be reported to HSE within 10 days.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {riddorIncidents.length === 0 ? (
                  <div className="py-12 text-center">
                    <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                    <p className="text-sm font-medium">No open RIDDOR incidents</p>
                    <p className="text-xs text-muted-foreground mt-1">All reportable incidents are closed.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/20">
                        <TableHead className="text-xs pl-6">Incident</TableHead>
                        <TableHead className="text-xs">Organisation</TableHead>
                        <TableHead className="text-xs">Severity</TableHead>
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs">RIDDOR Filed</TableHead>
                        <TableHead className="text-xs">Days</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {riddorIncidents.map((inc) => {
                        const daysSince = differenceInDays(new Date(), new Date(inc.incident_date));
                        const overdue = !inc.riddor_reported_at && daysSince > 10;
                        return (
                          <TableRow key={inc.id} className={`hover:bg-muted/20 ${overdue ? "bg-red-50/40 dark:bg-red-950/10" : ""}`}>
                            <TableCell className="pl-6">
                              <p className="font-medium text-xs">{inc.title}</p>
                              <p className="text-xs text-muted-foreground">{inc.incident_number} · {inc.project?.name ?? "No project"}</p>
                            </TableCell>
                            <TableCell className="text-xs">{inc.orgName}</TableCell>
                            <TableCell><Badge variant="destructive" className="text-xs capitalize">{inc.severity.replace("_", " ")}</Badge></TableCell>
                            <TableCell className="text-xs">{format(new Date(inc.incident_date), "dd MMM yyyy")}</TableCell>
                            <TableCell>
                              {inc.riddor_reported_at
                                ? <span className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle className="h-3 w-3" />{format(new Date(inc.riddor_reported_at), "dd MMM")}</span>
                                : <span className={`text-xs flex items-center gap-1 ${overdue ? "text-destructive font-semibold" : "text-amber-600"}`}>{overdue ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}{overdue ? "OVERDUE" : "Pending"}</span>}
                            </TableCell>
                            <TableCell className={`text-xs font-mono ${overdue ? "text-destructive font-bold" : ""}`}>{daysSince}d</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ════ COMPLIANCE ALERTS ════ */}
          <TabsContent value="compliance" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileWarning className="h-4 w-4 text-amber-600" />Compliance Document Alerts
                </CardTitle>
                <CardDescription>Contractor documents expired or expiring within 30 days platform-wide.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {complianceAlerts.length === 0 ? (
                  <div className="py-12 text-center">
                    <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                    <p className="text-sm font-medium">No expiring documents</p>
                    <p className="text-xs text-muted-foreground mt-1">All contractor documents are valid for the next 30 days.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/20">
                        <TableHead className="text-xs pl-6">Document Type</TableHead>
                        <TableHead className="text-xs">Organisation</TableHead>
                        <TableHead className="text-xs">Contractor</TableHead>
                        <TableHead className="text-xs">Expires</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {complianceAlerts.map((alert) => (
                        <TableRow key={alert.id} className={`hover:bg-muted/20 ${alert.daysUntilExpiry < 0 ? "bg-red-50/40 dark:bg-red-950/10" : alert.daysUntilExpiry <= 7 ? "bg-amber-50/40 dark:bg-amber-950/10" : ""}`}>
                          <TableCell className="pl-6 text-xs font-medium capitalize">{alert.doc_type.replace(/_/g, " ")}</TableCell>
                          <TableCell className="text-xs">{alert.orgName}</TableCell>
                          <TableCell className="text-xs">{alert.contractor?.company_name ?? "—"}</TableCell>
                          <TableCell className="text-xs">{format(new Date(alert.expiry_date), "dd MMM yyyy")}</TableCell>
                          <TableCell>
                            {alert.daysUntilExpiry < 0
                              ? <Badge variant="destructive" className="text-xs">Expired {Math.abs(alert.daysUntilExpiry)}d ago</Badge>
                              : alert.daysUntilExpiry <= 7
                              ? <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-700">Expires in {alert.daysUntilExpiry}d</Badge>
                              : <Badge variant="secondary" className="text-xs">{alert.daysUntilExpiry}d remaining</Badge>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ════ AUDIT LOG ════ */}
          <TabsContent value="audit" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4" />Cross-Platform Audit Log</CardTitle>
                <CardDescription>Security events across all organisations — last 300 events.</CardDescription>
                <div className="flex gap-2 mt-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input placeholder="Search actions, entity types, orgs…" value={auditSearch} onChange={(e) => setAuditSearch(e.target.value)} className="pl-9 h-8 text-xs" />
                  </div>
                  <Select value={auditEntityFilter} onValueChange={setAuditEntityFilter}>
                    <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">All types</SelectItem>
                      {auditEntityTypes.map((t) => <SelectItem key={t} value={t} className="text-xs capitalize">{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[480px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/20">
                        <TableHead className="text-xs pl-6">Action</TableHead>
                        <TableHead className="text-xs">Entity</TableHead>
                        <TableHead className="text-xs">Organisation</TableHead>
                        <TableHead className="text-xs">When</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAuditEvents.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground text-xs">No events match filters.</TableCell></TableRow>
                      ) : filteredAuditEvents.map((e) => (
                        <TableRow key={e.id} className="hover:bg-muted/20">
                          <TableCell className="pl-6">
                            <Badge variant="secondary" className={`text-xs font-mono ${e.action.startsWith("INSERT") ? "bg-emerald-500/10 text-emerald-700" : e.action.startsWith("DELETE") ? "bg-destructive/10 text-destructive" : e.action.startsWith("ADMIN_") ? "bg-purple-500/10 text-purple-700" : "bg-amber-500/10 text-amber-700"}`}>
                              {e.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs capitalize">{e.entity_type}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{e.orgName ?? "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(e.created_at), "dd MMM, HH:mm")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ════ ADMIN ACTIONS ════ */}
          <TabsContent value="admin-log" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4 text-purple-600" />Admin Action Log</CardTitle>
                <CardDescription>Immutable record of all actions taken from this admin panel. Written to audit_events and cannot be modified.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {adminLog.length === 0 ? (
                  <div className="py-12 text-center">
                    <Shield className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm font-medium">No admin actions yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Actions taken from this panel appear here.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/20">
                        <TableHead className="text-xs pl-6">Action</TableHead>
                        <TableHead className="text-xs">Target</TableHead>
                        <TableHead className="text-xs">When</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adminLog.map((log) => (
                        <TableRow key={log.id} className="hover:bg-muted/20">
                          <TableCell className="pl-6">
                            <Badge variant="secondary" className="text-xs bg-purple-500/10 text-purple-700 font-mono">{log.action}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{log.target}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{format(new Date(log.created_at), "dd MMM yyyy, HH:mm")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ════ CHURN DASHBOARD ════ */}
          <TabsContent value="churn" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-destructive" />Churn Risk Dashboard
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">{churnOrgs.length} organisation{churnOrgs.length !== 1 ? "s" : ""} flagged · Sorted by risk then MRR</p>
              </div>
              <div className="flex gap-2 text-xs">
                <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Critical: {churnOrgs.filter(o => o.risk === "critical").length}</Badge>
                <Badge variant="secondary" className="gap-1 bg-amber-500/10 text-amber-700"><AlertCircle className="h-3 w-3" />High: {churnOrgs.filter(o => o.risk === "high").length}</Badge>
                <Badge variant="secondary" className="gap-1">Medium: {churnOrgs.filter(o => o.risk === "medium").length}</Badge>
              </div>
            </div>

            {churnOrgs.length === 0 ? (
              <Card><CardContent className="py-12 text-center">
                <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                <p className="text-sm font-medium">No churn signals detected</p>
                <p className="text-xs text-muted-foreground mt-1">All active organisations look healthy.</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-2">
                {churnOrgs.map((org) => (
                  <Card key={org.id} className={`border-l-4 ${org.risk === "critical" ? "border-l-destructive" : org.risk === "high" ? "border-l-amber-500" : "border-l-slate-300"}`}>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 ${org.risk === "critical" ? "bg-destructive/10" : org.risk === "high" ? "bg-amber-500/10" : "bg-muted"}`}>
                            {org.risk === "critical" ? <AlertTriangle className="h-4 w-4 text-destructive" /> : org.risk === "high" ? <AlertCircle className="h-4 w-4 text-amber-600" /> : <Info className="h-4 w-4 text-muted-foreground" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm">{org.name}</p>
                              {org.subscription_tier && <Badge variant="secondary" className={`text-xs ${tierColors[org.subscription_tier]}`}>{org.subscription_tier}</Badge>}
                              {org.subscription_status && <Badge variant="secondary" className={`text-xs ${subStatusColors[org.subscription_status]}`}>{org.subscription_status}</Badge>}
                              {org.mrr > 0 && <Badge variant="secondary" className="text-xs font-mono">£{org.mrr}/mo</Badge>}
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {org.reasons.map((r, i) => (
                                <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${org.risk === "critical" ? "bg-destructive/10 text-destructive" : org.risk === "high" ? "bg-amber-500/10 text-amber-700" : "bg-muted text-muted-foreground"}`}>{r}</span>
                              ))}
                            </div>
                            {org.lastActivityAt && (
                              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <Activity className="h-3 w-3" />Last active {format(new Date(org.lastActivityAt), "dd MMM yyyy")}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {org.ownerEmail && (
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" asChild>
                              <a href={`mailto:${org.ownerEmail}?subject=Your SiteSafe Cloud account&body=Hi,%0A%0AI wanted to reach out about your SiteSafe Cloud account...`}>
                                <Mail className="h-3.5 w-3.5" />Contact Owner
                              </a>
                            </Button>
                          )}
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => {
                            const fullOrg = orgs.find(o => o.id === org.id);
                            if (fullOrg) { setSubOverrideOrg(fullOrg); setSubOverride({ tier: fullOrg.subscription_tier ?? "starter", status: fullOrg.subscription_status ?? "trialing", trialDays: "14" }); }
                          }}>
                            <CreditCard className="h-3.5 w-3.5" />Override Sub
                          </Button>
                          {org.stripe_customer_id && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" asChild>
                              <a href={`https://dashboard.stripe.com/customers/${org.stripe_customer_id}`} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3.5 w-3.5" />Stripe
                              </a>
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

          {/* ════ ONBOARDING TRACKER ════ */}
          <TabsContent value="onboarding" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />Onboarding Progress Tracker
                </CardTitle>
                <CardDescription>
                  Where each organisation is in their activation journey — sorted by least progress first.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead className="text-xs pl-6">Organisation</TableHead>
                      <TableHead className="text-xs">Progress</TableHead>
                      <TableHead className="text-xs text-center" title="Profile complete">Profile</TableHead>
                      <TableHead className="text-xs text-center" title="First project created">Project</TableHead>
                      <TableHead className="text-xs text-center" title="First document uploaded">Doc</TableHead>
                      <TableHead className="text-xs text-center" title="First RAMS created">RAMS</TableHead>
                      <TableHead className="text-xs text-center" title="Team member invited">Team</TableHead>
                      <TableHead className="text-xs text-center" title="First inspection">Inspect</TableHead>
                      <TableHead className="text-xs text-center" title="First toolbox talk">Talk</TableHead>
                      <TableHead className="text-xs text-center" title="First induction completed">Induct</TableHead>
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
                              {done
                                ? <CheckCircle className="h-4 w-4 text-emerald-500 mx-auto" />
                                : <XCircle className="h-4 w-4 text-muted-foreground/40 mx-auto" />}
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
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {detailMember.profile?.full_name?.charAt(0)?.toUpperCase() ?? "?"}
                  </div>
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
            <DialogDescription>Access <strong>{impersonateOrg?.name}</strong> as an admin observer. All actions are logged.</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 p-3 text-xs text-amber-700 flex gap-2">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">This session is fully logged</p>
              <p className="mt-0.5">Requires <code className="font-mono bg-amber-100 px-1 rounded">supabase/functions/admin-impersonate</code> Edge Function to be deployed. See docs for setup instructions.</p>
            </div>
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
            <DialogDescription>Creates a new organisation with a 14-day trial. Send an invite from Team to grant owner access.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Organisation Name</Label>
              <Input placeholder="e.g. Acme Construction Ltd" value={newOrg.name} onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Owner Email (for records)</Label>
              <Input type="email" placeholder="owner@example.com" value={newOrg.ownerEmail} onChange={(e) => setNewOrg({ ...newOrg, ownerEmail: e.target.value })} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateOrgOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateOrg} disabled={creatingOrg || !newOrg.name.trim() || !newOrg.ownerEmail.trim()}>
              {creatingOrg ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PlusCircle className="h-4 w-4 mr-2" />}
              Create Organisation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Broadcast */}
      <Dialog open={broadcastOpen} onOpenChange={setBroadcastOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5 text-primary" />Platform Broadcast</DialogTitle>
            <DialogDescription>Posts an announcement to each organisation's Activity feed.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs">Subject (optional)</Label>
                <Input placeholder="e.g. Scheduled maintenance" value={broadcast.subject} onChange={(e) => setBroadcast({ ...broadcast, subject: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Send to</Label>
                <Select value={broadcast.tier} onValueChange={(v) => setBroadcast({ ...broadcast, tier: v })}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All orgs</SelectItem>
                    <SelectItem value="starter">Starter only</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Message</Label>
              <Textarea placeholder="Your announcement…" rows={4} value={broadcast.message} onChange={(e) => setBroadcast({ ...broadcast, message: e.target.value })} />
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground flex gap-2">
              <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>Reaches <strong>{orgs.filter(o => broadcast.tier === "all" || o.subscription_tier === broadcast.tier).length} organisation{orgs.filter(o => broadcast.tier === "all" || o.subscription_tier === broadcast.tier).length !== 1 ? "s" : ""}</strong> via their Activity feed. Not an email or push notification.</span>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBroadcastOpen(false)}>Cancel</Button>
            <Button onClick={handleBroadcast} disabled={broadcasting || !broadcast.message.trim()}>
              {broadcasting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Send Broadcast
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
                ? <><strong>{confirmAction.member.profile?.full_name}</strong> will lose access immediately. Data is retained. This is logged.</>
                : <><strong>{confirmAction?.member.profile?.full_name}</strong> will regain access with their previous role.</>}
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
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />Override Subscription
            </DialogTitle>
            <DialogDescription>
              Manually set plan and status for <strong>{subOverrideOrg?.name}</strong>. Changes take effect immediately and are logged. Does not affect Stripe billing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Plan Tier</Label>
                <Select value={subOverride.tier} onValueChange={(v) => setSubOverride({ ...subOverride, tier: v as SubTier })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter — £49/mo</SelectItem>
                    <SelectItem value="professional">Professional — £99/mo</SelectItem>
                    <SelectItem value="enterprise">Enterprise — £199/mo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
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
                <Label className="text-xs">Trial Length (days from now)</Label>
                <Input
                  type="number" min="1" max="365"
                  value={subOverride.trialDays}
                  onChange={(e) => setSubOverride({ ...subOverride, trialDays: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Trial will end {addDays(new Date(), parseInt(subOverride.trialDays) || 14).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
            )}
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground flex gap-2">
              <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>This updates the database directly. To also change Stripe billing, update the subscription in <a href={subOverrideOrg?.stripe_customer_id ? `https://dashboard.stripe.com/customers/${subOverrideOrg.stripe_customer_id}` : "https://dashboard.stripe.com"} target="_blank" rel="noopener noreferrer" className="underline">Stripe Dashboard</a>.</span>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSubOverrideOrg(null)}>Cancel</Button>
            <Button onClick={handleSubOverride} disabled={savingSubOverride}>
              {savingSubOverride ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
              Apply Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
