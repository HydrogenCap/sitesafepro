import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { RamsProgressBar } from "@/components/rams/RamsProgressBar";
import { RamsFormData } from "@/components/rams/types";
import { Json } from "@/integrations/supabase/types";
import {
  Step1ProjectDetails,
  Step2ActivitySelector,
  Step3RiskAssessments,
  Step4MethodStatements,
  Step5ReviewSign,
} from "@/components/rams/steps";
import { ChevronLeft, ChevronRight, Save, FileText } from "lucide-react";
import { addYears } from "date-fns";

const INITIAL_FORM_DATA: RamsFormData = {
  projectId: "",
  title: "",
  ramsReference: "",
  workDescription: "",
  workLocation: "",
  workDuration: "",
  assessmentDate: new Date(),
  reviewDate: addYears(new Date(), 1),
  siteName: "",
  siteAddress: "",
  clientName: "",
  principalContractor: "",
  selectedActivityIds: [],
  riskAssessments: [],
  methodStatements: [],
  ppeRequirements: [],
  emergencyProcedures: "",
  nearestHospital: "",
  siteEmergencyContact: "",
  preparedBySignature: null,
  reviewedById: null,
  reviewedByName: null,
  reviewedBySignature: null,
  approvedById: null,
  approvedByName: null,
  approvedBySignature: null,
};

export default function RamsBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const isEditing = !!id;

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<RamsFormData>(INITIAL_FORM_DATA);

  const updateFormData = (updates: Partial<RamsFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  // Save RAMS mutation
  const saveMutation = useMutation({
    mutationFn: async (status: "draft" | "approved") => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user?.id)
        .single();

      // Get org ID
      const { data: membership } = await supabase
        .from("organisation_members")
        .select("organisation_id")
        .eq("profile_id", user?.id)
        .eq("status", "active")
        .single();

      if (!membership?.organisation_id) throw new Error("No organisation found");

      const ramsData = {
        organisation_id: membership.organisation_id,
        project_id: formData.projectId,
        title: formData.title,
        rams_reference: formData.ramsReference,
        site_name: formData.siteName,
        site_address: formData.siteAddress,
        client_name: formData.clientName || null,
        principal_contractor: formData.principalContractor || null,
        assessment_date: formData.assessmentDate.toISOString().split("T")[0],
        review_date: formData.reviewDate?.toISOString().split("T")[0] || null,
        prepared_by: user?.id,
        prepared_by_name: profile?.full_name || user?.email || "Unknown",
        reviewed_by: formData.reviewedById || null,
        reviewed_by_name: formData.reviewedByName || null,
        approved_by: formData.approvedById || null,
        approved_by_name: formData.approvedByName || null,
        work_description: formData.workDescription,
        work_location: formData.workLocation || null,
        work_duration: formData.workDuration || null,
        risk_assessments: formData.riskAssessments as unknown as Json,
        method_statements: formData.methodStatements as unknown as Json,
        ppe_requirements: formData.ppeRequirements as unknown as Json,
        emergency_procedures: formData.emergencyProcedures || null,
        nearest_hospital: formData.nearestHospital || null,
        site_emergency_contact: formData.siteEmergencyContact || null,
        source_activity_ids: formData.selectedActivityIds,
        status,
      };

      const { data, error } = await supabase
        .from("rams_records")
        .insert([ramsData])
        .select()
        .single();

      if (error) throw error;

      // Save signature if present
      if (formData.preparedBySignature && data) {
        await supabase.from("rams_signatures").insert([{
          rams_id: data.id,
          organisation_id: data.organisation_id,
          signer_id: user?.id,
          signer_name: profile?.full_name || user?.email || "Unknown",
          signer_role: "prepared_by",
          signature_data: formData.preparedBySignature,
        }]);
      }

      return data;
    },
    onSuccess: (data) => {
      toast({ title: "RAMS saved successfully" });
      navigate(`/rams/${data.id}`);
    },
    onError: (error) => {
      toast({ title: "Error saving RAMS", description: error.message, variant: "destructive" });
    },
  });

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.projectId && formData.title && formData.workDescription;
      case 2:
        return formData.selectedActivityIds.length > 0;
      case 3:
        return formData.riskAssessments.length > 0;
      case 4:
        return formData.methodStatements.length > 0;
      case 5:
        return formData.preparedBySignature;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < 5) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1ProjectDetails formData={formData} updateFormData={updateFormData} />;
      case 2:
        return <Step2ActivitySelector formData={formData} updateFormData={updateFormData} />;
      case 3:
        return <Step3RiskAssessments formData={formData} updateFormData={updateFormData} />;
      case 4:
        return <Step4MethodStatements formData={formData} updateFormData={updateFormData} />;
      case 5:
        return <Step5ReviewSign formData={formData} updateFormData={updateFormData} />;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isEditing ? "Edit RAMS" : "Generate RAMS"}
            </h1>
            <p className="text-muted-foreground">
              Risk Assessment & Method Statement Builder
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/rams")}>
            Cancel
          </Button>
        </div>

        {/* Progress Bar */}
        <Card>
          <CardContent className="pt-6">
            <RamsProgressBar currentStep={currentStep} onStepClick={setCurrentStep} />
          </CardContent>
        </Card>

        {/* Step Content */}
        {renderStep()}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleBack} disabled={currentStep === 1}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex gap-2">
            {currentStep === 5 ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => saveMutation.mutate("draft")}
                  disabled={saveMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save as Draft
                </Button>
                <Button
                  onClick={() => saveMutation.mutate("approved")}
                  disabled={!canProceed() || saveMutation.isPending}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Generate PDF & Save
                </Button>
              </>
            ) : (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
