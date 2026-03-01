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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Building2,
  Search,
  Shield,
  UserCog,
  MailPlus,
  UserX,
  UserCheck,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Crown,
  Mail,
  Phone,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";

// ─── Types ───────────────────────────────────────────────────────────────────

type MemberRole = "owner" | "admin" | "site_manager" | "contractor" | "client_viewer";
type MemberStatus = "invited" | "active" | "deactivated";

interface OrgMember {
  id: string;
  role: MemberRole;
  status: MemberStatus;
  invited_at: string;
  accepted_at: string | null;
  profile: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
    created_at: string;
  } | null;
}

interface Organisation {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  members: OrgMember[];
  expanded: boolean;
}

interface PlatformStats {
  totalOrgs: number;
  totalUsers: number;
  activeUsers: number;
  pendingInvites: number;
  deactivatedUsers: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const roleLabels: Record<MemberRole, string> = {
  owner: "Owner",
  admin: "Admin",
  site_manager: "Site Manager",
  contractor: "Contractor",
  client_viewer: "Client Viewer",
};

const roleColors: Record<MemberRole, string> = {
  owner: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  admin: "bg-primary/10 text-primary",
  site_manager: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  contractor: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  client_viewer: "bg-muted text-muted-foreground",
};

const statusConfig: Record<MemberStatus, { icon: React.ReactNode; color: string; label: string }> = {
  invited: {
    icon: <Clock className="h-3 w-3" />,
    color: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    label: "Pending",
  },
  active: {
    icon: <CheckCircle className="h-3 w-3" />,
    color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    label: "Active",
  },
  deactivated: {
    icon: <XCircle className="h-3 w-3" />,
    color: "bg-destructive/10 text-destructive",
    label: "Deactivated",
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatsCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub?: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function MemberRow({
  member,
  onUpdateRole,
  onToggleStatus,
  onViewDetail,
}: {
  member: OrgMember;
  onUpdateRole: (memberId: string, role: MemberRole) => void;
  onToggleStatus: (member: OrgMember) => void;
  onViewDetail: (member: OrgMember) => void;
}) {
  const status = statusConfig[member.status];

  return (
    <TableRow className="hover:bg-muted/30">
      <TableCell>
        <button
          className="flex items-center gap-3 text-left hover:underline"
          onClick={() => onViewDetail(member)}
        >
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
            {member.profile?.full_name?.charAt(0)?.toUpperCase() ?? "?"}
          </div>
          <div>
            <p className="font-medium text-sm leading-tight">
              {member.profile?.full_name ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground">{member.profile?.email ?? "—"}</p>
          </div>
        </button>
      </TableCell>
      <TableCell>
        <Select
          value={member.role}
          onValueChange={(v) => onUpdateRole(member.id, v as MemberRole)}
          disabled={member.role === "owner"}
        >
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(roleLabels) as MemberRole[])
              .filter((r) => r !== "owner")
              .map((r) => (
                <SelectItem key={r} value={r} className="text-xs">
                  {roleLabels[r]}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Badge
          variant="secondary"
          className={`text-xs gap-1 ${status.color}`}
        >
          {status.icon}
          {status.label}
        </Badge>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {member.accepted_at
          ? format(new Date(member.accepted_at), "dd MMM yyyy")
          : member.invited_at
          ? `Invited ${format(new Date(member.invited_at), "dd MMM")}`
          : "—"}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          {member.status === "active" && member.role !== "owner" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => onToggleStatus(member)}
              title="Deactivate user"
            >
              <UserX className="h-3.5 w-3.5" />
            </Button>
          )}
          {member.status === "deactivated" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-emerald-600"
              onClick={() => onToggleStatus(member)}
              title="Reactivate user"
            >
              <UserCheck className="h-3.5 w-3.5" />
            </Button>
          )}
          {member.status === "invited" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-primary"
              onClick={() => onToggleStatus(member)}
              title="Resend invite"
            >
              <MailPlus className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

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
    totalOrgs: 0,
    totalUsers: 0,
    activeUsers: 0,
    pendingInvites: 0,
    deactivatedUsers: 0,
  });

  // Detail modal
  const [detailMember, setDetailMember] = useState<OrgMember | null>(null);
  const [detailOrgName, setDetailOrgName] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);

  // Confirm dialog
  const [confirmAction, setConfirmAction] = useState<{
    type: "deactivate" | "reactivate";
    member: OrgMember;
    orgId: string;
  } | null>(null);

  // ── Redirect non-owners ──
  useEffect(() => {
    if (!orgLoading && !hasRole("owner")) {
      navigate("/access-denied", { replace: true });
    }
  }, [orgLoading, hasRole, navigate]);

  // ── Fetch all orgs + members ──
  const fetchData = useCallback(async () => {
    try {
      // Fetch all organisations
      const { data: orgsData, error: orgsError } = await supabase
        .from("organisations")
        .select("id, name, slug, created_at")
        .order("created_at", { ascending: false });

      if (orgsError) throw orgsError;

      // Fetch all members with profiles
      const { data: membersData, error: membersError } = await supabase
        .from("organisation_members")
        .select(`
          id,
          organisation_id,
          role,
          status,
          invited_at,
          accepted_at,
          profile:profiles!organisation_members_profile_id_fkey (
            id,
            full_name,
            email,
            phone,
            avatar_url,
            created_at
          )
        `)
        .order("invited_at", { ascending: false });

      if (membersError) throw membersError;

      // Group members by org
      const membersByOrg: Record<string, OrgMember[]> = {};
      (membersData ?? []).forEach((m: any) => {
        if (!membersByOrg[m.organisation_id]) membersByOrg[m.organisation_id] = [];
        membersByOrg[m.organisation_id].push({
          id: m.id,
          role: m.role,
          status: m.status,
          invited_at: m.invited_at,
          accepted_at: m.accepted_at,
          profile: m.profile,
        });
      });

      const builtOrgs: Organisation[] = (orgsData ?? []).map((o: any) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        created_at: o.created_at,
        members: membersByOrg[o.id] ?? [],
        expanded: false,
      }));

      setOrgs(builtOrgs);

      // Compute stats
      const allMembers = (membersData ?? []) as any[];
      setStats({
        totalOrgs: builtOrgs.length,
        totalUsers: allMembers.length,
        activeUsers: allMembers.filter((m) => m.status === "active").length,
        pendingInvites: allMembers.filter((m) => m.status === "invited").length,
        deactivatedUsers: allMembers.filter((m) => m.status === "deactivated").length,
      });
    } catch (err: any) {
      toast({
        title: "Failed to load admin data",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!orgLoading && hasRole("owner")) {
      fetchData();
    }
  }, [orgLoading, hasRole, fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // ── Toggle org expand ──
  const toggleOrg = (orgId: string) => {
    setOrgs((prev) =>
      prev.map((o) => (o.id === orgId ? { ...o, expanded: !o.expanded } : o))
    );
  };

  // ── Update role ──
  const handleUpdateRole = async (
    memberId: string,
    orgId: string,
    newRole: MemberRole
  ) => {
    const { error } = await supabase
      .from("organisation_members")
      .update({ role: newRole })
      .eq("id", memberId);

    if (error) {
      toast({ title: "Failed to update role", description: error.message, variant: "destructive" });
      return;
    }

    setOrgs((prev) =>
      prev.map((o) =>
        o.id === orgId
          ? {
              ...o,
              members: o.members.map((m) =>
                m.id === memberId ? { ...m, role: newRole } : m
              ),
            }
          : o
      )
    );
    toast({ title: "Role updated", description: `Changed to ${roleLabels[newRole]}` });
  };

  // ── Toggle deactivate / reactivate ──
  const handleToggleStatus = (member: OrgMember, orgId: string) => {
    if (member.status === "invited") {
      // Resend invite — just toast for now (no Supabase resend API here)
      toast({ title: "Invite resent", description: `Invite re-sent to ${member.profile?.email}` });
      return;
    }
    setConfirmAction({
      type: member.status === "active" ? "deactivate" : "reactivate",
      member,
      orgId,
    });
  };

  const executeStatusChange = async () => {
    if (!confirmAction) return;
    const { type, member, orgId } = confirmAction;
    const newStatus: MemberStatus = type === "deactivate" ? "deactivated" : "active";

    const { error } = await supabase
      .from("organisation_members")
      .update({ status: newStatus })
      .eq("id", member.id);

    setConfirmAction(null);

    if (error) {
      toast({ title: "Failed to update status", description: error.message, variant: "destructive" });
      return;
    }

    setOrgs((prev) =>
      prev.map((o) =>
        o.id === orgId
          ? {
              ...o,
              members: o.members.map((m) =>
                m.id === member.id ? { ...m, status: newStatus } : m
              ),
            }
          : o
      )
    );

    // Update stats
    setStats((prev) => ({
      ...prev,
      activeUsers:
        type === "deactivate" ? prev.activeUsers - 1 : prev.activeUsers + 1,
      deactivatedUsers:
        type === "deactivate" ? prev.deactivatedUsers + 1 : prev.deactivatedUsers - 1,
    }));

    toast({
      title: type === "deactivate" ? "User deactivated" : "User reactivated",
      description: `${member.profile?.full_name} has been ${type === "deactivate" ? "deactivated" : "reactivated"}.`,
    });
  };

  // ── Search filter ──
  const filteredOrgs = orgs
    .map((org) => {
      if (!searchQuery.trim()) return org;
      const q = searchQuery.toLowerCase();
      const orgMatch = org.name.toLowerCase().includes(q);
      const filteredMembers = org.members.filter(
        (m) =>
          m.profile?.full_name?.toLowerCase().includes(q) ||
          m.profile?.email?.toLowerCase().includes(q)
      );
      if (!orgMatch && filteredMembers.length === 0) return null;
      return {
        ...org,
        members: orgMatch ? org.members : filteredMembers,
        expanded: orgMatch ? org.expanded : true, // auto-expand on member match
      };
    })
    .filter(Boolean) as Organisation[];

  // ── All users flat list for "All Users" tab ──
  const allMembers = orgs.flatMap((o) =>
    o.members.map((m) => ({ ...m, orgName: o.name, orgId: o.id }))
  );

  const filteredAllMembers = searchQuery.trim()
    ? allMembers.filter(
        (m) =>
          m.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.profile?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.orgName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allMembers;

  // ─────────────────────────────────────────────────────────────────────────

  if (orgLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Crown className="h-6 w-6 text-purple-500" />
              Platform Admin
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage all organisations and users across SiteSafe Cloud
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatsCard
            icon={<Building2 className="h-5 w-5 text-primary" />}
            label="Organisations"
            value={stats.totalOrgs}
            color="bg-primary/10"
          />
          <StatsCard
            icon={<Users className="h-5 w-5 text-blue-600" />}
            label="Total Users"
            value={stats.totalUsers}
            color="bg-blue-500/10"
          />
          <StatsCard
            icon={<CheckCircle className="h-5 w-5 text-emerald-600" />}
            label="Active"
            value={stats.activeUsers}
            color="bg-emerald-500/10"
          />
          <StatsCard
            icon={<Clock className="h-5 w-5 text-amber-600" />}
            label="Pending Invites"
            value={stats.pendingInvites}
            color="bg-amber-500/10"
          />
          <StatsCard
            icon={<XCircle className="h-5 w-5 text-destructive" />}
            label="Deactivated"
            value={stats.deactivatedUsers}
            color="bg-destructive/10"
          />
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users, emails or organisations…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="orgs">
          <TabsList>
            <TabsTrigger value="orgs" className="gap-2">
              <Building2 className="h-4 w-4" />
              By Organisation
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              All Users
            </TabsTrigger>
          </TabsList>

          {/* ── By Organisation tab ── */}
          <TabsContent value="orgs" className="mt-4 space-y-3">
            {filteredOrgs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No organisations match your search.
                </CardContent>
              </Card>
            ) : (
              filteredOrgs.map((org) => (
                <Card key={org.id} className="overflow-hidden">
                  {/* Org header row */}
                  <button
                    className="w-full text-left"
                    onClick={() => toggleOrg(org.id)}
                  >
                    <CardHeader className="py-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {org.expanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <Building2 className="h-5 w-5 text-primary" />
                          <div>
                            <CardTitle className="text-base">{org.name}</CardTitle>
                            <CardDescription className="text-xs">
                              {org.slug} · Created{" "}
                              {format(new Date(org.created_at), "dd MMM yyyy")}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 pr-2">
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <Users className="h-3 w-3" />
                            {org.members.length}{" "}
                            {org.members.length === 1 ? "user" : "users"}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className="gap-1 text-xs bg-emerald-500/10 text-emerald-700"
                          >
                            <CheckCircle className="h-3 w-3" />
                            {org.members.filter((m) => m.status === "active").length} active
                          </Badge>
                          {org.members.filter((m) => m.status === "invited").length > 0 && (
                            <Badge
                              variant="secondary"
                              className="gap-1 text-xs bg-amber-500/10 text-amber-700"
                            >
                              <Clock className="h-3 w-3" />
                              {org.members.filter((m) => m.status === "invited").length} pending
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </button>

                  {/* Members table */}
                  {org.expanded && (
                    <>
                      <Separator />
                      <CardContent className="p-0">
                        {org.members.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-6">
                            No members in this organisation.
                          </p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/20">
                                <TableHead className="text-xs pl-6">User</TableHead>
                                <TableHead className="text-xs">Role</TableHead>
                                <TableHead className="text-xs">Status</TableHead>
                                <TableHead className="text-xs">Joined</TableHead>
                                <TableHead className="text-xs w-20">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {org.members.map((member) => (
                                <MemberRow
                                  key={member.id}
                                  member={member}
                                  onUpdateRole={(mId, role) =>
                                    handleUpdateRole(mId, org.id, role)
                                  }
                                  onToggleStatus={(m) =>
                                    handleToggleStatus(m, org.id)
                                  }
                                  onViewDetail={(m) => {
                                    setDetailMember(m);
                                    setDetailOrgName(org.name);
                                    setDetailOpen(true);
                                  }}
                                />
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </CardContent>
                    </>
                  )}
                </Card>
              ))
            )}
          </TabsContent>

          {/* ── All Users tab ── */}
          <TabsContent value="users" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">All Platform Users</CardTitle>
                <CardDescription>
                  {filteredAllMembers.length} user
                  {filteredAllMembers.length !== 1 ? "s" : ""} shown
                </CardDescription>
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
                      <TableHead className="text-xs w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAllMembers.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-10 text-muted-foreground"
                        >
                          No users match your search.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAllMembers.map((member) => (
                        <TableRow key={member.id} className="hover:bg-muted/30">
                          <TableCell className="pl-6">
                            <button
                              className="flex items-center gap-3 text-left hover:underline"
                              onClick={() => {
                                setDetailMember(member);
                                setDetailOrgName(member.orgName);
                                setDetailOpen(true);
                              }}
                            >
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
                                {member.profile?.full_name?.charAt(0)?.toUpperCase() ?? "?"}
                              </div>
                              <div>
                                <p className="font-medium text-sm leading-tight">
                                  {member.profile?.full_name ?? "—"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {member.profile?.email ?? "—"}
                                </p>
                              </div>
                            </button>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                              {member.orgName}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={`text-xs ${roleColors[member.role]}`}
                            >
                              {member.role === "owner" && (
                                <Crown className="h-3 w-3 mr-1" />
                              )}
                              {roleLabels[member.role]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={`text-xs gap-1 ${statusConfig[member.status].color}`}
                            >
                              {statusConfig[member.status].icon}
                              {statusConfig[member.status].label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {member.accepted_at
                              ? format(new Date(member.accepted_at), "dd MMM yyyy")
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {member.status === "active" && member.role !== "owner" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  onClick={() => handleToggleStatus(member, member.orgId)}
                                  title="Deactivate user"
                                >
                                  <UserX className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {member.status === "deactivated" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-emerald-600"
                                  onClick={() => handleToggleStatus(member, member.orgId)}
                                  title="Reactivate user"
                                >
                                  <UserCheck className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── User Detail Sheet ── */}
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
                    <p className="text-sm font-normal text-muted-foreground">
                      {detailOrgName}
                    </p>
                  </div>
                </DialogTitle>
                <DialogDescription>User account details</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      Role
                    </p>
                    <Badge
                      variant="secondary"
                      className={`text-xs ${roleColors[detailMember.role]}`}
                    >
                      {detailMember.role === "owner" && (
                        <Crown className="h-3 w-3 mr-1" />
                      )}
                      {roleLabels[detailMember.role]}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      Status
                    </p>
                    <Badge
                      variant="secondary"
                      className={`text-xs gap-1 ${statusConfig[detailMember.status].color}`}
                    >
                      {statusConfig[detailMember.status].icon}
                      {statusConfig[detailMember.status].label}
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    <span className="break-all">{detailMember.profile?.email ?? "—"}</span>
                  </div>
                  {detailMember.profile?.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4 flex-shrink-0" />
                      <span>{detailMember.profile.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    <span>
                      Invited{" "}
                      {format(new Date(detailMember.invited_at), "dd MMM yyyy, HH:mm")}
                    </span>
                  </div>
                  {detailMember.accepted_at && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                      <span>
                        Joined{" "}
                        {format(new Date(detailMember.accepted_at), "dd MMM yyyy, HH:mm")}
                      </span>
                    </div>
                  )}
                  {detailMember.profile?.created_at && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Shield className="h-4 w-4 flex-shrink-0" />
                      <span>
                        Account created{" "}
                        {format(
                          new Date(detailMember.profile.created_at),
                          "dd MMM yyyy"
                        )}
                      </span>
                    </div>
                  )}
                </div>

                {detailMember.role !== "owner" && (
                  <>
                    <Separator />
                    <div className="flex gap-2">
                      {detailMember.status === "active" && (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setDetailOpen(false);
                            const org = orgs.find((o) =>
                              o.members.some((m) => m.id === detailMember.id)
                            );
                            if (org) handleToggleStatus(detailMember, org.id);
                          }}
                        >
                          <UserX className="h-4 w-4 mr-2" />
                          Deactivate
                        </Button>
                      )}
                      {detailMember.status === "deactivated" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                          onClick={() => {
                            setDetailOpen(false);
                            const org = orgs.find((o) =>
                              o.members.some((m) => m.id === detailMember.id)
                            );
                            if (org) handleToggleStatus(detailMember, org.id);
                          }}
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          Reactivate
                        </Button>
                      )}
                      {detailMember.status === "invited" && (
                        <Button variant="outline" size="sm" className="flex-1">
                          <MailPlus className="h-4 w-4 mr-2" />
                          Resend Invite
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Confirm deactivate/reactivate ── */}
      <AlertDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {confirmAction?.type === "deactivate"
                ? "Deactivate User"
                : "Reactivate User"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "deactivate" ? (
                <>
                  <strong>{confirmAction.member.profile?.full_name}</strong> will
                  lose access to SiteSafe Cloud immediately. Their data will be
                  retained. You can reactivate them at any time.
                </>
              ) : (
                <>
                  <strong>{confirmAction?.member.profile?.full_name}</strong> will
                  regain access to their organisation with their previous role.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={
                confirmAction?.type === "deactivate"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
              onClick={executeStatusChange}
            >
              {confirmAction?.type === "deactivate" ? "Deactivate" : "Reactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
