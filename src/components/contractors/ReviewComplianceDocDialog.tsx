import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/hooks/useOrg";
import { COMPLIANCE_DOC_LABELS, ContractorComplianceDoc, DocumentAiCheck } from "@/types/contractor";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Bot,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const REJECTION_TEMPLATES = [
  "Coverage amount below minimum requirement",
  "Document has expired",
  "Company name does not match registered name",
  "Document is not legible / too low resolution",
  "Wrong document type uploaded",
  "Missing required information",
];

interface Props {
  doc: ContractorComplianceDoc;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReviewComplianceDocDialog({ doc, open, onOpenChange }: Props) {
  const [action, setAction] = useState<"approve" | "reject" | "">("");
  const [notes, setNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionAction, setRejectionAction] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [aiCheck, setAiCheck] = useState<DocumentAiCheck | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const { user } = useAuth();
  const { membership } = useOrg();
  const queryClient = useQueryClient();

  const label = COMPLIANCE_DOC_LABELS[doc.doc_type]?.label || doc.doc_type;

  // Load AI check data when dialog opens
  useState(() => {
    if (open && doc.ai_check_id) {
      setLoadingAi(true);
      supabase
        .from("document_ai_checks")
        .select("*")
        .eq("id", doc.ai_check_id)
        .single()
        .then(({ data }) => {
          if (data) setAiCheck(data as unknown as DocumentAiCheck);
          setLoadingAi(false);
        });
    }
  });

  const handleSubmit = async () => {
    if (!action || !user || !membership?.orgId) return;
    if (action === "reject" && !rejectionReason) {
      toast.error("Please provide a rejection reason");
      return;
    }

    setSubmitting(true);
    try {
      const newStatus = action === "approve" ? "approved" : "rejected";

      // Update the compliance doc status
      const updateData: Record<string, any> = {
        status: newStatus,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      };
      if (action === "approve") {
        updateData.verified = true;
        updateData.verified_by = user.id;
        updateData.verified_at = new Date().toISOString();
        updateData.verification_notes = notes || null;
      } else {
        updateData.rejection_reason = rejectionReason;
        updateData.rejection_action_required = rejectionAction || null;
      }

      const { error: updateError } = await supabase
        .from("contractor_compliance_docs")
        .update(updateData)
        .eq("id", doc.id);

      if (updateError) throw updateError;

      // Create review log entry
      const { error: logError } = await supabase
        .from("document_review_log")
        .insert({
          organisation_id: membership.orgId,
          compliance_doc_id: doc.id,
          action: action === "approve" ? "approved" : "rejected",
          actor_id: user.id,
          actor_type: "user",
          previous_status: doc.status,
          new_status: newStatus,
          notes: action === "approve" ? notes : rejectionReason,
          metadata: action === "reject"
            ? { rejection_reason: rejectionReason, action_required: rejectionAction }
            : {},
        });

      if (logError) throw logError;

      toast.success(`Document ${action === "approve" ? "approved" : "rejected"}`);
      queryClient.invalidateQueries({ queryKey: ["contractor-compliance-docs", doc.contractor_company_id] });
      queryClient.invalidateQueries({ queryKey: ["contractor", doc.contractor_company_id] });
      onOpenChange(false);
      setAction("");
      setNotes("");
      setRejectionReason("");
      setRejectionAction("");
    } catch (err: any) {
      console.error("Review error:", err);
      toast.error(err.message || "Failed to process review");
    } finally {
      setSubmitting(false);
    }
  };

  const getAiResultBadge = (result: string | null) => {
    switch (result) {
      case "pass":
        return (
          <Badge className="bg-success/10 text-success">
            <CheckCircle2 className="h-3 w-3 mr-1" /> AI: Pass
          </Badge>
        );
      case "fail":
        return (
          <Badge className="bg-destructive/10 text-destructive">
            <XCircle className="h-3 w-3 mr-1" /> AI: Fail
          </Badge>
        );
      case "needs_review":
        return (
          <Badge className="bg-warning/10 text-warning">
            <AlertTriangle className="h-3 w-3 mr-1" /> AI: Needs Review
          </Badge>
        );
      default:
        return <Badge variant="outline">No AI Check</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Review: {label}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Document Info */}
          <div className="rounded-lg border border-border p-4 space-y-2 text-sm">
            {doc.reference_number && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reference</span>
                <span className="font-medium">{doc.reference_number}</span>
              </div>
            )}
            {doc.provider && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Provider</span>
                <span className="font-medium">{doc.provider}</span>
              </div>
            )}
            {doc.cover_amount && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cover</span>
                <span className="font-medium">{doc.cover_amount}</span>
              </div>
            )}
            {doc.expiry_date && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expires</span>
                <span className="font-medium">{doc.expiry_date}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Uploaded</span>
              <span className="font-medium">{format(new Date(doc.created_at), "dd MMM yyyy HH:mm")}</span>
            </div>
          </div>

          {/* AI Check Results */}
          {loadingAi ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading AI analysis...
            </div>
          ) : aiCheck ? (
            <div className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">AI Analysis</span>
                </div>
                {getAiResultBadge(aiCheck.result)}
              </div>
              {aiCheck.confidence_score !== null && (
                <div className="text-xs text-muted-foreground">
                  Confidence: {Math.round(aiCheck.confidence_score * 100)}%
                </div>
              )}
              {aiCheck.summary && (
                <p className="text-sm text-foreground bg-muted/50 rounded p-2">{aiCheck.summary}</p>
              )}
              {aiCheck.extracted_fields && Object.keys(aiCheck.extracted_fields).length > 0 && (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Extracted Fields</span>
                  <div className="grid gap-1 text-xs">
                    {Object.entries(aiCheck.extracted_fields).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-muted-foreground">{key.replace(/_/g, " ")}</span>
                        <span className="font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {aiCheck.validation_errors && aiCheck.validation_errors.length > 0 && (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-destructive">Issues Found</span>
                  {aiCheck.validation_errors.map((err, i) => (
                    <div key={i} className="text-xs text-destructive flex items-start gap-1">
                      <XCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      {err.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {/* Review Action */}
          <div className="space-y-3 pt-2">
            <Label>Decision</Label>
            <div className="flex gap-3">
              <Button
                type="button"
                variant={action === "approve" ? "default" : "outline"}
                className={action === "approve" ? "bg-success hover:bg-success/90" : ""}
                onClick={() => setAction("approve")}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button
                type="button"
                variant={action === "reject" ? "default" : "outline"}
                className={action === "reject" ? "bg-destructive hover:bg-destructive/90" : ""}
                onClick={() => setAction("reject")}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>

            {action === "approve" && (
              <div className="space-y-2">
                <Label htmlFor="review-notes">Notes (optional)</Label>
                <Textarea
                  id="review-notes"
                  placeholder="Any notes about this approval..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            )}

            {action === "reject" && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Rejection Reason *</Label>
                  <Select value={rejectionReason} onValueChange={setRejectionReason}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select reason..." />
                    </SelectTrigger>
                    <SelectContent>
                      {REJECTION_TEMPLATES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Textarea
                    placeholder="Or type a custom reason..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="action-required">Action Required</Label>
                  <Textarea
                    id="action-required"
                    placeholder="What should the contractor do next?"
                    value={rejectionAction}
                    onChange={(e) => setRejectionAction(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          {action && (
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setAction(""); onOpenChange(false); }}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || (action === "reject" && !rejectionReason)}
                className={action === "approve" ? "bg-success hover:bg-success/90" : "bg-destructive hover:bg-destructive/90"}
              >
                {submitting ? "Processing..." : action === "approve" ? "Confirm Approval" : "Confirm Rejection"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
