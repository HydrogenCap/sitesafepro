import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Users } from "lucide-react";
import { TeamMember, MemberRole } from "./types";
import { TeamMemberRow } from "./TeamMemberRow";
import { MemberDetailPanel } from "./MemberDetailPanel";

interface TeamMembersTableProps {
  members: TeamMember[];
  loading: boolean;
  canManageMembers: boolean;
  onResendInvite: (memberId: string, email: string) => void;
  onUpdateRole: (memberId: string, newRole: MemberRole) => void;
  onDeactivate: (memberId: string) => void;
}

export function TeamMembersTable({
  members,
  loading,
  canManageMembers,
  onResendInvite,
  onUpdateRole,
  onDeactivate,
}: TeamMembersTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);

  const filteredMembers = members.filter(member => {
    const name = member.profile?.full_name || "";
    const email = member.profile?.email || "";
    return (
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleViewDetails = (member: TeamMember) => {
    setSelectedMember(member);
    setDetailPanelOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Team Directory</CardTitle>
          <CardDescription>
            View and manage all team members in your organisation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading team members...
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No team members found</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <TeamMemberRow
                      key={member.id}
                      member={member}
                      canManageMembers={canManageMembers}
                      onResendInvite={onResendInvite}
                      onUpdateRole={onUpdateRole}
                      onDeactivate={onDeactivate}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <MemberDetailPanel
        member={selectedMember}
        open={detailPanelOpen}
        onOpenChange={setDetailPanelOpen}
        canManageMembers={canManageMembers}
        onUpdateRole={onUpdateRole}
        onDeactivate={onDeactivate}
        onResendInvite={onResendInvite}
      />
    </>
  );
}
