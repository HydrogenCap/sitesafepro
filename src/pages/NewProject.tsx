import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useActivityLog, activityDescriptions } from "@/hooks/useActivityLog";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ProjectImageUpload } from "@/components/projects/ProjectImageUpload";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { toast } from "sonner";
import {
  ArrowLeft,
  FolderPlus,
  Loader2,
  MapPin,
  Calendar,
  Users,
  HardHat,
  ImageIcon,
} from "lucide-react";

const NewProject = () => {
  const { user, loading: authLoading } = useAuth();
  const { organisation, projectLimit, loading: subLoading } = useSubscription();
  const { logActivity } = useActivityLog();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeProjectCount, setActiveProjectCount] = useState(0);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    clientName: "",
    principalDesigner: "",
    startDate: "",
    estimatedEndDate: "",
    dropboxFolderUrl: "",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Fetch active project count
  useEffect(() => {
    const fetchProjectCount = async () => {
      if (!organisation) return;

      const { count } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .eq("organisation_id", organisation.id)
        .eq("status", "active");

      setActiveProjectCount(count || 0);
    };

    fetchProjectCount();
  }, [organisation]);

  const canCreate = activeProjectCount < projectLimit;

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Please enter a project name");
      return;
    }

    if (!canCreate) {
      toast.error("Project limit reached. Please upgrade your plan.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Create project with 'setup' status
      const { data: newProject, error } = await supabase
        .from("projects")
        .insert({
          organisation_id: organisation?.id,
          name: formData.name,
          address: formData.address || null,
          client_name: formData.clientName || null,
          principal_designer: formData.principalDesigner || null,
          start_date: formData.startDate || null,
          estimated_end_date: formData.estimatedEndDate || null,
          created_by: user?.id,
          image_url: imageUrl,
          dropbox_folder_url: formData.dropboxFolderUrl || null,
          status: "setup", // Start in setup mode
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-create the 5 compliance requirement items
      // Core items (F10, Asbestos Survey, PCI) start as "pending"
      // Waste-related items (cleanliness, consignment) default to "exempt" for simpler projects
      const complianceRequirements = [
        { type: "f10", status: "pending" },
        { type: "asbestos_survey", status: "pending" },
        { type: "asbestos_cleanliness", status: "exempt" }, // Default exempt - only for asbestos removal
        { type: "consignment_note", status: "exempt" }, // Default exempt - only for asbestos removal
        { type: "pci", status: "pending" },
      ];

      const { error: complianceError } = await supabase
        .from("project_compliance_requirements")
        .insert(
          complianceRequirements.map((req) => ({
            organisation_id: organisation?.id,
            project_id: newProject.id,
            requirement_type: req.type,
            status: req.status,
          }))
        );

      if (complianceError) {
        console.error("Error creating compliance items:", complianceError);
        // Don't fail the whole operation, the items will be created on first view
      }

      // Log activity
      logActivity({
        activityType: 'project_created',
        entityType: 'project',
        entityName: formData.name,
        description: activityDescriptions.project_created(formData.name),
      });

      toast.success("Project created. Complete the pre-construction checklist to go live.");
      navigate(`/projects/${newProject.id}`);
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("Failed to create project");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/projects")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <FolderPlus className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">New Project</h1>
              <p className="text-sm text-muted-foreground">
                Create a new construction project
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="bg-card rounded-xl p-6 shadow-sm border border-border space-y-6"
        >
          {/* Project image */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Project Photo
            </Label>
            <ProjectImageUpload
              imageUrl={imageUrl}
              onImageChange={setImageUrl}
              organisationId={organisation?.id}
            />
          </div>

          {/* Project name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <HardHat className="h-4 w-4" />
              Project Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g. Riverside Apartments Phase 1"
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              required
            />
          </div>

          {/* Site address */}
          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Site Address
            </Label>
            <AddressAutocomplete
              id="address"
              value={formData.address}
              onChange={(value) => updateField("address", value)}
              placeholder="Start typing to search for an address..."
            />
          </div>

          {/* Client & Designer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientName" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Client Name
              </Label>
              <Input
                id="clientName"
                placeholder="e.g. ABC Developments Ltd"
                value={formData.clientName}
                onChange={(e) => updateField("clientName", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="principalDesigner">Principal Designer</Label>
              <Input
                id="principalDesigner"
                placeholder="e.g. Smith Architects"
                value={formData.principalDesigner}
                onChange={(e) => updateField("principalDesigner", e.target.value)}
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Start Date
              </Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => updateField("startDate", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Estimated End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.estimatedEndDate}
                onChange={(e) => updateField("estimatedEndDate", e.target.value)}
              />
            </div>
          </div>

          {/* Architectural Drawings - Dropbox link */}
          <div className="space-y-2">
            <Label htmlFor="dropboxFolderUrl" className="flex items-center gap-2">
              <svg viewBox="0 0 40 40" className="h-4 w-4" fill="none">
                <path d="M20 8L10 14.5L20 21L10 27.5L0 21L10 14.5L0 8L10 1.5L20 8Z" fill="#0061FF"/>
                <path d="M20 8L30 14.5L20 21L30 27.5L40 21L30 14.5L40 8L30 1.5L20 8Z" fill="#0061FF"/>
                <path d="M10 29.5L20 23L30 29.5L20 36L10 29.5Z" fill="#0061FF"/>
              </svg>
              Architectural Drawings (Dropbox)
            </Label>
            <Input
              id="dropboxFolderUrl"
              type="url"
              placeholder="https://www.dropbox.com/sh/..."
              value={formData.dropboxFolderUrl}
              onChange={(e) => updateField("dropboxFolderUrl", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Paste a Dropbox shared folder link for architectural drawings.
            </p>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/projects")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !canCreate}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Project"
              )}
            </Button>
          </div>
        </motion.form>
      </div>
    </DashboardLayout>
  );
};

export default NewProject;
