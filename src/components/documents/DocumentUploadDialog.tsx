import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useActivityLog, activityDescriptions } from "@/hooks/useActivityLog";
import { usePdfTextExtraction } from "@/hooks/usePdfTextExtraction";
import { useDocumentClassification, ClassificationResult } from "@/hooks/useDocumentClassification";
import { useNotifications } from "@/hooks/useNotifications";
import { AIClassificationCard } from "./AIClassificationCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  Sparkles,
  CalendarIcon,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
  { value: "risk_assessment", label: "Risk Assessment" },
  { value: "method_statement", label: "Method Statement" },
  { value: "safety_plan", label: "Safety / Construction Phase Plan" },
  { value: "coshh", label: "COSHH Assessment" },
  { value: "fire_safety", label: "Fire Risk Assessment" },
  { value: "induction", label: "Induction Material" },
  { value: "permit", label: "Permit to Work" },
  { value: "inspection", label: "Inspection Report" },
  { value: "certificate", label: "Certificate / Training Record" },
  { value: "insurance", label: "Insurance Document" },
  { value: "meeting_minutes", label: "Meeting Minutes" },
  { value: "drawing", label: "Drawing / Plan" },
  { value: "other", label: "Other" },
];

const CATEGORY_LABELS: Record<string, string> = CATEGORIES.reduce(
  (acc, cat) => ({ ...acc, [cat.value]: cat.label }),
  {}
);

