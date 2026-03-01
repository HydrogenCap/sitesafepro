import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProjectImageUpload } from "./ProjectImageUpload";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Project {
  id: string;
  name: string;
  address: string | null;
  client_name: string | null;
  principal_designer: string | null;
  start_date: string | null;
  estimated_end_date: string | null;
  image_url: string | null;
  dropbox_folder_url: string | null;
}

interface EditProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  onProjectUpdated: (project: Project) => void;
}

export const EditProjectDialog = ({
  open,
  onOpenChange,
  project,
  onProjectUpdated,
}: EditProjectDialogProps) => {
  const { organisation } = useSubscription();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(project.image_url);
  const [formData, setFormData] = useState({
    name: project.name,
    address: project.address || "",
    clientName: project.client_name || "",
    principalDesigner: project.principal_designer || "",
    startDate: project.start_date || "",
    estimatedEndDate: project.estimated_end_date || "",
    dropboxFolderUrl: project.dropbox_folder_url || "",
  });

  useEffect(() => {
    if (open) {
      setFormData({
        name: project.name,
        address: project.address || "",
        clientName: project.client_name || "",
        principalDesigner: project.principal_designer || "",
        startDate: project.start_date || "",
        estimatedEndDate: project.estimated_end_date || "",
        dropboxFolderUrl: project.dropbox_folder_url || "",
      });
      setImageUrl(project.image_url);
    }
  }, [open, project]);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Please enter a project name");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("projects")
        .update({
          name: formData.name,
          address: formData.address || null,
          client_name: formData.clientName || null,
          principal_designer: formData.principalDesigner || null,
          start_date: formData.startDate || null,
          estimated_end_date: formData.estimatedEndDate || null,
          image_url: imageUrl,
          dropbox_folder_url: formData.dropboxFolderUrl || null,
        })
        .eq("id", project.id)
        .select()
        .single();

      if (error) throw error;

      toast.success("Project updated successfully!");
      onProjectUpdated(data);
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating project:", error);
      toast.error("Failed to update project");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>
            Update project details and photo
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project image */}
          <div className="space-y-2">
            <Label>Project Photo</Label>
            <ProjectImageUpload
              imageUrl={imageUrl}
              onImageChange={setImageUrl}
              organisationId={organisation?.id}
            />
          </div>

          {/* Project name */}
          <div className="space-y-2">
            <Label htmlFor="edit-name">
              Project Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-name"
              placeholder="e.g. Riverside Apartments Phase 1"
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              required
            />
          </div>

          {/* Site address */}
          <div className="space-y-2">
            <Label htmlFor="edit-address">Site Address</Label>
            <AddressAutocomplete
              id="edit-address"
              value={formData.address}
              onChange={(value) => updateField("address", value)}
              placeholder="Start typing to search for an address..."
            />
          </div>

          {/* Client & Designer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-clientName">Client Name</Label>
              <Input
                id="edit-clientName"
                placeholder="e.g. ABC Developments Ltd"
                value={formData.clientName}
                onChange={(e) => updateField("clientName", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-principalDesigner">Principal Designer</Label>
              <Input
                id="edit-principalDesigner"
                placeholder="e.g. Smith Architects"
                value={formData.principalDesigner}
                onChange={(e) => updateField("principalDesigner", e.target.value)}
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-startDate">Start Date</Label>
              <Input
                id="edit-startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => updateField("startDate", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-endDate">Estimated End Date</Label>
              <Input
                id="edit-endDate"
                type="date"
                value={formData.estimatedEndDate}
                onChange={(e) => updateField("estimatedEndDate", e.target.value)}
              />
            </div>
          </div>

          {/* Dropbox folder link */}
          <div className="space-y-2">
            <Label htmlFor="edit-dropboxFolderUrl" className="flex items-center gap-2">
              <svg viewBox="0 0 40 40" className="h-4 w-4" fill="none">
                <path d="M20 8L10 14.5L20 21L10 27.5L0 21L10 14.5L0 8L10 1.5L20 8Z" fill="#0061FF"/>
                <path d="M20 8L30 14.5L20 21L30 27.5L40 21L30 14.5L40 8L30 1.5L20 8Z" fill="#0061FF"/>
                <path d="M10 29.5L20 23L30 29.5L20 36L10 29.5Z" fill="#0061FF"/>
              </svg>
              Architectural Drawings (Dropbox)
            </Label>
            <Input
              id="edit-dropboxFolderUrl"
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
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
