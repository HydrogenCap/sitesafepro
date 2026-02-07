import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, X, Image, Loader2, CheckCircle } from "lucide-react";

interface BulkPhotoUploadProps {
  organisationId: string;
  onPhotosUploaded: (urls: string[]) => void;
  existingPhotos?: string[];
}

interface UploadingFile {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "complete" | "error";
  url?: string;
}

export const BulkPhotoUpload = ({
  organisationId,
  onPhotosUploaded,
  existingPhotos = [],
}: BulkPhotoUploadProps) => {
  const [files, setFiles] = useState<UploadingFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      file,
      progress: 0,
      status: "pending" as const,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp", ".heic"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB per file
    disabled: uploading,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadAllPhotos = async () => {
    if (files.length === 0) return;

    setUploading(true);
    const uploadedUrls: string[] = [...existingPhotos];

    try {
      for (let i = 0; i < files.length; i++) {
        const fileData = files[i];
        if (fileData.status === "complete") {
          if (fileData.url) uploadedUrls.push(fileData.url);
          continue;
        }

        // Update status to uploading
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: "uploading" as const, progress: 10 } : f
          )
        );

        const fileExt = fileData.file.name.split(".").pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const filePath = `${organisationId}/inspections/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(filePath, fileData.file);

        if (uploadError) {
          setFiles((prev) =>
            prev.map((f, idx) =>
              idx === i ? { ...f, status: "error" as const } : f
            )
          );
          console.error("Upload error:", uploadError);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("documents")
          .getPublicUrl(filePath);

        const publicUrl = urlData.publicUrl;
        uploadedUrls.push(publicUrl);

        // Update status to complete
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? { ...f, status: "complete" as const, progress: 100, url: publicUrl }
              : f
          )
        );
      }

      onPhotosUploaded(uploadedUrls);
      toast.success(`${files.length} photo(s) uploaded successfully`);
    } catch (error) {
      console.error("Error uploading photos:", error);
      toast.error("Some photos failed to upload");
    } finally {
      setUploading(false);
    }
  };

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const completeCount = files.filter((f) => f.status === "complete").length;

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
          ${isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
          ${uploading ? "pointer-events-none opacity-50" : ""}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            <Upload className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {isDragActive ? "Drop photos here" : "Click or drag photos to upload"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Upload multiple photos at once (max 10MB each)
            </p>
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              {files.length} photo{files.length !== 1 ? "s" : ""} selected
              {completeCount > 0 && ` (${completeCount} uploaded)`}
            </p>
            {pendingCount > 0 && (
              <Button
                size="sm"
                onClick={uploadAllPhotos}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-1" />
                    Upload All
                  </>
                )}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-64 overflow-y-auto">
            {files.map((fileData, index) => (
              <div
                key={index}
                className="relative group rounded-lg border border-border overflow-hidden bg-muted/30"
              >
                <div className="aspect-square relative">
                  <img
                    src={URL.createObjectURL(fileData.file)}
                    alt={fileData.file.name}
                    className="w-full h-full object-cover"
                  />
                  {fileData.status === "uploading" && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  )}
                  {fileData.status === "complete" && (
                    <div className="absolute top-1 right-1">
                      <CheckCircle className="h-5 w-5 text-success" />
                    </div>
                  )}
                </div>
                {fileData.status === "pending" && (
                  <button
                    onClick={() => removeFile(index)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
                <div className="p-1.5">
                  <p className="text-xs text-muted-foreground truncate">
                    {fileData.file.name}
                  </p>
                </div>
                {fileData.status === "uploading" && (
                  <Progress value={fileData.progress} className="h-1" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {existingPhotos.length > 0 && (
        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">
            {existingPhotos.length} photo(s) already attached
          </p>
        </div>
      )}
    </div>
  );
};
