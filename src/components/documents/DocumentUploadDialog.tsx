import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { usePdfTextExtraction } from '@/hooks/usePdfTextExtraction';
import { useDocumentClassification } from '@/hooks/useDocumentClassification';
import { useDocumentUpload } from '@/hooks/useDocumentUpload';
import { AIClassificationCard } from './AIClassificationCard';
import { FileDropzone } from './FileDropzone';
import { DatePickerField } from './DatePickerField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { File, X, Loader2, CheckCircle, Image, Upload } from 'lucide-react';

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
  { value: 'rams', label: 'RAMS' },
  { value: 'risk_assessment', label: 'Risk Assessment' },
  { value: 'method_statement', label: 'Method Statement' },
  { value: 'safety_plan', label: 'Safety / Construction Phase Plan' },
  { value: 'coshh', label: 'COSHH Assessment' },
  { value: 'fire_safety', label: 'Fire Risk Assessment' },
  { value: 'induction', label: 'Induction Material' },
  { value: 'permit', label: 'Permit to Work' },
  { value: 'inspection', label: 'Inspection Report' },
  { value: 'certificate', label: 'Certificate / Training Record' },
  { value: 'insurance', label: 'Insurance Document' },
  { value: 'meeting_minutes', label: 'Meeting Minutes' },
  { value: 'drawing', label: 'Drawing / Plan' },
  { value: 'other', label: 'Other' },
];

const CATEGORY_LABELS: Record<string, string> = CATEGORIES.reduce(
  (acc, cat) => ({ ...acc, [cat.value]: cat.label }),
  {}
);

type DocumentCategory = typeof CATEGORIES[number]['value'];

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const DocumentUploadDialog = ({
  open,
  onOpenChange,
  organisationId,
  projectId: initialProjectId,
  onUploadComplete,
  parentDocument,
}: DocumentUploadDialogProps) => {
  const { user } = useAuth();
  const { extractTextFromPdf, extracting } = usePdfTextExtraction();
  const { classifyDocument, classifying, classificationResult, clearClassification } =
    useDocumentClassification();
  const { upload, uploading, uploadProgress } = useDocumentUpload();

  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('other');
  const [projectId, setProjectId] = useState(initialProjectId || 'none');
  const [projects, setProjects] = useState<Project[]>([]);
  const [userOverrodeCategory, setUserOverrodeCategory] = useState(false);
  const [userOverrodeName, setUserOverrodeName] = useState(false);
  const [requiresAcknowledgement, setRequiresAcknowledgement] = useState(false);
  const [acknowledgementDeadline, setAcknowledgementDeadline] = useState<Date | undefined>();
  const [expiryDate, setExpiryDate] = useState<Date | undefined>();

  useEffect(() => {
    if (parentDocument && open) {
      setName(parentDocument.name);
      setCategory(parentDocument.category as DocumentCategory);
      setProjectId(parentDocument.project_id || 'none');
      setUserOverrodeName(true);
    } else if (!open) {
      setFile(null);
      setName('');
      setDescription('');
      setCategory('other');
      setProjectId(initialProjectId || 'none');
      setUserOverrodeCategory(false);
      setUserOverrodeName(false);
      setRequiresAcknowledgement(false);
      setAcknowledgementDeadline(undefined);
      setExpiryDate(undefined);
      clearClassification();
    }
  }, [parentDocument, open, initialProjectId, clearClassification]);

  useEffect(() => {
    if (!open) return;
    supabase
      .from('projects')
      .select('id, name')
      .eq('status', 'active')
      .order('name')
      .then(({ data }) => setProjects(data || []));
  }, [open]);

  const runClassification = useCallback(
    async (selectedFile: File) => {
      let textContent: string | null = null;
      if (selectedFile.type === 'application/pdf') {
        const result = await extractTextFromPdf(selectedFile);
        if (result) textContent = result.text;
      }

      const result = await classifyDocument(selectedFile.name, selectedFile.type, textContent);
      if (result) {
        if (!userOverrodeCategory) setCategory(result.category as DocumentCategory);
        if (!userOverrodeName && result.suggestedTitle) setName(result.suggestedTitle);
        if (!description && result.suggestedDescription) setDescription(result.suggestedDescription);
      }
    },
    [extractTextFromPdf, classifyDocument, description, userOverrodeCategory, userOverrodeName]
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      setName(selectedFile.name.replace(/\.[^/.]+$/, ''));
      setUserOverrodeName(false);
      runClassification(selectedFile);
    },
    [runClassification]
  );

  const handleUpload = async () => {
    if (!file || !name.trim() || !user || !organisationId) return;

    const success = await upload({
      file, name, description, category, projectId,
      organisationId, userId: user.id, parentDocument,
      classificationResult, requiresAcknowledgement,
      acknowledgementDeadline, expiryDate, projects,
    });

    if (success) {
      setTimeout(onUploadComplete, 500);
    }
  };

  const isAnalysing = extracting || classifying;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {parentDocument
              ? `Upload New Version (v${parentDocument.version + 1})`
              : 'Upload Document'}
          </DialogTitle>
          <DialogDescription>
            {parentDocument
              ? `Uploading a new version of "${parentDocument.name}"`
              : 'Upload a safety document, RAMS, or certificate.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {!file ? (
            <FileDropzone onDrop={onDrop} />
          ) : (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-xl p-4 flex items-center gap-4">
                <div className="h-14 w-14 rounded-lg bg-background flex items-center justify-center">
                  {file.type.startsWith('image/')
                    ? <Image className="h-8 w-8 text-primary" />
                    : <File className="h-8 w-8 text-primary" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{file.name}</p>
                  <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { setFile(null); clearClassification(); }}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {isAnalysing && (
                <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  <div>
                    <p className="text-sm font-medium text-primary">
                      {extracting ? 'Extracting text from document...' : 'AI is analysing your document...'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      This helps suggest the right category and details
                    </p>
                  </div>
                </div>
              )}

              {!isAnalysing && classificationResult && (
                <AIClassificationCard result={classificationResult} categoryLabels={CATEGORY_LABELS} />
              )}
            </div>
          )}

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
                onChange={(e) => { setName(e.target.value); setUserOverrodeName(true); }}
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
                  onValueChange={(v) => { setCategory(v as DocumentCategory); setUserOverrodeCategory(true); }}
                  disabled={uploading}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Project (Optional)</Label>
                <Select value={projectId} onValueChange={setProjectId} disabled={uploading}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No project</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DatePickerField
              label="Expiry Date (Optional)"
              description="Set for certificates, insurance docs, training records, or any time-limited document."
              value={expiryDate}
              onChange={setExpiryDate}
              disabled={uploading}
              clearLabel="Clear expiry date"
            />

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
                <DatePickerField
                  label="Acknowledgement Deadline (Optional)"
                  value={acknowledgementDeadline}
                  onChange={setAcknowledgementDeadline}
                  disabled={uploading}
                  disablePast
                  placeholder="Pick a deadline"
                  clearLabel="Clear deadline"
                />
              )}
            </div>
          </div>

          {uploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                {uploadProgress < 100 ? 'Uploading...' : 'Complete!'}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || !name.trim() || uploading || isAnalysing}
            >
              {uploading ? (
                uploadProgress === 100
                  ? <><CheckCircle className="h-4 w-4 mr-2" />Done!</>
                  : <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</>
              ) : (
                <><Upload className="h-4 w-4 mr-2" />Upload Document</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
