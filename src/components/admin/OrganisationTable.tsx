import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Users, Building2, ChevronDown, ChevronRight, CheckCircle, Crown,
  Eye, HardHat, FileText, BarChart2, AlertTriangle, Activity,
  UserX, UserCheck, Building,
} from "lucide-react";
import { HealthBadge } from "./PlatformOverview";
import { formatBytes } from "@/lib/admin-utils";
import {
  type Organisation, type OrgMember, type MemberRole,
  tierColors, subStatusColors, roleColors, roleLabels, statusConfig,
} from "@/types/admin";

interface OrganisationTableProps {
  filteredOrgs: Organisation[];
  toggleOrg: (id: string) => void;
  handleUpdateRole: (memberId: string, orgId: string, newRole: MemberRole, profile: OrgMember["profile"]) => void;
  handleToggleStatus: (member: OrgMember, orgId: string) => void;
  onViewMember: (member: OrgMember, orgName: string, orgId: string) => void;
  onImpersonate: (org: Organisation) => void;
}

export function OrganisationTable({
  filteredOrgs, toggleOrg, handleUpdateRole, handleToggleStatus, onViewMember, onImpersonate,
}: OrganisationTableProps) {
  if (filteredOrgs.length === 0) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">No organisations match your search.</CardContent></Card>;
  }

  return (
    <div className="space-y-3">
      {filteredOrgs.map((org) => (
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
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-purple-600" title="View as this org" onClick={(e) => { e.stopPropagation(); onImpersonate(org); }}>
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
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
                        <button className="flex items-center gap-2.5 text-left hover:underline" onClick={() => onViewMember(member, org.name, org.id)}>
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
    </div>
  );
}

// ── All Users flat table ──
interface AllUsersTableProps {
  members: (OrgMember & { orgName: string; orgId: string })[];
  handleToggleStatus: (member: OrgMember, orgId: string) => void;
  onViewMember: (member: OrgMember, orgName: string, orgId: string) => void;
}

export function AllUsersTable({ members, handleToggleStatus, onViewMember }: AllUsersTableProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">All Platform Users</CardTitle>
        <CardDescription>{members.length} user{members.length !== 1 ? "s" : ""}</CardDescription>
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
            {members.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">No users match search.</TableCell></TableRow>
            ) : members.map((m) => (
              <TableRow key={m.id} className="hover:bg-muted/20">
                <TableCell className="pl-6">
                  <button className="flex items-center gap-2.5 text-left hover:underline" onClick={() => onViewMember(m, m.orgName, m.orgId)}>
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
  );
}
