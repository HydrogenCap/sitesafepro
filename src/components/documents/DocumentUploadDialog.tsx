import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useActivityLog, activityDescriptions } from "@/hooks/useActivityLog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Upload,
  File,
  X,
  Loader2,
  CheckCircle,
  Image,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
}

interface ParentDocument {
  id: string;
  name: string;
  version: number;
  category: string;
  project_id: string | null;
}

interface DocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organisationId: string;
  projectId?: string;
  onUploadComplete: () => void;
  parentDocument?: ParentDocument | null;
}

const CATEGORIES = [
  { value: "rams", label: "RAMS" },
  { value: "method_statement", label: "Method Statement" },
  { value: "safety_plan", label: "Safety Plan" },
  { value: "coshh", label: "COSHH Assessment" },
  { value: "induction", label: "Induction Material" },
  { value: "permit", label: "Permit" },
  { value: "inspection", label: "Inspection Report" },
  { value: "certificate", label: "Certificate" },
  { value: "insurance", label: "Insurance Document" },
  { value: "other", label: "Other" },
];

const ACCEPTED_TYPES = {
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

type DocumentCategory = "rams" | "method_statement" | "safety_plan" | "coshh" | "induction" | "permit" | "inspection" | "certificate" | "insurance" | "other";

export const DocumentUploadDialog = ({
  open,
  onOpenChange,
  organisationId,
  projectId: initialProjectId,
  onUploadComplete,
  parentDocument,
}: DocumentUploadDialogProps) => {
  const { user } = useAuth();
  const { logActivity } = useActivityLog();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<DocumentCategory>("other");
  const [projectId, setProjectId] = useState(initialProjectId || "none");
  const [projects, setProjects] = useState<Project[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Initialize form when parent document changes (versioning)
  useEffect(() => {
    if (parentDocument && open) {
      setName(parentDocument.name);
      setCategory(parentDocument.category as DocumentCategory);
      setProjectId(parentDocument.project_id || "none");
    } else if (!open) {
      // Reset when dialog closes
      setFile(null);
      setName("");
      setDescription("");
      setCategory("other");
      setProjectId(initialProjectId || "none");
      setUploadProgress(0);
    }
  }, [parentDocument, open, initialProjectId]);

  useEffect(() => {
    const fetchProjects = async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, name")
        .eq("status", "active")
        .order("name");
      setProjects(data || []);
    };

    if (open) {
      fetchProjects();
    }
  }, [open]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      // Auto-fill name from filename (without extension)
      if (!name) {
        const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
        setName(nameWithoutExt);
      }
    }
  }, [name]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: 52428800, // 50MB
    multiple: false,
  });

  const handleUpload = async () => {
    if (!file || !name.trim() || !user || !organisationId) {
      toast.error("Please fill in all required fields");
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      // Generate unique file path
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${organisationId}/${fileName}`;

      setUploadProgress(30);

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setUploadProgress(70);

      // Determine version number and parent document ID
      const newVersion = parentDocument ? parentDocument.version + 1 : 1;
      const parentDocId = parentDocument ? parentDocument.id : null;

      // Create database record using raw insert to bypass type checking
      const { error: dbError } = await supabase
        .from("documents")
        .insert({
          organisation_id: organisationId,
          project_id: projectId !== "none" ? projectId : null,
          uploaded_by: user.id,
          name: name.trim(),
          description: description.trim() || null,
          category: category,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          version: newVersion,
          parent_document_id: parentDocId,
        } as any);

      if (dbError) throw dbError;

      // Update organisation storage usage
      const { data: orgData } = await supabase
        .from('organisations')
        .select('storage_used_bytes')
        .eq('id', organisationId)
        .single();
      
      if (orgData) {
        await supabase
          .from('organisations')
          .update({ 
            storage_used_bytes: (orgData.storage_used_bytes || 0) + file.size 
          })
          .eq('id', organisationId);
      }

      // Log activity
      logActivity({
        activityType: 'document_uploaded',
        entityType: 'document',
        entityName: name.trim(),
        description: activityDescriptions.document_uploaded(name.trim()),
        projectId: projectId !== "none" ? projectId : undefined,
      });

      setUploadProgress(100);
      toast.success(parentDocument 
        ? `Version ${parentDocument.version + 1} uploaded successfully!`
        : "Document uploaded successfully!"
      );
      
      setTimeout(() => {
        onUploadComplete();
      }, 500);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = () => {
    if (!file) return null;
    if (file.type.startsWith("image/")) {
      return <Image className="h-8 w-8 text-primary" />;
    }
    return <File className="h-8 w-8 text-primary" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {parentDocument 
              ? `Upload New Version (v${parentDocument.version + 1})`
              : "Upload Document"
            }
          </DialogTitle>
          <DialogDescription>
            {parentDocument
              ? `Uploading a new version of "${parentDocument.name}"`
              : "Upload a safety document, RAMS, or certificate."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* File dropzone */}
          {!file ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm font-medium text-foreground mb-1">
                {isDragActive ? "Drop the file here" : "Drag & drop a file here"}
              </p>
              <p className="text-xs text-muted-foreground">
                or click to browse (PDF, DOC, DOCX, JPG, PNG up to 50MB)
              </p>
            </div>
          ) : (
            <div className="bg-muted/50 rounded-xl p-4 flex items-center gap-4">
              <div className="h-14 w-14 rounded-lg bg-background flex items-center justify-center">
                {getFileIcon()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFile(null)}
                disabled={uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Document details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Document Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g. Site Safety Plan - Phase 1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={uploading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the document..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                disabled={uploading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)} disabled={uploading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Project (Optional)</Label>
                <Select value={projectId} onValueChange={setProjectId} disabled={uploading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No project</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Upload progress */}
          {uploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                {uploadProgress < 100 ? "Uploading..." : "Complete!"}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || !name.trim() || uploading}
            >
              {uploading ? (
                uploadProgress === 100 ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Done!
                  </>
                ) : (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                )
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