const ACCEPTED_TYPES = {
  "application/pdf": [".pdf"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

type DocumentCategory =
  | "rams"
  | "risk_assessment"
  | "method_statement"
  | "safety_plan"
  | "coshh"
  | "fire_safety"
  | "induction"
  | "permit"
  | "inspection"
  | "certificate"
  | "insurance"
  | "meeting_minutes"
  | "drawing"
  | "other";

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
  const { extractTextFromPdf, extracting } = usePdfTextExtraction();
  const { classifyDocument, classifying, classificationResult, clearClassification } =
    useDocumentClassification();
  const { notifyDocumentAcknowledgement } = useNotifications();

  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<DocumentCategory>("other");
  const [projectId, setProjectId] = useState(initialProjectId || "none");
  const [projects, setProjects] = useState<Project[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [userOverrodeCategory, setUserOverrodeCategory] = useState(false);
  const [userOverrodeName, setUserOverrodeName] = useState(false);
  const [requiresAcknowledgement, setRequiresAcknowledgement] = useState(false);
  const [acknowledgementDeadline, setAcknowledgementDeadline] = useState<Date | undefined>();

  // Initialize form when parent document changes (versioning)
  useEffect(() => {
    if (parentDocument && open) {
      setName(parentDocument.name);
      setCategory(parentDocument.category as DocumentCategory);
      setProjectId(parentDocument.project_id || "none");
      setUserOverrodeName(true); // Keep parent document name
    } else if (!open) {
      // Reset when dialog closes
      setFile(null);
      setName("");
      setDescription("");
      setCategory("other");
      setProjectId(initialProjectId || "none");
      setUploadProgress(0);
      setUserOverrodeCategory(false);
      setUserOverrodeName(false);
      setRequiresAcknowledgement(false);
      setAcknowledgementDeadline(undefined);
      clearClassification();
    }
  }, [parentDocument, open, initialProjectId, clearClassification]);

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

  // Run AI classification when file is selected
  const runClassification = useCallback(
    async (selectedFile: File) => {
      let textContent: string | null = null;

      // Extract text from PDF
      if (selectedFile.type === "application/pdf") {
        const result = await extractTextFromPdf(selectedFile);
        if (result) {
          textContent = result.text;
        }
      }

      // Classify the document
      const result = await classifyDocument(
        selectedFile.name,
        selectedFile.type,
        textContent
      );

      if (result) {
        // Auto-populate category if user hasn't manually changed it
        if (!userOverrodeCategory) {
          setCategory(result.category as DocumentCategory);
        }
        // Auto-populate name with AI suggestion if user hasn't manually edited
        if (!userOverrodeName && result.suggestedTitle) {
          setName(result.suggestedTitle);
        }
        // Auto-populate description if empty and AI provided one
        if (!description && result.suggestedDescription) {
          setDescription(result.suggestedDescription);
        }
      }
    },
    [extractTextFromPdf, classifyDocument, description, userOverrodeCategory, userOverrodeName]
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const selectedFile = acceptedFiles[0];
        setFile(selectedFile);

        // Set filename as initial placeholder while AI analyzes
        const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
        setName(nameWithoutExt);
        setUserOverrodeName(false); // Reset so AI can override

        // Run AI classification (will auto-rename if successful)
        runClassification(selectedFile);
      }
    },
    [runClassification]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: 52428800, // 50MB
    multiple: false,
  });

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory as DocumentCategory);
    setUserOverrodeCategory(true);
  };

  const handleNameChange = (newName: string) => {
    setName(newName);
    setUserOverrodeName(true); // User manually edited, don't override with AI
  };

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

      // Create database record
      const { data: docData, error: dbError } = await supabase.from("documents").insert({
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
        ai_category: classificationResult?.category || null,
        ai_confidence: classificationResult?.confidence || null,
        ai_compliance_flags: classificationResult?.complianceFlags || null,
        requires_acknowledgement: requiresAcknowledgement,
        acknowledgement_deadline: acknowledgementDeadline?.toISOString() || null,
      } as any).select().single();

      if (dbError) throw dbError;

      // Update organisation storage usage
      const { data: orgData } = await supabase
        .from("organisations")
        .select("storage_used_bytes")
        .eq("id", organisationId)
        .single();

      if (orgData) {
        await supabase
          .from("organisations")
          .update({
            storage_used_bytes: (orgData.storage_used_bytes || 0) + file.size,
          })
          .eq("id", organisationId);
      }

      // Log activity
      logActivity({
        activityType: "document_uploaded",
        entityType: "document",
        entityName: name.trim(),
        description: activityDescriptions.document_uploaded(name.trim()),
        projectId: projectId !== "none" ? projectId : undefined,
      });

      // Send notifications if document requires acknowledgement
      if (requiresAcknowledgement && docData) {
        // Get all active team members (excluding uploader)
        const { data: members } = await supabase
          .from("organisation_members")
          .select("profile_id")
          .eq("organisation_id", organisationId)
          .eq("status", "active")
          .neq("profile_id", user.id);

        if (members && members.length > 0) {
          const recipientIds = members.map((m) => m.profile_id);
          const projectName = projects.find((p) => p.id === projectId)?.name || "General";
          const deadlineStr = acknowledgementDeadline
            ? format(acknowledgementDeadline, "dd MMM yyyy")
            : undefined;

          notifyDocumentAcknowledgement(
            recipientIds,
            docData.id,
            name.trim(),
            projectName,
            deadlineStr
          ).catch((err) => console.error("Failed to send document notifications:", err));
        }
      }

      setUploadProgress(100);
      toast.success(
        parentDocument
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

  const isAnalysing = extracting || classifying;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {parentDocument
              ? `Upload New Version (v${parentDocument.version + 1})`
              : "Upload Document"}
          </DialogTitle>
          <DialogDescription>
            {parentDocument
              ? `Uploading a new version of "${parentDocument.name}"`
              : "Upload a safety document, RAMS, or certificate."}
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
            <div className="space-y-4">
              {/* File preview card */}
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
                  onClick={() => {
                    setFile(null);
                    clearClassification();
                  }}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* AI Classification status / results */}
              {isAnalysing && (
                <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  <div>
                    <p className="text-sm font-medium text-primary">
                      {extracting ? "Extracting text from document..." : "AI is analysing your document..."}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      This helps suggest the right category and details
                    </p>
                  </div>
                </div>
              )}

              {!isAnalysing && classificationResult && (
                <AIClassificationCard
                  result={classificationResult}
                  categoryLabels={CATEGORY_LABELS}
                />
              )}
            </div>
          )}

          {/* Document details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Document Name <span className="text-destructive">*</span>
                {classificationResult?.aiPowered && !userOverrodeName && (
                  <span className="text-xs text-primary ml-2">(AI suggested)</span>
                )}
              </Label>
              <Input
                id="name"
                placeholder="e.g. Site Safety Plan - Phase 1"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
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
                <Select
                  value={category}
                  onValueChange={handleCategoryChange}
                  disabled={uploading}
                >
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

            {/* Requires Acknowledgement toggle */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="requires-ack">Require contractor acknowledgement</Label>
                  <p className="text-xs text-muted-foreground">
                    Team members will need to sign to confirm they've read this document
                  </p>
                </div>
                <Switch
                  id="requires-ack"
                  checked={requiresAcknowledgement}
                  onCheckedChange={setRequiresAcknowledgement}
                  disabled={uploading}
                />
              </div>

              {requiresAcknowledgement && (
                <div className="space-y-2">
                  <Label>Acknowledgement Deadline (Optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !acknowledgementDeadline && "text-muted-foreground"
                        )}
                        disabled={uploading}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {acknowledgementDeadline
                          ? format(acknowledgementDeadline, "PPP")
                          : "Pick a deadline"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={acknowledgementDeadline}
                        onSelect={setAcknowledgementDeadline}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
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
              disabled={!file || !name.trim() || uploading || isAnalysing}
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
