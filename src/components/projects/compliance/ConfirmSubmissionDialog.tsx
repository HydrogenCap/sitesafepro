import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { FileCheck, Calendar } from "lucide-react";

interface ConfirmSubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  requiresDate?: boolean;
  requiresReference?: boolean;
  requiresNotes?: boolean;
  notesLabel?: string;
  notesPlaceholder?: string;
  onConfirm: (data: { date?: string; reference?: string; notes?: string }) => void;
}

export const ConfirmSubmissionDialog = ({
  open,
  onOpenChange,
  title,
  description,
  requiresDate = false,
  requiresReference = false,
  requiresNotes = false,
  notesLabel = "Notes",
  notesPlaceholder = "Add any additional notes...",
  onConfirm,
}: ConfirmSubmissionDialogProps) => {
  const [date, setDate] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const canSubmit =
    (!requiresDate || date.trim()) &&
    (!requiresReference || reference.trim()) &&
    (!requiresNotes || notes.trim());

  const handleConfirm = () => {
    if (canSubmit) {
      onConfirm({
        date: date || undefined,
        reference: reference || undefined,
        notes: notes || undefined,
      });
      handleClose();
    }
  };

  const handleClose = () => {
    setDate("");
    setReference("");
    setNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {requiresDate && (
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Submission/Confirmation Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          )}

          {requiresReference && (
            <div className="space-y-2">
              <Label htmlFor="reference">
                Reference Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="reference"
                placeholder="e.g. F10-2024-12345"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
          )}

          {requiresNotes && (
            <div className="space-y-2">
              <Label htmlFor="notes">
                {notesLabel} <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="notes"
                placeholder={notesPlaceholder}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!canSubmit}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
