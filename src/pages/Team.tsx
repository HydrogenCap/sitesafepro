import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Users, 
  UserPlus, 
  Search, 
  MoreHorizontal, 
  Mail, 
  Shield, 
  UserCog,
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import InviteMemberDialog from "@/components/team/InviteMemberDialog";

type MemberRole = "owner" | "admin" | "site_manager" | "contractor" | "client_viewer";
type MemberStatus = "invited" | "active" | "deactivated";

interface TeamMember {
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

const statusIcons: Record<MemberStatus, React.ReactNode> = {
  invited: <Clock className="h-4 w-4 text-amber-500" />,
  active: <CheckCircle className="h-4 w-4 text-emerald-500" />,
  deactivated: <XCircle className="h-4 w-4 text-destructive" />,
};

export default function Team() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<MemberRole | null>(null);
  const [organisationId, setOrganisationId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchMembers();
  }, [user, navigate]);

  const fetchMembers = async () => {
    try {
      // First get the user's organisation
      const { data: memberData, error: memberError } = await supabase
        .from("organisation_members")
        .select("organisation_id, role")
        .eq("profile_id", user?.id)
        .eq("status", "active")
        .single();

      if (memberError) throw memberError;
      
      setOrganisationId(memberData.organisation_id);
      setCurrentUserRole(memberData.role as MemberRole);

      // Then get all members of that organisation
      const { data: membersData, error: membersError } = await supabase
        .from("organisation_members")
        .select(`
          id,
          role,
          status,
          invited_at,
          accepted_at,
          profile:profiles!organisation_members_profile_id_fkey (
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq("organisation_id", memberData.organisation_id)
        .order("invited_at", { ascending: false });

      if (membersError) throw membersError;

      setMembers(membersData as unknown as TeamMember[]);
    } catch (error: any) {
      console.error("Error fetching members:", error);
      toast({
        title: "Error",
        description: "Failed to load team members",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendInvite = async (memberId: string, email: string) => {
    try {
      const { error } = await supabase.functions.invoke("team-invite", {
        body: { action: "resend", memberId, email },
      });

      if (error) throw error;

      toast({
        title: "Invitation resent",
        description: `A new invitation has been sent to ${email}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to resend invitation",
        variant: "destructive",
      });
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: MemberRole) => {
    try {
      const { error } = await supabase
        .from("organisation_members")
        .update({ role: newRole })
        .eq("id", memberId);

      if (error) throw error;

      setMembers(members.map(m => 
        m.id === memberId ? { ...m, role: newRole } : m
      ));

      toast({
        title: "Role updated",
        description: "Member role has been updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update role",
        variant: "destructive",
      });
    }
  };

  const handleDeactivate = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from("organisation_members")
        .update({ status: "deactivated" as MemberStatus })
        .eq("id", memberId);

      if (error) throw error;

      setMembers(members.map(m => 
        m.id === memberId ? { ...m, status: "deactivated" as MemberStatus } : m
      ));

      toast({
        title: "Member deactivated",
        description: "The team member has been deactivated",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to deactivate member",
        variant: "destructive",
      });
    }
  };

  const filteredMembers = members.filter(member => {
    const name = member.profile?.full_name || "";
    const email = member.profile?.email || "";
    return (
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const canManageMembers = currentUserRole === "owner" || currentUserRole === "admin";

  const stats = {
    total: members.length,
    active: members.filter(m => m.status === "active").length,
    pending: members.filter(m => m.status === "invited").length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Team Members</h1>
            <p className="text-muted-foreground">
              Manage your organisation's team and permissions
            </p>
          </div>
          {canManageMembers && (
            <Button onClick={() => setInviteDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Members</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-full">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.active}</p>
                  <p className="text-sm text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-500/10 rounded-full">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-sm text-muted-foreground">Pending Invites</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
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
                      {canManageMembers && <TableHead className="w-[50px]"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-medium text-primary">
                                {member.profile?.full_name?.charAt(0) || "?"}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">
                                {member.profile?.full_name || "Pending User"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {member.profile?.email || "Email pending"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary" 
                            className={roleColors[member.role]}
                          >
                            {roleLabels[member.role]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {statusIcons[member.status]}
                            <span className="capitalize">{member.status}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {member.accepted_at 
                            ? new Date(member.accepted_at).toLocaleDateString()
                            : "Pending"
                          }
                        </TableCell>
                        {canManageMembers && member.role !== "owner" && (
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {member.status === "invited" && (
                                  <DropdownMenuItem
                                    onClick={() => handleResendInvite(member.id, member.profile?.email || "")}
                                  >
                                    <Mail className="h-4 w-4 mr-2" />
                                    Resend Invite
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => handleUpdateRole(member.id, "admin")}
                                  disabled={member.role === "admin"}
                                >
                                  <Shield className="h-4 w-4 mr-2" />
                                  Make Admin
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleUpdateRole(member.id, "site_manager")}
                                  disabled={member.role === "site_manager"}
                                >
                                  <UserCog className="h-4 w-4 mr-2" />
                                  Make Site Manager
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleUpdateRole(member.id, "contractor")}
                                  disabled={member.role === "contractor"}
                                >
                                  <Users className="h-4 w-4 mr-2" />
                                  Make Contractor
                                </DropdownMenuItem>
                                {member.status === "active" && (
                                  <DropdownMenuItem
                                    onClick={() => handleDeactivate(member.id)}
                                    className="text-destructive"
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Deactivate
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                        {canManageMembers && member.role === "owner" && (
                          <TableCell></TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <InviteMemberDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        organisationId={organisationId}
        onInviteSent={fetchMembers}
      />
    </DashboardLayout>
  );
}
