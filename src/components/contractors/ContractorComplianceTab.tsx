import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { COMPLIANCE_DOC_LABELS, ContractorComplianceDoc } from "@/types/contractor";
import { CheckCircle2, AlertTriangle, XCircle, Upload, Eye, Shield } from "lucide-react";
import { differenceInDays, format } from "date-fns";

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
        <Button><Upload className="h-4 w-4 mr-2" />Upload Document</Button>
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
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
