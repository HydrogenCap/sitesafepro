import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { AlertTriangle, Upload, FileCheck, X } from "lucide-react";
import { useDropzone } from "react-dropzone";

interface F10ExemptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string, evidenceFile?: File) => void;
}

export const F10ExemptionDialog = ({
  open,
  onOpenChange,
  onConfirm,
}: F10ExemptionDialogProps) => {
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) setEvidenceFile(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: { "application/pdf": [".pdf"], "image/*": [".png", ".jpg", ".jpeg"] },
  });

  const handleConfirm = () => {
    if (reason.trim() && confirmed) {
      onConfirm(reason, evidenceFile ?? undefined);
      setReason("");
      setConfirmed(false);
      setEvidenceFile(null);
      onOpenChange(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setReason("");
      setConfirmed(false);
      setEvidenceFile(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            F10 Not Required
          </DialogTitle>
          <DialogDescription>
            Confirm that an F10 notification to HSE is not required for this project
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
            <p className="text-sm text-foreground">
              <strong>Important:</strong> An F10 notification is required if:
            </p>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
              <li>Construction work will last more than 30 working days AND have more than 20 workers at any one time</li>
              <li>OR exceeds 500 person days of construction work</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason why F10 is not required <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Project duration is less than 30 working days with fewer than 20 workers..."
              rows={3}
            />
          </div>

          {/* Evidence upload */}
          <div className="space-y-2">
            <Label>
              Supporting evidence <span className="text-muted-foreground font-normal">(recommended)</span>
            </Label>
            {evidenceFile ? (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-3">
                <FileCheck className="h-4 w-4 text-success flex-shrink-0" />
                <span className="text-sm truncate flex-1">{evidenceFile.name}</span>
                <button onClick={() => setEvidenceFile(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                  isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">
                  Upload project schedule, building control letter, or scope confirmation (PDF/image)
                </p>
              </div>
            )}
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="confirm"
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(checked === true)}
            />
            <label htmlFor="confirm" className="text-sm text-muted-foreground leading-tight">
              I confirm that this project does not meet the notifiable threshold under CDM 2015 regulations
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!reason.trim() || !confirmed}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
