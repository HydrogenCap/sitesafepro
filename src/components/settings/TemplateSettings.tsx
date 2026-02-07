import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";
import {
  FileText,
  Upload,
  Trash2,
  Loader2,
  Plus,
  GripVertical,
  Edit2,
  Download,
  Rocket,
  PenTool,
} from "lucide-react";

interface DocumentTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  requires_acknowledgement: boolean;
  auto_generate_on_go_live: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

const TEMPLATE_CATEGORIES = [
  { value: "induction", label: "Site Induction" },
  { value: "safety", label: "Safety & Compliance" },
  { value: "permits", label: "Permits & Authorisations" },
  { value: "registers", label: "Registers & Logs" },
  { value: "other", label: "Other" },
];

export default function TemplateSettings() {
  const { user } = useAuth();
  const { organisation } = useSubscription();
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  
  // New template form state
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    category: "other",
    requires_acknowledgement: false,
    auto_generate_on_go_live: true,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (organisation?.id) {
      fetchTemplates();
    }
  }, [organisation?.id]);

  const fetchTemplates = async () => {
    if (!organisation?.id) return;
    
    try {
      const { data, error } = await supabase
        .from("document_templates")
        .select("*")
        .eq("organisation_id", organisation.id)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      // Auto-fill name from filename
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      setNewTemplate((prev) => ({
        ...prev,
        name: prev.name || nameWithoutExt.replace(/[-_]/g, " "),
      }));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleUpload = async () => {
    if (!selectedFile || !organisation?.id || !user?.id) return;

    setUploading(true);
    try {
      // Upload file to storage
      const fileExt = selectedFile.name.split(".").pop();
      const filePath = `${organisation.id}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("document-templates")
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Create template record
      const { error: insertError } = await supabase
        .from("document_templates")
        .insert({
          organisation_id: organisation.id,
          name: newTemplate.name,
          description: newTemplate.description || null,
          category: newTemplate.category,
          file_path: filePath,
          file_size: selectedFile.size,
          mime_type: selectedFile.type,
          requires_acknowledgement: newTemplate.requires_acknowledgement,
          auto_generate_on_go_live: newTemplate.auto_generate_on_go_live,
          sort_order: templates.length,
          created_by: user.id,
        });

      if (insertError) throw insertError;

      toast.success("Template uploaded successfully");
      setUploadDialogOpen(false);
      resetUploadForm();
      fetchTemplates();
    } catch (error) {
      console.error("Error uploading template:", error);
      toast.error("Failed to upload template");
    } finally {
      setUploading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedTemplate) return;

    try {
      const { error } = await supabase
        .from("document_templates")
        .update({
          name: newTemplate.name,
          description: newTemplate.description || null,
          category: newTemplate.category,
          requires_acknowledgement: newTemplate.requires_acknowledgement,
          auto_generate_on_go_live: newTemplate.auto_generate_on_go_live,
        })
        .eq("id", selectedTemplate.id);

      if (error) throw error;

      toast.success("Template updated");
      setEditDialogOpen(false);
      fetchTemplates();
    } catch (error) {
      console.error("Error updating template:", error);
      toast.error("Failed to update template");
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplate) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("document-templates")
        .remove([selectedTemplate.file_path]);

      if (storageError) {
        console.warn("Storage delete warning:", storageError);
      }

      // Delete record
      const { error } = await supabase
        .from("document_templates")
        .delete()
        .eq("id", selectedTemplate.id);

      if (error) throw error;

      toast.success("Template deleted");
      setDeleteDialogOpen(false);
      setSelectedTemplate(null);
      fetchTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    }
  };

  const handleToggleActive = async (template: DocumentTemplate) => {
    try {
      const { error } = await supabase
        .from("document_templates")
        .update({ is_active: !template.is_active })
        .eq("id", template.id);

      if (error) throw error;

      fetchTemplates();
      toast.success(template.is_active ? "Template disabled" : "Template enabled");
    } catch (error) {
      console.error("Error toggling template:", error);
      toast.error("Failed to update template");
    }
  };

  const handleDownload = async (template: DocumentTemplate) => {
    try {
      const { data, error } = await supabase.storage
        .from("document-templates")
        .download(template.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = template.name + "." + template.file_path.split(".").pop();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading:", error);
      toast.error("Failed to download template");
    }
  };

  const openEditDialog = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    setNewTemplate({
      name: template.name,
      description: template.description || "",
      category: template.category,
      requires_acknowledgement: template.requires_acknowledgement,
      auto_generate_on_go_live: template.auto_generate_on_go_live,
    });
    setEditDialogOpen(true);
  };

  const resetUploadForm = () => {
    setNewTemplate({
      name: "",
      description: "",
      category: "other",
      requires_acknowledgement: false,
      auto_generate_on_go_live: true,
    });
    setSelectedFile(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Document Templates</h3>
          <p className="text-sm text-muted-foreground">
            Upload templates that will be automatically generated when projects go live
          </p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Template
        </Button>
      </div>

      {/* Info Card */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Rocket className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Auto-Generate on Go-Live
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Templates marked for auto-generation will be copied to projects when they
              go live. Workers will need to acknowledge templates that require signatures.
            </p>
          </div>
        </div>
      </div>

      {/* Templates List */}
      {templates.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <h4 className="mt-4 text-lg font-medium">No templates yet</h4>
          <p className="mt-2 text-sm text-muted-foreground">
            Upload document templates (PDF, DOC, DOCX) that will be generated for each
            project when it goes live.
          </p>
          <Button className="mt-4" onClick={() => setUploadDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload First Template
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((template, index) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`
                flex items-center gap-4 p-4 rounded-lg border transition-colors
                ${template.is_active ? "bg-card border-border" : "bg-muted/30 border-border/50 opacity-60"}
              `}
            >
              <div className="text-muted-foreground cursor-grab">
                <GripVertical className="h-5 w-5" />
              </div>

              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileText className="h-5 w-5 text-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-foreground truncate">
                    {template.name}
                  </h4>
                  <Badge variant="outline" className="text-xs">
                    {TEMPLATE_CATEGORIES.find((c) => c.value === template.category)?.label || template.category}
                  </Badge>
                  {template.auto_generate_on_go_live && (
                    <Badge className="text-xs bg-primary/10 text-primary border-primary/20">
                      <Rocket className="h-3 w-3 mr-1" />
                      Auto
                    </Badge>
                  )}
                  {template.requires_acknowledgement && (
                    <Badge variant="secondary" className="text-xs">
                      <PenTool className="h-3 w-3 mr-1" />
                      Signature
                    </Badge>
                  )}
                </div>
                {template.description && (
                  <p className="text-sm text-muted-foreground truncate mt-0.5">
                    {template.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {formatFileSize(template.file_size)} •{" "}
                  {template.mime_type.split("/").pop()?.toUpperCase()}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={template.is_active}
                  onCheckedChange={() => handleToggleActive(template)}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDownload(template)}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => openEditDialog(template)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setSelectedTemplate(template);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={(open) => {
        setUploadDialogOpen(open);
        if (!open) resetUploadForm();
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Document Template</DialogTitle>
            <DialogDescription>
              Upload a template that will be generated for projects when they go live
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* File Upload */}
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                ${isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
                ${selectedFile ? "bg-success/5 border-success/50" : ""}
              `}
            >
              <input {...getInputProps()} />
              {selectedFile ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="h-8 w-8 text-success" />
                  <div className="text-left">
                    <p className="font-medium text-foreground">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="mt-2 text-sm text-foreground">
                    Drop a file here, or click to select
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, DOC, DOCX up to 10MB
                  </p>
                </>
              )}
            </div>

            {/* Template Details */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={newTemplate.name}
                  onChange={(e) =>
                    setNewTemplate((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g. Site Induction Form"
                />
              </div>

              <div>
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={newTemplate.description}
                  onChange={(e) =>
                    setNewTemplate((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Brief description of the template"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={newTemplate.category}
                  onValueChange={(value) =>
                    setNewTemplate((prev) => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-generate on Go-Live</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically add to projects when they go live
                  </p>
                </div>
                <Switch
                  checked={newTemplate.auto_generate_on_go_live}
                  onCheckedChange={(checked) =>
                    setNewTemplate((prev) => ({ ...prev, auto_generate_on_go_live: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Requires Acknowledgement</Label>
                  <p className="text-xs text-muted-foreground">
                    Workers must sign to acknowledge reading
                  </p>
                </div>
                <Switch
                  checked={newTemplate.requires_acknowledgement}
                  onCheckedChange={(checked) =>
                    setNewTemplate((prev) => ({ ...prev, requires_acknowledgement: checked }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || !newTemplate.name || uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Template
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>
              Update template settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-name">Template Name</Label>
              <Input
                id="edit-name"
                value={newTemplate.name}
                onChange={(e) =>
                  setNewTemplate((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>

            <div>
              <Label htmlFor="edit-description">Description (optional)</Label>
              <Textarea
                id="edit-description"
                value={newTemplate.description}
                onChange={(e) =>
                  setNewTemplate((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="edit-category">Category</Label>
              <Select
                value={newTemplate.category}
                onValueChange={(value) =>
                  setNewTemplate((prev) => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-generate on Go-Live</Label>
                <p className="text-xs text-muted-foreground">
                  Automatically add to projects when they go live
                </p>
              </div>
              <Switch
                checked={newTemplate.auto_generate_on_go_live}
                onCheckedChange={(checked) =>
                  setNewTemplate((prev) => ({ ...prev, auto_generate_on_go_live: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Requires Acknowledgement</Label>
                <p className="text-xs text-muted-foreground">
                  Workers must sign to acknowledge reading
                </p>
              </div>
              <Switch
                checked={newTemplate.requires_acknowledgement}
                onCheckedChange={(checked) =>
                  setNewTemplate((prev) => ({ ...prev, requires_acknowledgement: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{selectedTemplate?.name}". This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
