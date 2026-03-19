import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  TeamStatsCards,
  TeamMembersTable,
  InviteMemberDialog,
  TeamMember,
  MemberRole,
  MemberStatus,
} from "@/components/team";

export default function Team() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
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
        .maybeSingle();

      if (memberError || !memberData) return;
      
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
    } catch (error: unknown) {
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
    } catch (error: unknown) {
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
    } catch (error: unknown) {
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
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: "Failed to deactivate member",
        variant: "destructive",
      });
    }
  };

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
        <TeamStatsCards 
          total={stats.total} 
          active={stats.active} 
          pending={stats.pending} 
        />

        {/* Team Directory Table */}
        <TeamMembersTable
          members={members}
          loading={loading}
          canManageMembers={canManageMembers}
          onResendInvite={handleResendInvite}
          onUpdateRole={handleUpdateRole}
          onDeactivate={handleDeactivate}
        />
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
