import { useState } from "react";
import { Play, Send, CheckCircle, RotateCcw, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { EvidenceUpload } from "./EvidenceUpload";

interface StatusWorkflowButtonsProps {
  status: string;
  isAdmin: boolean;
  onStatusChange: (
    newStatus: string,
    data?: { resolutionNotes?: string; afterPhoto?: File }
  ) => Promise<void>;
  actionId: string;
  organisationId: string;
}

export const StatusWorkflowButtons = ({
  status,
  isAdmin,
  onStatusChange,
  actionId,
  organisationId,
}: StatusWorkflowButtonsProps) => {
  const [loading, setLoading] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const handleStatusChange = async (newStatus: string, data?: any) => {
    setLoading(true);
    try {
      await onStatusChange(newStatus, data);
    } finally {
      setLoading(false);
      setSubmitDialogOpen(false);
      setVerifyDialogOpen(false);
      setRejectDialogOpen(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Open -> In Progress */}
      {status === "open" && (
        <Button
          className="w-full bg-blue-500 hover:bg-blue-600"
          onClick={() => handleStatusChange("in_progress")}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          Mark In Progress
        </Button>
      )}

      {/* In Progress -> Awaiting Verification */}
      {status === "in_progress" && (
        <Button
          className="w-full bg-amber-500 hover:bg-amber-600 text-white"
          onClick={() => setSubmitDialogOpen(true)}
          disabled={loading}
        >
          <Send className="h-4 w-4 mr-2" />
          Submit for Verification
        </Button>
      )}

      {/* Awaiting Verification -> Closed or Reject */}
      {status === "awaiting_verification" && isAdmin && (
        <>
          <Button
            className="w-full bg-green-500 hover:bg-green-600"
            onClick={() => setVerifyDialogOpen(true)}
            disabled={loading}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Verify & Close
          </Button>
          <Button
            variant="outline"
            className="w-full border-red-500 text-red-500 hover:bg-red-50"
            onClick={() => setRejectDialogOpen(true)}
            disabled={loading}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Reject — Reopen
          </Button>
        </>
      )}

      {/* Closed -> Reopen */}
      {status === "closed" && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => handleStatusChange("open")}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RotateCcw className="h-4 w-4 mr-2" />
          )}
          Reopen
        </Button>
      )}

      {/* Submit for Verification Dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit for Verification</DialogTitle>
            <DialogDescription>
              Describe what was done to fix this issue and upload a photo showing the corrective
              action has been completed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="resolution-notes">Resolution Notes *</Label>
              <Textarea
                id="resolution-notes"
                placeholder="Describe what was done to fix this issue..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                className="mt-2"
                rows={4}
              />
            </div>

            <EvidenceUpload
              evidenceType="after"
              actionId={actionId}
              organisationId={organisationId}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                handleStatusChange("awaiting_verification", { resolutionNotes })
              }
              disabled={!resolutionNotes.trim() || loading}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verify & Close Dialog */}
      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify & Close</DialogTitle>
            <DialogDescription>
              Confirm you have verified this corrective action has been satisfactorily completed.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="verify-notes">Notes (optional)</Label>
            <Textarea
              id="verify-notes"
              placeholder="Any additional notes..."
              className="mt-2"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-green-500 hover:bg-green-600"
              onClick={() => handleStatusChange("closed")}
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Verify & Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject & Reopen</DialogTitle>
            <DialogDescription>
              Explain why this action is being sent back for further work.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="reject-reason">Reason *</Label>
            <Textarea
              id="reject-reason"
              placeholder="Explain what still needs to be done..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="mt-2"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                handleStatusChange("in_progress", { rejectReason })
              }
              disabled={!rejectReason.trim() || loading}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reject & Reopen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
