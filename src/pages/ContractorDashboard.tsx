import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/hooks/useOrg";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ComplianceDocStatusBadge } from "@/components/contractors/ComplianceDocStatusBadge";
import { COMPLIANCE_DOC_LABELS, ComplianceDocStatus } from "@/types/contractor";
import { UploadComplianceDocDialog } from "@/components/contractors/UploadComplianceDocDialog";
import { ContractorProfileCard } from "@/components/contractors/ContractorProfileCard";
import { ComplianceProgressGauge } from "@/components/contractors/ComplianceProgressGauge";
import {
  Upload, Building2, AlertTriangle, FileText, HardHat,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";

export default function ContractorDashboard() {
  const { user } = useAuth();
  const { membership } = useOrg();

  const { data: contractorCompany, isLoading: loadingCompany } = useQuery({
    queryKey: ["my-contractor-company", user?.email, membership?.orgId],
    queryFn: async () => {
      if (!user?.email || !membership?.orgId) return null;
      const { data } = await supabase
        .from("contractor_companies")
        .select("*")
        .eq("organisation_id", membership.orgId)
        .eq("primary_contact_email", user.email)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.email && !!membership?.orgId,
  });

  const { data: complianceDocs = [] } = useQuery({
    queryKey: ["my-compliance-docs", contractorCompany?.id],
    queryFn: async () => {
      if (!contractorCompany?.id) return [];
      const { data } = await supabase
        .from("contractor_compliance_docs")
        .select("*")
        .eq("contractor_company_id", contractorCompany.id)
        .eq("is_current", true)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!contractorCompany?.id,
  });

  const { data: assignedProjects = [] } = useQuery({
    queryKey: ["my-contractor-projects", contractorCompany?.id],
    queryFn: async () => {
      if (!contractorCompany?.id) return [];
      const { data } = await supabase
        .from("project_contractors")
        .select("*, projects:project_id(id, name, address, status)")
        .eq("contractor_company_id", contractorCompany.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!contractorCompany?.id,
  });

  const requiredDocTypes: string[] = (contractorCompany as any)?.required_doc_types || [];
  const uploadedTypes = new Set(complianceDocs.map((d: any) => d.doc_type));
  const missingDocs = requiredDocTypes.filter((dt) => !uploadedTypes.has(dt));
  const approvedCount = complianceDocs.filter((d: any) => d.status === "approved").length;
  const pendingCount = complianceDocs.filter((d: any) =>
    ["uploaded", "ai_checking", "needs_review"].includes(d.status)
  ).length;
  const rejectedCount = complianceDocs.filter((d: any) => d.status === "rejected").length;
  const totalRequired = Math.max(requiredDocTypes.length, complianceDocs.length);

  if (loadingCompany) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!contractorCompany) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <HardHat className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Contractor Portal</h2>
            <p className="text-muted-foreground">
              Your contractor profile is being set up. Please check back shortly.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              {contractorCompany.company_name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Contractor Portal — {membership?.orgName}
            </p>
          </div>
          {contractorCompany.id && (
            <UploadComplianceDocDialog contractorId={contractorCompany.id} />
          )}
        </div>

        {/* Top Row: Profile + Compliance Gauge */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ContractorProfileCard contractor={contractorCompany as any} />
          </div>
          <ComplianceProgressGauge
            approved={approvedCount}
            pending={pendingCount}
            rejected={rejectedCount}
            missing={missingDocs.length}
            total={totalRequired}
          />
        </div>

        {/* Missing Documents Alert */}
        {missingDocs.length > 0 && (
          <Card className="border-warning/30 bg-warning/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Documents Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {missingDocs.map((dt) => (
                  <Badge key={dt} variant="outline" className="border-warning/30 text-warning">
                    {COMPLIANCE_DOC_LABELS[dt as keyof typeof COMPLIANCE_DOC_LABELS]?.label || dt}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                Upload these documents to become fully compliant.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Documents List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Your Documents</CardTitle>
            {contractorCompany.id && (
              <UploadComplianceDocDialog
                contractorId={contractorCompany.id}
                trigger={
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                }
              />
            )}
          </CardHeader>
          <CardContent>
            {complianceDocs.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No documents uploaded yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {complianceDocs.map((doc: any) => {
                  const label = COMPLIANCE_DOC_LABELS[doc.doc_type as keyof typeof COMPLIANCE_DOC_LABELS]?.label || doc.doc_type;
                  const daysUntilExpiry = doc.expiry_date
                    ? differenceInDays(new Date(doc.expiry_date), new Date())
                    : null;

                  return (
                    <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{label}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {doc.expiry_date && (
                              <span className="text-xs text-muted-foreground">
                                Expires: {format(new Date(doc.expiry_date), "dd MMM yyyy")}
                              </span>
                            )}
                            {daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry >= 0 && (
                              <Badge className="bg-warning/10 text-warning text-xs">
                                {daysUntilExpiry}d left
                              </Badge>
                            )}
                            {daysUntilExpiry !== null && daysUntilExpiry < 0 && (
                              <Badge className="bg-destructive/10 text-destructive text-xs">
                                Expired
                              </Badge>
                            )}
                          </div>
                          {doc.status === "rejected" && doc.rejection_reason && (
                            <p className="text-xs text-destructive mt-1">
                              Rejected: {doc.rejection_reason}
                              {doc.rejection_action_required && ` — ${doc.rejection_action_required}`}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {doc.status === "rejected" && contractorCompany.id && (
                          <UploadComplianceDocDialog
                            contractorId={contractorCompany.id}
                            trigger={
                              <Button variant="outline" size="sm" className="text-xs">
                                Re-upload
                              </Button>
                            }
                          />
                        )}
                        <ComplianceDocStatusBadge status={doc.status as ComplianceDocStatus} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assigned Projects */}
        {assignedProjects.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assigned Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {assignedProjects.map((pc: any) => (
                  <div key={pc.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="text-sm font-medium">{pc.projects?.name}</p>
                      <p className="text-xs text-muted-foreground">{pc.projects?.address}</p>
                      {pc.scope_of_works && (
                        <p className="text-xs text-muted-foreground mt-0.5">Scope: {pc.scope_of_works}</p>
                      )}
                    </div>
                    <Badge variant="outline">{pc.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
