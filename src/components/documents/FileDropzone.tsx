import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

interface FileDropzoneProps {
  onDrop: (files: File[]) => void;
}

export const FileDropzone = ({ onDrop }: FileDropzoneProps) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: 52428800, // 50MB
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
        isDragActive
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50'
      }`}
    >
      <input {...getInputProps()} />
      <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
      <p className="text-sm font-medium text-foreground mb-1">
        {isDragActive ? 'Drop the file here' : 'Drag & drop a file here'}
      </p>
      <p className="text-xs text-muted-foreground">
        or click to browse (PDF, DOC, DOCX, JPG, PNG up to 50MB)
      </p>
    </div>
  );
};
