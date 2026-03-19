import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProjectImageUploadProps {
  imageUrl: string | null;
  onImageChange: (url: string | null) => void;
  organisationId?: string;
}

export const ProjectImageUpload = ({
  imageUrl,
  onImageChange,
  organisationId,
}: ProjectImageUploadProps) => {
  const [uploading, setUploading] = useState(false);

  const uploadImage = async (file: File) => {
    if (!organisationId) {
      toast.error("Organisation not found");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${organisationId}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("project-images")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("project-images")
        .getPublicUrl(fileName);

      onImageChange(urlData.publicUrl);
      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error("Image must be less than 5MB");
          return;
        }
        uploadImage(file);
      }
    },
    [organisationId]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  const removeImage = () => {
    onImageChange(null);
  };

  if (imageUrl) {
    return (
      <div className="relative">
        <img
          src={imageUrl}
          alt="Project"
          className="w-full h-40 object-cover rounded-xl border border-border"
        />
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8"
          onClick={removeImage}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
        ${isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
        ${uploading ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-2">
        {uploading ? (
          <>
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </>
        ) : (
          <>
            <ImagePlus className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {isDragActive
                ? "Drop image here"
                : "Click or drag to upload project photo"}
            </p>
            <p className="text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
          </>
        )}
      </div>
    </div>
  );
};
