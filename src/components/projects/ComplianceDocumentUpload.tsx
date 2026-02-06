import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Upload, FileText, Loader2, X } from "lucide-react";

interface ComplianceDocumentUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  requirementType: string;
  onDocumentUploaded: (documentId: string) => void;
}

const REQUIREMENT_LABELS: Record<string, string> = {
  f10: "F10 Notification",
  asbestos_survey: "Asbestos R&D Survey",
  pci: "Pre-Construction Information",
};

const REQUIREMENT_CATEGORIES: Record<string, "permit" | "certificate" | "safety_plan" | "other"> = {
  f10: "permit",
  asbestos_survey: "certificate",
  pci: "safety_plan",
};

export const ComplianceDocumentUpload = ({
  open,
  onOpenChange,
  projectId,
  requirementType,
  onDocumentUploaded,
}: ComplianceDocumentUploadProps) => {
  const { user } = useAuth();
  const { organisation } = useSubscription();
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      if (selectedFile.size > 50 * 1024 * 1024) {
        toast.error("File must be less than 50MB");
        return;
      }
      setFile(selectedFile);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "image/*": [".png", ".jpg", ".jpeg"],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  const handleUpload = async () => {
    if (!file || !user || !organisation) return;

    setUploading(true);
    try {
      // Upload file to storage
      const fileExt = file.name.split(".").pop();
      const filePath = `${organisation.id}/${projectId}/${requirementType}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create document record
      const { data: docData, error: docError } = await supabase
        .from("documents")
        .insert([{
          organisation_id: organisation.id,
          project_id: projectId,
          uploaded_by: user.id,
          name: REQUIREMENT_LABELS[requirementType] || file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          category: REQUIREMENT_CATEGORIES[requirementType] || "other",
          status: "approved", // Auto-approve compliance docs
        }])
        .select()
        .single();

      if (docError) throw docError;

      onDocumentUploaded(docData.id);
      setFile(null);
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error("Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setFile(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload {REQUIREMENT_LABELS[requirementType] || "Document"}</DialogTitle>
          <DialogDescription>
            Upload the required compliance document for this project
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!file ? (
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
                ${isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
              `}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {isDragActive ? "Drop file here" : "Click or drag to upload"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, Word, or image files up to 50MB
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
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

          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
