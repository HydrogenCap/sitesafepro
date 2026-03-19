import { useState } from "react";
import { CheckCircle2, ChevronRight, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { useWorkflowActions } from "@/hooks/useWorkflowActions";
import { useOrg } from "@/hooks/useOrg";
import { DocumentStatusBadge } from "./DocumentStatusBadge";

interface Props { versionId: string; currentStatus: string; onSuccess: () => void; }

export function WorkflowActionBar({ versionId, currentStatus, onSuccess }: Props) {
  const { can } = useOrg();
  const { perform, loading } = useWorkflowActions(onSuccess);
  const [rejectNote, setRejectNote] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const canReview = can("write");
  const canApprove = can("approve");

  return (
    <div className="border-b bg-background px-6 py-3 flex items-center gap-3 flex-wrap">
      <DocumentStatusBadge status={currentStatus} />
      <div className="flex-1" />

      {currentStatus === "draft" && canReview && (
        <Button size="sm" variant="outline"
          onClick={() => perform("request_review", { version_id: versionId })}
          disabled={loading === "request_review"}>
          <ChevronRight className="h-4 w-4 mr-1" />
          {loading === "request_review" ? "Submitting…" : "Request Review"}
        </Button>
      )}

      {currentStatus === "in_review" && canApprove && (
        <>
          <Button size="sm" variant="destructive"
            onClick={() => setShowRejectDialog(true)} disabled={!!loading}>
            <XCircle className="h-4 w-4 mr-1" /> Reject
          </Button>
          <Button size="sm"
            onClick={() => perform("approve", { version_id: versionId })}
            disabled={!!loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <CheckCircle2 className="h-4 w-4 mr-1" />
            {loading === "approve" ? "Approving…" : "Approve"}
          </Button>
        </>
      )}

      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject document for revision?</AlertDialogTitle>
            <AlertDialogDescription>
              The document will be returned to Draft status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea placeholder="Rejection note (optional)…" value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)} rows={3} />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              await perform("reject", { version_id: versionId, reject_note: rejectNote });
              setShowRejectDialog(false);
              setRejectNote("");
            }} className="bg-destructive text-destructive-foreground">
              Confirm Rejection
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
