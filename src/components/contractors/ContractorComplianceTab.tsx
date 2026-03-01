import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { COMPLIANCE_DOC_LABELS, ContractorComplianceDoc, ComplianceDocType } from "@/types/contractor";
import { CheckCircle2, AlertTriangle, XCircle, Shield, Circle, Pencil } from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { UploadComplianceDocDialog } from "./UploadComplianceDocDialog";
import { EditRequiredDocsDialog } from "./EditRequiredDocsDialog";
import { EditComplianceDocDialog } from "./EditComplianceDocDialog";

interface Props {
  contractorId: string;
  complianceDocs: ContractorComplianceDoc[];
  requiredDocTypes?: string[];
}

export const ContractorComplianceTab = ({ contractorId, complianceDocs, requiredDocTypes = [] }: Props) => {
  const [editingDoc, setEditingDoc] = useState<ContractorComplianceDoc | null>(null);

  // Parse date string as local to avoid UTC timezone shift
  const parseLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  const getDocStatus = (doc: ContractorComplianceDoc) => {
    if (!doc.expiry_date) return "valid";
    const daysUntilExpiry = differenceInDays(parseLocalDate(doc.expiry_date), new Date());
    if (daysUntilExpiry < 0) return "expired";
    if (daysUntilExpiry <= 30) return "expiring_soon";
    return "valid";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "valid":
        return <Badge className="bg-success/10 text-success">Valid</Badge>;
      case "expiring_soon":
        return <Badge className="bg-warning/10 text-warning">Expiring Soon</Badge>;
      case "expired":
        return <Badge className="bg-destructive/10 text-destructive">Expired</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  // Build a combined view: uploaded docs + missing required docs
  const uploadedByType = complianceDocs.reduce((acc, doc) => {
    acc[doc.doc_type] = doc;
    return acc;
  }, {} as Record<string, ContractorComplianceDoc>);

  const missingRequired = requiredDocTypes.filter(
    (dt) => !uploadedByType[dt]
  ) as ComplianceDocType[];

  const groupedDocs = complianceDocs.reduce((acc, doc) => {
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

  // Merge all categories
  const allCategories = [...new Set([...Object.keys(groupedDocs), ...Object.keys(groupedMissing)])];

  const completedCount = requiredDocTypes.filter((dt) => !!uploadedByType[dt]).length;

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      {requiredDocTypes.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">
              {completedCount} of {requiredDocTypes.length} required documents uploaded
            </span>
            {completedCount === requiredDocTypes.length ? (
              <Badge className="bg-success/10 text-success">Complete</Badge>
            ) : (
              <Badge className="bg-warning/10 text-warning">{requiredDocTypes.length - completedCount} missing</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <EditRequiredDocsDialog contractorId={contractorId} currentDocs={requiredDocTypes} />
            <UploadComplianceDocDialog contractorId={contractorId} />
          </div>
        </div>
      )}

      {requiredDocTypes.length === 0 && (
        <div className="bg-card rounded-xl border border-border p-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">No required documents configured.</span>
          <div className="flex items-center gap-2">
            <EditRequiredDocsDialog contractorId={contractorId} currentDocs={requiredDocTypes} />
            <UploadComplianceDocDialog contractorId={contractorId} />
          </div>
        </div>
      )}

      {complianceDocs.length === 0 && missingRequired.length === 0 && (
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
                const status = getDocStatus(doc);
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
                        {getStatusBadge(status)}
                      </div>
                    </div>
                    {doc.reference_number && (
                      <p className="text-xs text-muted-foreground">Ref: {doc.reference_number}</p>
                    )}
                    {doc.expiry_date && (
                      <p className="text-xs text-muted-foreground">
                        Expires: {format(parseLocalDate(doc.expiry_date), "dd MMM yyyy")}
                      </p>
                    )}
                    {doc.verified && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-success">
                        <CheckCircle2 className="h-3 w-3" />
                        Verified
                      </div>
                    )}
                    {isInsurance && status === "expiring_soon" && daysUntilExpiry !== null && (
                      <div className="mt-2 flex items-start gap-1.5 p-2 rounded bg-warning/10 border border-warning/20">
                        <AlertTriangle className="h-3.5 w-3.5 text-warning flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-foreground">
                          Insurance expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}. Request updated certificate before expiry to maintain compliance.
                        </p>
                      </div>
                    )}
                    {isInsurance && status === "expired" && (
                      <div className="mt-2 flex items-start gap-1.5 p-2 rounded bg-destructive/10 border border-destructive/20">
                        <XCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-foreground">
                          Insurance has expired. This contractor should not work on site until valid cover is provided.
                        </p>
                      </div>
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
                      <Badge variant="outline" className="text-muted-foreground">
                        <Circle className="h-2 w-2 mr-1" />
                        Missing
                      </Badge>
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
    </div>
  );
};
