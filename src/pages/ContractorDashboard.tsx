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
import {
  Shield, Upload, Building2, CheckCircle2, AlertTriangle, XCircle, FileText, HardHat,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { Link } from "react-router-dom";

export default function ContractorDashboard() {
  const { user } = useAuth();
  const { membership } = useOrg();

  // Find the contractor company linked to this user's email
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

  // Get compliance docs for this contractor
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

  // Get assigned projects
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

        {/* Compliance Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{approvedCount}</p>
                <p className="text-xs text-muted-foreground">Approved</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-xs text-muted-foreground">Pending Review</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rejectedCount}</p>
                <p className="text-xs text-muted-foreground">Rejected</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{missingDocs.length}</p>
                <p className="text-xs text-muted-foreground">Missing</p>
              </div>
            </CardContent>
          </Card>
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
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{label}</p>
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
                          </div>
                          {/* Show rejection info */}
                          {doc.status === "rejected" && doc.rejection_reason && (
                            <p className="text-xs text-destructive mt-1">
                              Rejected: {doc.rejection_reason}
                              {doc.rejection_action_required && ` — ${doc.rejection_action_required}`}
                            </p>
                          )}
                        </div>
                      </div>
                      <ComplianceDocStatusBadge status={doc.status as ComplianceDocStatus} />
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
