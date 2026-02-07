import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { InviteClientDialog } from "@/components/client/InviteClientDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Users,
  UserPlus,
  MoreHorizontal,
  Mail,
  Eye,
  UserX,
  Activity,
  Lock,
  Building2,
} from "lucide-react";
import { format } from "date-fns";

const roleLabels: Record<string, string> = {
  client: "Client",
  principal_designer: "Principal Designer",
  cdm_advisor: "CDM Advisor",
  building_control: "Building Control",
};

export default function ClientPortalSettings() {
  const { user } = useAuth();
  const { tier } = useSubscription();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [activityViewClientId, setActivityViewClientId] = useState<string | null>(null);

  // Fetch user's organisation
  const { data: orgData } = useQuery({
    queryKey: ["user-organisation"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organisation_members")
        .select("organisation_id")
        .eq("profile_id", user?.id)
        .eq("status", "active")
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch client portal users
  const { data: clientUsers, isLoading } = useQuery({
    queryKey: ["client-portal-users", orgData?.organisation_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_portal_users")
        .select("*")
        .eq("organisation_id", orgData?.organisation_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgData?.organisation_id,
  });

  // Fetch activity for selected client
  const { data: clientActivity } = useQuery({
    queryKey: ["client-activity", activityViewClientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_portal_activity")
        .select("*")
        .eq("client_user_id", activityViewClientId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!activityViewClientId,
  });

  // Deactivate client mutation
  const deactivateMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase
        .from("client_portal_users")
        .update({ is_active: false })
        .eq("id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Client Deactivated",
        description: "The client no longer has access to the portal.",
      });
      queryClient.invalidateQueries({ queryKey: ["client-portal-users"] });
      setDeactivateDialogOpen(false);
      setSelectedClient(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate client",
        variant: "destructive",
      });
    },
  });

  // Reactivate client mutation
  const reactivateMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase
        .from("client_portal_users")
        .update({ is_active: true })
        .eq("id", clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Client Reactivated",
        description: "The client now has access to the portal.",
      });
      queryClient.invalidateQueries({ queryKey: ["client-portal-users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reactivate client",
        variant: "destructive",
      });
    },
  });

  const isEnterprise = tier === "enterprise";

  if (!isEnterprise) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Client Portal
          </CardTitle>
          <CardDescription>
            Enterprise feature
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Upgrade to Enterprise</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Give your clients read-only access to compliance dashboards, documents,
              and project progress. A powerful differentiator when tendering for work.
            </p>
            <Button onClick={() => window.location.href = "/#pricing"}>
              View Plans
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Client Portal
              </CardTitle>
              <CardDescription>
                Manage client access to your compliance dashboard
              </CardDescription>
            </div>
            <Button onClick={() => setInviteDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Client
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading clients...
            </div>
          ) : clientUsers && clientUsers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Projects</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientUsers.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{client.full_name}</p>
                        <p className="text-sm text-muted-foreground">{client.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{client.company_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {roleLabels[client.role] || client.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {client.project_ids && client.project_ids.length > 0
                        ? `${client.project_ids.length} project(s)`
                        : "All projects"}
                    </TableCell>
                    <TableCell>
                      {client.last_login_at
                        ? format(new Date(client.last_login_at), "dd MMM yyyy HH:mm")
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={client.is_active ? "default" : "secondary"}>
                        {client.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setActivityViewClientId(client.id)}
                          >
                            <Activity className="h-4 w-4 mr-2" />
                            View Activity
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Mail className="h-4 w-4 mr-2" />
                            Resend Invite
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {client.is_active ? (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                setSelectedClient(client.id);
                                setDeactivateDialogOpen(true);
                              }}
                            >
                              <UserX className="h-4 w-4 mr-2" />
                              Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => reactivateMutation.mutate(client.id)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Reactivate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No Clients Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Invite clients to give them read-only access to your compliance portal.
              </p>
              <Button onClick={() => setInviteDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Your First Client
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <InviteClientDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
      />

      {/* Deactivate Confirmation */}
      <AlertDialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Client Access?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke the client's access to the portal. They will no longer
              be able to view any project information. You can reactivate them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedClient && deactivateMutation.mutate(selectedClient)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Activity View Dialog */}
      {activityViewClientId && (
        <AlertDialog
          open={!!activityViewClientId}
          onOpenChange={(open) => !open && setActivityViewClientId(null)}
        >
          <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle>Client Activity Log</AlertDialogTitle>
              <AlertDialogDescription>
                View what this client has accessed in the portal.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              {clientActivity && clientActivity.length > 0 ? (
                <div className="space-y-2">
                  {clientActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm"
                    >
                      <div>
                        <p className="font-medium">{activity.action}</p>
                        {activity.resource_name && (
                          <p className="text-muted-foreground">
                            {activity.resource_type}: {activity.resource_name}
                          </p>
                        )}
                      </div>
                      <span className="text-muted-foreground">
                        {format(new Date(activity.created_at), "dd MMM yyyy HH:mm")}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">
                  No activity recorded yet.
                </p>
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
