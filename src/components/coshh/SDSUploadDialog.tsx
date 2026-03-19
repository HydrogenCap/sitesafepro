import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Upload, FileText, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { COSHHSubstance } from '@/types/coshh';
import { cn } from '@/lib/utils';

interface SDSUploadDialogProps {
  substance: COSHHSubstance | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onUploaded: (documentId: string) => void;
}

export const SDSUploadDialog = ({
  substance,
  open,
  onOpenChange,
  projectId,
  onUploaded,
}: SDSUploadDialogProps) => {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleUpload = async () => {
    if (!file || !user || !substance) return;

    setIsUploading(true);
    try {
      // Get organisation_id
      const { data: memberData } = await supabase
        .from('organisation_members')
        .select('organisation_id')
        .eq('profile_id', user.id)
        .eq('status', 'active')
        .single();

      if (!memberData) {
        toast.error('Organisation not found');
        return;
      }

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${memberData.organisation_id}/${projectId}/sds/${substance.id}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Create document record
      const { data: docData, error: docError } = await supabase
        .from('documents')
        .insert({
          organisation_id: memberData.organisation_id,
          project_id: projectId,
          name: `SDS - ${substance.product_name}`,
          description: `Safety Data Sheet for ${substance.product_name}`,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user.id,
          category: 'coshh',
          status: 'approved',
        })
        .select('id')
        .single();

      if (docError) throw docError;

      onUploaded(docData.id);
      toast.success('Safety Data Sheet uploaded');
      onOpenChange(false);
      setFile(null);
    } catch (error) {
      console.error('Error uploading SDS:', error);
      toast.error('Failed to upload SDS');
    } finally {
      setIsUploading(false);
    }
  };

  if (!substance) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Safety Data Sheet</DialogTitle>
          <DialogDescription>
            Upload the SDS (Safety Data Sheet) for {substance.product_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!file ? (
            <div
              {...getRootProps()}
              className={cn(
                'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              )}
            >
              <input {...getInputProps()} />
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">
                {isDragActive ? 'Drop the file here' : 'Drag & drop SDS here'}
              </p>
              <p className="text-xs text-muted-foreground">
                or click to browse (PDF only, max 10MB)
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-muted rounded-lg p-4">
              <FileText className="h-8 w-8 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFile(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!file || isUploading}>
              {isUploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Upload SDS
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
