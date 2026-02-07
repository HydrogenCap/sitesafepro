import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, X } from "lucide-react";

interface InviteClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedProjectId?: string;
}

const clientRoles = [
  { value: "client", label: "Client" },
  { value: "principal_designer", label: "Principal Designer" },
  { value: "cdm_advisor", label: "CDM Advisor" },
  { value: "building_control", label: "Building Control" },
];

const permissions = [
  { key: "can_view_documents", label: "Documents" },
  { key: "can_view_rams", label: "RAMS" },
  { key: "can_view_actions", label: "Corrective Actions" },
  { key: "can_view_diary", label: "Site Diary" },
  { key: "can_view_workforce", label: "Workforce Data" },
  { key: "can_view_incidents", label: "Incidents" },
  { key: "can_download_reports", label: "Download Reports" },
];

export function InviteClientDialog({
  open,
  onOpenChange,
  preselectedProjectId,
}: InviteClientDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    company_name: "",
    phone: "",
    role: "client",
    selectedProjects: preselectedProjectId ? [preselectedProjectId] : [] as string[],
    allProjects: !preselectedProjectId,
    permissions: {
      can_view_documents: true,
      can_view_rams: true,
      can_view_actions: true,
      can_view_diary: true,
      can_view_workforce: true,
      can_view_incidents: true,
      can_download_reports: true,
    },
  });

  // Fetch user's organisation
  const { data: orgData } = useQuery({
    queryKey: ["user-organisation"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organisation_members")
        .select("organisation_id, organisations(id, name, subscription_tier)")
        .eq("profile_id", user?.id)
        .eq("status", "active")
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch projects
  const { data: projects } = useQuery({
    queryKey: ["organisation-projects", orgData?.organisation_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .eq("organisation_id", orgData?.organisation_id)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!orgData?.organisation_id,
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!orgData?.organisation_id || !user?.id) {
        throw new Error("Organisation not found");
      }

      // Generate invite token
      const inviteToken = crypto.randomUUID();

      const { error } = await supabase.from("client_portal_users").insert({
        organisation_id: orgData.organisation_id,
        email: formData.email,
        full_name: formData.full_name,
        company_name: formData.company_name,
        phone: formData.phone || null,
        role: formData.role as any,
        project_ids: formData.allProjects ? [] : formData.selectedProjects,
        invited_by: user.id,
        invite_token: inviteToken,
        ...formData.permissions,
      });

      if (error) throw error;

      // TODO: Send invitation email via edge function
      // For now, we'll just create the record

      return { inviteToken };
    },
    onSuccess: () => {
      toast({
        title: "Invitation Sent",
        description: `Client invitation sent to ${formData.email}`,
      });
      queryClient.invalidateQueries({ queryKey: ["client-portal-users"] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      email: "",
      full_name: "",
      company_name: "",
      phone: "",
      role: "client",
      selectedProjects: preselectedProjectId ? [preselectedProjectId] : [],
      allProjects: !preselectedProjectId,
      permissions: {
        can_view_documents: true,
        can_view_rams: true,
        can_view_actions: true,
        can_view_diary: true,
        can_view_workforce: true,
        can_view_incidents: true,
        can_download_reports: true,
      },
    });
  };

  const toggleProject = (projectId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedProjects: prev.selectedProjects.includes(projectId)
        ? prev.selectedProjects.filter((id) => id !== projectId)
        : [...prev.selectedProjects, projectId],
      allProjects: false,
    }));
  };

  const togglePermission = (key: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key as keyof typeof prev.permissions],
      },
    }));
  };

  // Check if Enterprise tier
  const isEnterprise = (orgData?.organisations as any)?.subscription_tier === "enterprise";

  if (!isEnterprise) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Client Portal</DialogTitle>
            <DialogDescription>
              The Client Portal feature is available on the Enterprise plan.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Upgrade to Enterprise to give your clients read-only access to compliance
              dashboards, documents, and project progress.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button onClick={() => window.location.href = "/#pricing"}>
              View Plans
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite Client to Portal</DialogTitle>
          <DialogDescription>
            Give clients read-only access to view compliance status and documents.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="client@company.com"
            />
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name *</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="John Smith"
            />
          </div>

          {/* Company Name */}
          <div className="space-y-2">
            <Label htmlFor="company_name">Company Name *</Label>
            <Input
              id="company_name"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              placeholder="Client Company Ltd"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+44 7700 900000"
            />
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {clientRoles.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Project Access */}
          <div className="space-y-2">
            <Label>Project Access</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="all-projects"
                  checked={formData.allProjects}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      allProjects: !!checked,
                      selectedProjects: [],
                    })
                  }
                />
                <label htmlFor="all-projects" className="text-sm">
                  All current and future projects
                </label>
              </div>

              {!formData.allProjects && (
                <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                  {projects?.map((project) => (
                    <div key={project.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`project-${project.id}`}
                        checked={formData.selectedProjects.includes(project.id)}
                        onCheckedChange={() => toggleProject(project.id)}
                      />
                      <label htmlFor={`project-${project.id}`} className="text-sm">
                        {project.name}
                      </label>
                    </div>
                  ))}
                </div>
              )}

              {formData.selectedProjects.length > 0 && !formData.allProjects && (
                <div className="flex flex-wrap gap-1">
                  {formData.selectedProjects.map((id) => {
                    const project = projects?.find((p) => p.id === id);
                    return project ? (
                      <Badge key={id} variant="secondary" className="text-xs">
                        {project.name}
                        <button
                          onClick={() => toggleProject(id)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Permissions */}
          <div className="space-y-2">
            <Label>Permissions (Read-Only)</Label>
            <div className="grid grid-cols-2 gap-2">
              {permissions.map((perm) => (
                <div key={perm.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={perm.key}
                    checked={formData.permissions[perm.key as keyof typeof formData.permissions]}
                    onCheckedChange={() => togglePermission(perm.key)}
                  />
                  <label htmlFor={perm.key} className="text-sm">
                    {perm.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => inviteMutation.mutate()}
            disabled={
              inviteMutation.isPending ||
              !formData.email ||
              !formData.full_name ||
              !formData.company_name
            }
          >
            {inviteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Send Invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
