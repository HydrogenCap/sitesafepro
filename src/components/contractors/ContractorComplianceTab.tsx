import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { COMPLIANCE_DOC_LABELS, ContractorComplianceDoc, ComplianceDocType, ComplianceDocStatus } from "@/types/contractor";
import { Shield, Circle, Pencil, Eye, AlertTriangle, XCircle } from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { UploadComplianceDocDialog } from "./UploadComplianceDocDialog";
import { EditRequiredDocsDialog } from "./EditRequiredDocsDialog";
import { EditComplianceDocDialog } from "./EditComplianceDocDialog";
import { ReviewComplianceDocDialog } from "./ReviewComplianceDocDialog";
import { ComplianceDocStatusBadge } from "./ComplianceDocStatusBadge";

interface Props {
  contractorId: string;
  complianceDocs: ContractorComplianceDoc[];
  requiredDocTypes?: string[];
}

export const ContractorComplianceTab = ({ contractorId, complianceDocs, requiredDocTypes = [] }: Props) => {
  const [editingDoc, setEditingDoc] = useState<ContractorComplianceDoc | null>(null);
  const [reviewingDoc, setReviewingDoc] = useState<ContractorComplianceDoc | null>(null);

  const parseLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  // Only show current versions
  const currentDocs = complianceDocs.filter(d => d.is_current !== false);

  const uploadedByType = currentDocs.reduce((acc, doc) => {
    acc[doc.doc_type] = doc;
    return acc;
  }, {} as Record<string, ContractorComplianceDoc>);

  const missingRequired = requiredDocTypes.filter(
    (dt) => !uploadedByType[dt]
  ) as ComplianceDocType[];

  const groupedDocs = currentDocs.reduce((acc, doc) => {
    const category = COMPLIANCE_DOC_LABELS[doc.doc_type]?.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(doc);
    return acc;
  }, {} as Record<string, ContractorComplianceDoc[]>);

  const groupedMissing = missingRequired.reduce((acc, dt) => {
    const info = COMPLIANCE_DOC_LABELS[dt];
    if (!info) return acc;
    if (!acc[info.category]) acc[info.category] = [];
    acc[info.category].push(dt);
    return acc;
  }, {} as Record<string, ComplianceDocType[]>);

  const allCategories = [...new Set([...Object.keys(groupedDocs), ...Object.keys(groupedMissing)])];
  const completedCount = requiredDocTypes.filter((dt) => !!uploadedByType[dt]).length;
  const needsReviewCount = currentDocs.filter(d => d.status === "needs_review" || d.status === "uploaded").length;

  const canReview = (doc: ContractorComplianceDoc) =>
    doc.status === "uploaded" || doc.status === "needs_review" || doc.status === "ai_checking";

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="bg-card rounded-xl border border-border p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Shield className="h-5 w-5 text-primary" />
          {requiredDocTypes.length > 0 ? (
            <>
              <span className="text-sm font-medium">
                {completedCount} of {requiredDocTypes.length} required documents
              </span>
              {completedCount === requiredDocTypes.length ? (
                <Badge className="bg-success/10 text-success">Complete</Badge>
              ) : (
                <Badge className="bg-warning/10 text-warning">{requiredDocTypes.length - completedCount} missing</Badge>
              )}
            </>
          ) : (
            <span className="text-sm text-muted-foreground">No required documents configured.</span>
          )}
          {needsReviewCount > 0 && (
            <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400">
              {needsReviewCount} awaiting review
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <EditRequiredDocsDialog contractorId={contractorId} currentDocs={requiredDocTypes} />
          <UploadComplianceDocDialog contractorId={contractorId} />
        </div>
      </div>

      {currentDocs.length === 0 && missingRequired.length === 0 && (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold mb-2">No Compliance Documents</h3>
          <p className="text-muted-foreground mb-4">Upload compliance documents to track this contractor's certifications.</p>
        </div>
      )}

      {allCategories.map((category) => {
        const docs = groupedDocs[category] || [];
        const missing = groupedMissing[category] || [];
        if (docs.length === 0 && missing.length === 0) return null;

        return (
          <div key={category} className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold mb-4">{category}</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {docs.map((doc) => {
                const label = COMPLIANCE_DOC_LABELS[doc.doc_type]?.label || doc.doc_type;
                const isInsurance = doc.doc_type.includes('insurance') || doc.doc_type.includes('liability');
                const daysUntilExpiry = doc.expiry_date
                  ? differenceInDays(parseLocalDate(doc.expiry_date), new Date())
                  : null;

                return (
                  <div key={doc.id} className="border border-border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-medium text-sm">{label}</span>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingDoc(doc)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        {canReview(doc) && (
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setReviewingDoc(doc)}>
                            <Eye className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Status badge */}
                    <div className="mb-2">
                      <ComplianceDocStatusBadge status={doc.status as ComplianceDocStatus} />
                    </div>

                    {doc.reference_number && (
                      <p className="text-xs text-muted-foreground">Ref: {doc.reference_number}</p>
                    )}
                    {doc.cover_amount && (
                      <p className="text-xs text-muted-foreground">Cover: {doc.cover_amount}</p>
                    )}
                    {doc.expiry_date && (
                      <p className="text-xs text-muted-foreground">
                        Expires: {format(parseLocalDate(doc.expiry_date), "dd MMM yyyy")}
                      </p>
                    )}

                    {/* Rejection info */}
                    {doc.status === "rejected" && doc.rejection_reason && (
                      <div className="mt-2 flex items-start gap-1.5 p-2 rounded bg-destructive/10 border border-destructive/20">
                        <XCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-foreground font-medium">{doc.rejection_reason}</p>
                          {doc.rejection_action_required && (
                            <p className="text-xs text-muted-foreground mt-0.5">{doc.rejection_action_required}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Expiry warnings for approved insurance */}
                    {doc.status === "approved" && isInsurance && daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry >= 0 && (
                      <div className="mt-2 flex items-start gap-1.5 p-2 rounded bg-warning/10 border border-warning/20">
                        <AlertTriangle className="h-3.5 w-3.5 text-warning flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-foreground">
                          Expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}
                        </p>
                      </div>
                    )}

                    {/* Review info */}
                    {doc.reviewed_at && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Reviewed {format(new Date(doc.reviewed_at), "dd MMM yyyy")}
                      </p>
                    )}
                  </div>
                );
              })}

              {/* Missing required docs */}
              {missing.map((dt) => {
                const label = COMPLIANCE_DOC_LABELS[dt]?.label || dt;
                return (
                  <div key={dt} className="border border-dashed border-border rounded-lg p-4 opacity-60">
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-medium text-sm">{label}</span>
                      <ComplianceDocStatusBadge status="missing" />
                    </div>
                    <p className="text-xs text-muted-foreground">Required — not yet uploaded</p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {editingDoc && (
        <EditComplianceDocDialog
          doc={editingDoc}
          open={!!editingDoc}
          onOpenChange={(open) => { if (!open) setEditingDoc(null); }}
        />
      )}
      {reviewingDoc && (
        <ReviewComplianceDocDialog
          doc={reviewingDoc}
          open={!!reviewingDoc}
          onOpenChange={(open) => { if (!open) setReviewingDoc(null); }}
        />
      )}
    </div>
  );
};
