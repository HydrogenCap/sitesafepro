import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableCell, TableRow } from "@/components/ui/table";
import { 
  MoreHorizontal, 
  Mail, 
  Shield, 
  UserCog, 
  Users, 
  XCircle,
  Clock,
  CheckCircle,
  Eye
} from "lucide-react";
import { TeamMember, MemberRole, roleLabels, roleColors } from "./types";

interface TeamMemberRowProps {
  member: TeamMember;
  canManageMembers: boolean;
  onResendInvite: (memberId: string, email: string) => void;
  onUpdateRole: (memberId: string, newRole: MemberRole) => void;
  onDeactivate: (memberId: string) => void;
  onViewDetails: (member: TeamMember) => void;
}

const statusIcons: Record<string, React.ReactNode> = {
  invited: <Clock className="h-4 w-4 text-amber-500" />,
  active: <CheckCircle className="h-4 w-4 text-emerald-500" />,
  deactivated: <XCircle className="h-4 w-4 text-destructive" />,
};

export function TeamMemberRow({
  member,
  canManageMembers,
  onResendInvite,
  onUpdateRole,
  onDeactivate,
  onViewDetails,
}: TeamMemberRowProps) {
  return (
    <TableRow 
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => onViewDetails(member)}
    >
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
      <TableCell onClick={(e) => e.stopPropagation()}>
        {canManageMembers && member.role !== "owner" ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onViewDetails(member)}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              {member.status === "invited" && (
                <DropdownMenuItem
                  onClick={() => onResendInvite(member.id, member.profile?.email || "")}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Resend Invite
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => onUpdateRole(member.id, "admin")}
                disabled={member.role === "admin"}
              >
                <Shield className="h-4 w-4 mr-2" />
                Make Admin
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onUpdateRole(member.id, "site_manager")}
                disabled={member.role === "site_manager"}
              >
                <UserCog className="h-4 w-4 mr-2" />
                Make Site Manager
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onUpdateRole(member.id, "contractor")}
                disabled={member.role === "contractor"}
              >
                <Users className="h-4 w-4 mr-2" />
                Make Contractor
              </DropdownMenuItem>
              {member.status === "active" && (
                <DropdownMenuItem
                  onClick={() => onDeactivate(member.id)}
                  className="text-destructive"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Deactivate
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : canManageMembers && member.role === "owner" ? (
          <span />
        ) : null}
      </TableCell>
    </TableRow>
  );
}
