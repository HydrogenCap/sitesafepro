import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { COMPLIANCE_DOC_LABELS, ContractorComplianceDoc } from "@/types/contractor";
import { CheckCircle2, AlertTriangle, XCircle, Upload, Shield } from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { UploadComplianceDocDialog } from "./UploadComplianceDocDialog";

interface Props {
  contractorId: string;
  complianceDocs: ContractorComplianceDoc[];
}

export const ContractorComplianceTab = ({ contractorId, complianceDocs }: Props) => {
  const getDocStatus = (doc: ContractorComplianceDoc) => {
    if (!doc.expiry_date) return "valid";
    const daysUntilExpiry = differenceInDays(new Date(doc.expiry_date), new Date());
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

  const groupedDocs = complianceDocs.reduce((acc, doc) => {
    const category = COMPLIANCE_DOC_LABELS[doc.doc_type]?.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(doc);
    return acc;
  }, {} as Record<string, ContractorComplianceDoc[]>);

  if (complianceDocs.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-12 text-center">
        <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-semibold mb-2">No Compliance Documents</h3>
        <p className="text-muted-foreground mb-4">Upload compliance documents to track this contractor's certifications.</p>
        <UploadComplianceDocDialog contractorId={contractorId} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedDocs).map(([category, docs]) => (
        <div key={category} className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold mb-4">{category}</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {docs.map((doc) => {
              const status = getDocStatus(doc);
              const label = COMPLIANCE_DOC_LABELS[doc.doc_type]?.label || doc.doc_type;
              const isInsurance = doc.doc_type.includes('insurance') || doc.doc_type.includes('liability');
              const daysUntilExpiry = doc.expiry_date
                ? differenceInDays(new Date(doc.expiry_date), new Date())
                : null;
              return (
                <div key={doc.id} className="border border-border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-medium text-sm">{label}</span>
                    {getStatusBadge(status)}
                  </div>
                  {doc.reference_number && (
                    <p className="text-xs text-muted-foreground">Ref: {doc.reference_number}</p>
                  )}
                  {doc.expiry_date && (
                    <p className="text-xs text-muted-foreground">
                      Expires: {format(new Date(doc.expiry_date), "dd MMM yyyy")}
                    </p>
                  )}
                  {doc.verified && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-success">
                      <CheckCircle2 className="h-3 w-3" />
                      Verified
                    </div>
                  )}
                  {/* Insurance verification prompt */}
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
          </div>
        </div>
      ))}
    </div>
  );
};
