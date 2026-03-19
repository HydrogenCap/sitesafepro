import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Mail, 
  Calendar, 
  Shield, 
  CheckCircle, 
  Clock, 
  XCircle,
  UserCog,
  Save
} from "lucide-react";
import { TeamMember, MemberRole, roleLabels, roleColors, rolePermissions } from "./types";
import { useToast } from "@/hooks/use-toast";

interface MemberDetailPanelProps {
  member: TeamMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManageMembers: boolean;
  onUpdateRole: (memberId: string, newRole: MemberRole) => void;
  onDeactivate: (memberId: string) => void;
  onResendInvite: (memberId: string, email: string) => void;
}

const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  invited: { 
    icon: <Clock className="h-4 w-4" />, 
    color: "bg-amber-500/10 text-amber-700 dark:text-amber-300", 
    label: "Pending Invite" 
  },
  active: { 
    icon: <CheckCircle className="h-4 w-4" />, 
    color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", 
    label: "Active" 
  },
  deactivated: { 
    icon: <XCircle className="h-4 w-4" />, 
    color: "bg-destructive/10 text-destructive", 
    label: "Deactivated" 
  },
};

export function MemberDetailPanel({
  member,
  open,
  onOpenChange,
  canManageMembers,
  onUpdateRole,
  onDeactivate,
  onResendInvite,
}: MemberDetailPanelProps) {
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<MemberRole | null>(null);

  if (!member) return null;

  const status = statusConfig[member.status];
  const currentRole = selectedRole || member.role;
  const hasRoleChanged = selectedRole && selectedRole !== member.role;

  const handleSaveRole = () => {
    if (selectedRole && selectedRole !== member.role) {
      onUpdateRole(member.id, selectedRole);
      setSelectedRole(null);
    }
  };

  const handleResendInvite = () => {
    onResendInvite(member.id, member.profile?.email || "");
    toast({
      title: "Invitation resent",
      description: `A new invitation has been sent to ${member.profile?.email}`,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-semibold text-primary">
                {member.profile?.full_name?.charAt(0) || "?"}
              </span>
            </div>
            <div className="flex-1">
              <SheetTitle className="text-xl">
                {member.profile?.full_name || "Pending User"}
              </SheetTitle>
              <SheetDescription className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" />
                {member.profile?.email || "Email pending"}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status & Role */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Status</p>
              <Badge className={`${status.color} gap-1.5`}>
                {status.icon}
                {status.label}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Role</p>
              <Badge className={roleColors[member.role]}>
                {roleLabels[member.role]}
              </Badge>
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Invited:</span>
              <span>{new Date(member.invited_at).toLocaleDateString()}</span>
            </div>
            {member.accepted_at && (
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Joined:</span>
                <span>{new Date(member.accepted_at).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Role Permissions */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-primary" />
              <h3 className="font-medium">Role Permissions</h3>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <ul className="space-y-2">
                {rolePermissions[currentRole].map((permission, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                    {permission}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Actions */}
          {canManageMembers && member.role !== "owner" && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <UserCog className="h-4 w-4 text-primary" />
                  <h3 className="font-medium">Manage Member</h3>
                </div>

                {/* Change Role */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Change Role</p>
                  <div className="flex gap-2">
                    <Select 
                      value={selectedRole || member.role} 
                      onValueChange={(v) => setSelectedRole(v as MemberRole)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="site_manager">Site Manager</SelectItem>
                        <SelectItem value="contractor">Contractor</SelectItem>
                        <SelectItem value="client_viewer">Client Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                    {hasRoleChanged && (
                      <Button onClick={handleSaveRole}>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-col gap-2">
                  {member.status === "invited" && (
                    <Button variant="outline" onClick={handleResendInvite}>
                      <Mail className="h-4 w-4 mr-2" />
                      Resend Invitation
                    </Button>
                  )}
                  {member.status === "active" && (
                    <Button 
                      variant="outline" 
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => onDeactivate(member.id)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Deactivate Member
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
