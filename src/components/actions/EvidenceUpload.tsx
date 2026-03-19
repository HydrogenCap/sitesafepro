import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UploadedEvidence {
  id?: string;
  file: File;
  preview: string;
  caption: string;
  uploading?: boolean;
}

interface EvidenceUploadProps {
  evidenceType: "before" | "during" | "after";
  actionId?: string;
  organisationId: string;
  onEvidenceAdded?: (evidence: { file_path: string; file_size: number; mime_type: string; caption: string }) => void;
  existingEvidence?: Array<{
    id: string;
    file_path: string;
    caption: string | null;
    evidence_type: string;
  }>;
}

export const EvidenceUpload = ({
  evidenceType,
  actionId,
  organisationId,
  onEvidenceAdded,
  existingEvidence = [],
}: EvidenceUploadProps) => {
  const [uploads, setUploads] = useState<UploadedEvidence[]>([]);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newUploads = acceptedFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      caption: "",
    }));
    setUploads((prev) => [...prev, ...newUploads]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [],
      "image/png": [],
      "image/webp": [],
      "image/heic": [],
    },
    maxSize: 20 * 1024 * 1024, // 20MB
  });

  const removeUpload = (index: number) => {
    setUploads((prev) => {
      const newUploads = [...prev];
      URL.revokeObjectURL(newUploads[index].preview);
      newUploads.splice(index, 1);
      return newUploads;
    });
  };

  const updateCaption = (index: number, caption: string) => {
    setUploads((prev) => {
      const newUploads = [...prev];
      newUploads[index] = { ...newUploads[index], caption };
      return newUploads;
    });
  };

  const uploadAll = async () => {
    if (!actionId) {
      // If no actionId yet (creating new action), just notify parent
      for (const upload of uploads) {
        const filePath = `${organisationId}/temp/${Date.now()}_${upload.file.name}`;
        onEvidenceAdded?.({
          file_path: filePath,
          file_size: upload.file.size,
          mime_type: upload.file.type,
          caption: upload.caption,
        });
      }
      return;
    }

    setUploading(true);
    try {
      for (const upload of uploads) {
        const filePath = `${organisationId}/${actionId}/${Date.now()}_${upload.file.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from("action-evidence")
          .upload(filePath, upload.file);

        if (uploadError) throw uploadError;

        const { error: insertError } = await supabase
          .from("action_evidence")
          .insert({
            action_id: actionId,
            organisation_id: organisationId,
            file_path: filePath,
            file_size: upload.file.size,
            mime_type: upload.file.type,
            evidence_type: evidenceType,
            caption: upload.caption || null,
            uploaded_by: (await supabase.auth.getUser()).data.user?.id,
          });

        if (insertError) throw insertError;
      }

      toast.success("Evidence uploaded successfully");
      setUploads([]);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload evidence");
    } finally {
      setUploading(false);
    }
  };

  const typeLabels = {
    before: "Before (Problem)",
    during: "During (In Progress)",
    after: "After (Fixed)",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">{typeLabels[evidenceType]} Photos</h4>
        {uploads.length > 0 && actionId && (
          <Button size="sm" onClick={uploadAll} disabled={uploading}>
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Upload All
          </Button>
        )}
      </div>

      {/* Existing evidence */}
      {existingEvidence.filter((e) => e.evidence_type === evidenceType).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {existingEvidence
            .filter((e) => e.evidence_type === evidenceType)
            .map((evidence) => (
              <div key={evidence.id} className="relative group">
                <img
                  src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/authenticated/action-evidence/${evidence.file_path}`}
                  alt={evidence.caption || "Evidence"}
                  className="w-full h-24 object-cover rounded-lg"
                />
                {evidence.caption && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {evidence.caption}
                  </p>
                )}
              </div>
            ))}
        </div>
      )}

      {/* Upload area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        }`}
      >
        <input {...getInputProps()} capture="environment" />
        <Camera className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {isDragActive ? "Drop photos here" : "Tap to take photo or drag & drop"}
        </p>
      </div>

      {/* Pending uploads */}
      {uploads.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {uploads.map((upload, index) => (
            <div key={index} className="relative">
              <img
                src={upload.preview}
                alt={`Upload ${index + 1}`}
                className="w-full h-24 object-cover rounded-lg"
              />
              <button
                onClick={() => removeUpload(index)}
                className="absolute -top-2 -right-2 h-6 w-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
              <Input
                placeholder="Caption (optional)"
                value={upload.caption}
                onChange={(e) => updateCaption(index, e.target.value)}
                className="mt-2 text-xs h-8"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
