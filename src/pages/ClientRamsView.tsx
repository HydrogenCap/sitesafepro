import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ClientLayout } from "@/components/client/ClientLayout";
import { useClientPortal } from "@/contexts/ClientPortalContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar, ClipboardList, FileText, MapPin, Shield } from "lucide-react";
import { format } from "date-fns";
import { MethodStatement, RiskAssessment, getRiskColor } from "@/components/rams/types";

export default function ClientRamsView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { clientUser, logActivity } = useClientPortal();

  const { data: rams, isLoading } = useQuery({
    queryKey: ["client-rams", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rams_records")
        .select(`
          *,
          project:projects(name, address)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id && !!clientUser?.can_view_rams,
  });

  useEffect(() => {
    if (rams) {
      logActivity("viewed_rams", "rams", rams.id, rams.title);
    }
  }, [rams, logActivity]);

  if (!clientUser?.can_view_rams) {
    return (
      <ClientLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="py-10 text-center">
              <p>You do not have permission to view RAMS.</p>
            </CardContent>
          </Card>
        </div>
      </ClientLayout>
    );
  }

  if (isLoading) {
    return (
      <ClientLayout>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-72 rounded-lg" />
        </div>
      </ClientLayout>
    );
  }

  if (!rams) {
    return (
      <ClientLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="py-10 text-center">
              <p>RAMS record not found.</p>
            </CardContent>
          </Card>
        </div>
      </ClientLayout>
    );
  }

  const riskAssessments = (rams.risk_assessments || []) as unknown as RiskAssessment[];
  const methodStatements = (rams.method_statements || []) as unknown as MethodStatement[];
  const ppeRequirements = (rams.ppe_requirements || []) as string[];

  return (
    <ClientLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate(`/client/project/${rams.project_id}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Project
        </Button>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{rams.title}</h1>
            <Badge variant="outline">{rams.status}</Badge>
          </div>
          <p className="text-muted-foreground">
            {rams.rams_reference} · Revision {rams.revision_number}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Project</p>
                <p className="font-medium">{rams.project?.name || "N/A"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Site</p>
                <p className="font-medium">{rams.site_name}</p>
              </div>
              {rams.project?.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <span>{rams.project.address}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assessment Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Assessment Date</p>
                  <p className="font-medium">{format(new Date(rams.assessment_date), "dd MMM yyyy")}</p>
                </div>
              </div>
              {rams.review_date && (
                <div>
                  <p className="text-muted-foreground">Review Date</p>
                  <p className="font-medium">{format(new Date(rams.review_date), "dd MMM yyyy")}</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground">Prepared By</p>
                <p className="font-medium">{rams.prepared_by_name}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Work Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{rams.work_description}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Risk Assessments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {riskAssessments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No risk assessments recorded.</p>
            ) : (
              riskAssessments.map((assessment, index) => (
                <div key={assessment.id || index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium">
                        RA{assessment.raNumber}: {assessment.subject}
                      </h3>
                      <p className="text-sm text-muted-foreground">{assessment.hazardDescription}</p>
                    </div>
                    <Badge className={`${getRiskColor(assessment.residualRiskRating)} text-white`}>
                      Residual {assessment.residualRiskRating}
                    </Badge>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground mb-1">Existing Controls</p>
                      <ul className="list-disc list-inside space-y-1">
                        {assessment.existingControls.map((control, controlIndex) => (
                          <li key={controlIndex}>{control}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Additional Controls</p>
                      <ul className="list-disc list-inside space-y-1">
                        {assessment.additionalControls.map((control, controlIndex) => (
                          <li key={controlIndex}>{control}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Method Statements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {methodStatements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No method statements recorded.</p>
            ) : (
              methodStatements.map((statement, index) => (
                <div key={statement.id || index} className="border rounded-lg p-4 space-y-3">
                  <h3 className="font-medium">
                    MS{statement.msNumber}: {statement.subject}
                  </h3>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    {statement.steps.map((step) => (
                      <li key={step.stepNumber}>{step.description}</li>
                    ))}
                  </ol>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {ppeRequirements.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                PPE Requirements
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {ppeRequirements.map((ppe) => (
                <Badge key={ppe} variant="secondary">{ppe}</Badge>
              ))}
            </CardContent>
          </Card>
        )}

        {clientUser.can_view_documents && rams.document_id && (
          <div className="flex justify-end">
            <Button onClick={() => navigate(`/client/document/${rams.document_id}`)}>
              View Attached Document
            </Button>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
