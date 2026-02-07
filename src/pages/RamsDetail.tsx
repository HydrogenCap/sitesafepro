import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  Edit, 
  Download, 
  Calendar, 
  MapPin, 
  User, 
  Building2,
  AlertTriangle,
  ClipboardList,
  Shield
} from "lucide-react";
import { format } from "date-fns";
import { RiskAssessment, MethodStatement, calculateRiskRating, getRiskColor } from "@/components/rams/types";

export default function RamsDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: rams, isLoading, error } = useQuery({
    queryKey: ['rams', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rams_records')
        .select(`
          *,
          project:projects(name, address),
          signatures:rams_signatures(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-6 max-w-5xl mx-auto">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !rams) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-6 max-w-5xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">RAMS Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The requested RAMS record could not be found.
            </p>
            <Button onClick={() => navigate('/rams')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to RAMS List
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const riskAssessments = (rams.risk_assessments || []) as unknown as RiskAssessment[];
  const methodStatements = (rams.method_statements || []) as unknown as MethodStatement[];
  const ppeRequirements = (rams.ppe_requirements || []) as string[];

  const statusColor = {
    draft: 'bg-muted text-muted-foreground',
    approved: 'bg-green-500/10 text-green-600',
    archived: 'bg-amber-500/10 text-amber-600',
  }[rams.status] || 'bg-muted text-muted-foreground';

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => navigate('/rams')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-2xl font-bold tracking-tight">{rams.title}</h1>
              <Badge className={statusColor}>{rams.status}</Badge>
            </div>
            <p className="text-muted-foreground ml-10">
              {rams.rams_reference} • Revision {rams.revision_number}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/rams/${id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>

        {/* Project & Site Info */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Project Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Project</span>
                <span className="font-medium">{rams.project?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Site</span>
                <span className="font-medium">{rams.site_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Client</span>
                <span className="font-medium">{rams.client_name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Principal Contractor</span>
                <span className="font-medium">{rams.principal_contractor || 'N/A'}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Assessment Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Assessment Date</span>
                <span className="font-medium">
                  {format(new Date(rams.assessment_date), 'dd MMM yyyy')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Review Date</span>
                <span className="font-medium">
                  {rams.review_date ? format(new Date(rams.review_date), 'dd MMM yyyy') : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prepared By</span>
                <span className="font-medium">{rams.prepared_by_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Work Location</span>
                <span className="font-medium">{rams.work_location || 'N/A'}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Work Description */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Work Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{rams.work_description}</p>
          </CardContent>
        </Card>

        {/* Risk Assessments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Risk Assessments ({riskAssessments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {riskAssessments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No risk assessments recorded.</p>
            ) : (
              <div className="space-y-4">
                {riskAssessments.map((ra, index) => (
                  <div key={ra.id || index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">RA{ra.raNumber}: {ra.subject}</h4>
                        <p className="text-sm text-muted-foreground">{ra.hazardDescription}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline">
                          Initial: <span className={`ml-1 px-1.5 py-0.5 rounded text-xs text-white ${getRiskColor(ra.riskRating)}`}>{ra.riskRating}</span>
                        </Badge>
                        <Badge variant="outline">
                          Residual: <span className={`ml-1 px-1.5 py-0.5 rounded text-xs text-white ${getRiskColor(ra.residualRiskRating)}`}>{ra.residualRiskRating}</span>
                        </Badge>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-1">Existing Controls:</p>
                        <ul className="list-disc list-inside space-y-0.5">
                          {ra.existingControls.map((c, i) => <li key={i}>{c}</li>)}
                        </ul>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Additional Controls:</p>
                        <ul className="list-disc list-inside space-y-0.5">
                          {ra.additionalControls.map((c, i) => <li key={i}>{c}</li>)}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Method Statements */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Method Statements ({methodStatements.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {methodStatements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No method statements recorded.</p>
            ) : (
              <div className="space-y-4">
                {methodStatements.map((ms, index) => (
                  <div key={ms.id || index} className="border rounded-lg p-4 space-y-3">
                    <h4 className="font-medium">MS{ms.msNumber}: {ms.subject}</h4>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Steps:</p>
                      <ol className="list-decimal list-inside space-y-1 text-sm">
                        {ms.steps.map((step) => (
                          <li key={step.stepNumber}>{step.description}</li>
                        ))}
                      </ol>
                    </div>
                    {ms.ppe.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {ms.ppe.map((item) => (
                          <Badge key={item} variant="secondary" className="text-xs">{item}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* PPE Requirements */}
        {ppeRequirements.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                PPE Requirements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {ppeRequirements.map((ppe) => (
                  <Badge key={ppe} variant="outline">{ppe}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Emergency Info */}
        {(rams.emergency_procedures || rams.nearest_hospital || rams.site_emergency_contact) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Emergency Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {rams.emergency_procedures && (
                <div>
                  <p className="text-muted-foreground mb-1">Emergency Procedures:</p>
                  <p className="whitespace-pre-wrap">{rams.emergency_procedures}</p>
                </div>
              )}
              {rams.nearest_hospital && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nearest Hospital</span>
                  <span className="font-medium">{rams.nearest_hospital}</span>
                </div>
              )}
              {rams.site_emergency_contact && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Site Emergency Contact</span>
                  <span className="font-medium">{rams.site_emergency_contact}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
