import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { RamsFormData, calculateRiskRating, getRiskColor } from "../types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SignatureCanvas from "react-signature-canvas";
import { 
  AlertTriangle, 
  FileText, 
  Shield, 
  Phone, 
  Building, 
  User, 
  Check, 
  X,
  HardHat
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Step5Props {
  formData: RamsFormData;
  updateFormData: (updates: Partial<RamsFormData>) => void;
}

export function Step5ReviewSign({ formData, updateFormData }: Step5Props) {
  const { user } = useAuth();
  const preparedByRef = useRef<SignatureCanvas>(null);
  const reviewedByRef = useRef<SignatureCanvas>(null);
  const approvedByRef = useRef<SignatureCanvas>(null);

  // Fetch current user profile
  const { data: profile } = useQuery({
    queryKey: ["current-user-profile-step5"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch org members for reviewer/approver selection
  const { data: members } = useQuery({
    queryKey: ["org-members-for-rams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organisation_members")
        .select(`
          profile_id,
          profiles (id, full_name, email)
        `)
        .eq("status", "active");
      if (error) throw error;
      return data?.map((m) => m.profiles).filter(Boolean);
    },
  });

  // Save prepared by signature
  const savePreparedSignature = () => {
    if (preparedByRef.current && !preparedByRef.current.isEmpty()) {
      updateFormData({
        preparedBySignature: preparedByRef.current.getTrimmedCanvas().toDataURL("image/png"),
      });
    }
  };

  // Clear signatures
  const clearPreparedSignature = () => {
    preparedByRef.current?.clear();
    updateFormData({ preparedBySignature: null });
  };

  const clearReviewedSignature = () => {
    reviewedByRef.current?.clear();
    updateFormData({ reviewedBySignature: null });
  };

  const clearApprovedSignature = () => {
    approvedByRef.current?.clear();
    updateFormData({ approvedBySignature: null });
  };

  // Summary counts
  const raCount = formData.riskAssessments.length;
  const msCount = formData.methodStatements.length;
  const highRiskCount = formData.riskAssessments.filter((ra) => ra.riskRating === "High").length;

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <Card>
        <CardHeader>
          <CardTitle>RAMS Summary</CardTitle>
          <CardDescription>
            Review the details before generating the PDF
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Project Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Project:</span>
                <span className="font-medium">{formData.siteName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Reference:</span>
                <span className="font-mono font-medium">{formData.ramsReference}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Prepared By:</span>
                <span className="font-medium">{profile?.full_name || user?.email}</span>
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{raCount}</div>
                <div className="text-xs text-muted-foreground">Risk Assessments</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{msCount}</div>
                <div className="text-xs text-muted-foreground">Method Statements</div>
              </div>
              {highRiskCount > 0 && (
                <div className="text-center p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{highRiskCount}</div>
                  <div className="text-xs text-red-600">High Risk Items</div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PPE Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <HardHat className="h-5 w-5" />
            PPE Requirements Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {formData.ppeRequirements.length > 0 ? (
              formData.ppeRequirements.map((ppe) => (
                <Badge key={ppe} variant="secondary">
                  {ppe}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No PPE requirements specified</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Emergency Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Emergency Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Emergency Procedures</Label>
            <Textarea
              value={formData.emergencyProcedures}
              onChange={(e) => updateFormData({ emergencyProcedures: e.target.value })}
              placeholder="Describe emergency procedures..."
              rows={3}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nearest Hospital</Label>
              <Input
                value={formData.nearestHospital}
                onChange={(e) => updateFormData({ nearestHospital: e.target.value })}
                placeholder="Hospital name and address"
              />
            </div>
            <div className="space-y-2">
              <Label>Site Emergency Contact</Label>
              <Input
                value={formData.siteEmergencyContact}
                onChange={(e) => updateFormData({ siteEmergencyContact: e.target.value })}
                placeholder="Name and phone number"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signatures */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Digital Signatures
          </CardTitle>
          <CardDescription>
            Sign to confirm the accuracy of this RAMS document
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Prepared By (Required) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Prepared By *</Label>
              {formData.preparedBySignature && (
                <Badge variant="default" className="gap-1">
                  <Check className="h-3 w-3" />
                  Signed
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              {profile?.full_name || user?.email}
              <span className="text-xs">• {format(new Date(), "PPP")}</span>
            </div>
            <div className="border rounded-lg overflow-hidden bg-white">
              {formData.preparedBySignature ? (
                <div className="relative">
                  <img
                    src={formData.preparedBySignature}
                    alt="Signature"
                    className="w-full h-32 object-contain"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={clearPreparedSignature}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <SignatureCanvas
                    ref={preparedByRef}
                    canvasProps={{
                      className: "w-full h-32 cursor-crosshair",
                    }}
                    onEnd={savePreparedSignature}
                  />
                  <p className="absolute bottom-2 left-2 text-xs text-muted-foreground">
                    Sign here
                  </p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Reviewed By (Optional) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Reviewed By (Optional)</Label>
              {formData.reviewedBySignature && (
                <Badge variant="default" className="gap-1">
                  <Check className="h-3 w-3" />
                  Signed
                </Badge>
              )}
            </div>
            <Select
              value={formData.reviewedById || ""}
              onValueChange={(value) => {
                const member = members?.find((m) => m?.id === value);
                updateFormData({
                  reviewedById: value || null,
                  reviewedByName: member?.full_name || null,
                });
              }}
            >
              <SelectTrigger className="w-full sm:w-[300px]">
                <SelectValue placeholder="Select reviewer (optional)" />
              </SelectTrigger>
              <SelectContent>
                {members?.map((member) => (
                  <SelectItem key={member?.id} value={member?.id || ""}>
                    {member?.full_name || member?.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.reviewedById && (
              <p className="text-sm text-muted-foreground">
                {formData.reviewedByName} will be notified to review and sign this RAMS.
              </p>
            )}
          </div>

          <Separator />

          {/* Approved By (Optional) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Approved By (Optional)</Label>
              {formData.approvedBySignature && (
                <Badge variant="default" className="gap-1">
                  <Check className="h-3 w-3" />
                  Signed
                </Badge>
              )}
            </div>
            <Select
              value={formData.approvedById || ""}
              onValueChange={(value) => {
                const member = members?.find((m) => m?.id === value);
                updateFormData({
                  approvedById: value || null,
                  approvedByName: member?.full_name || null,
                });
              }}
            >
              <SelectTrigger className="w-full sm:w-[300px]">
                <SelectValue placeholder="Select approver (optional)" />
              </SelectTrigger>
              <SelectContent>
                {members?.map((member) => (
                  <SelectItem key={member?.id} value={member?.id || ""}>
                    {member?.full_name || member?.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.approvedById && (
              <p className="text-sm text-muted-foreground">
                {formData.approvedByName} will be notified to approve this RAMS.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Risk Summary */}
      {formData.riskAssessments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Risk Assessment Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {formData.riskAssessments.map((ra) => (
                <div
                  key={ra.id}
                  className="flex items-center justify-between p-2 bg-muted rounded-md"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">RA {ra.raNumber}</Badge>
                    <span className="text-sm font-medium truncate max-w-[200px]">
                      {ra.subject}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={cn("text-white text-xs", getRiskColor(ra.riskRating))}>
                      {ra.riskFactor} {ra.riskRating[0]}
                    </Badge>
                    <span className="text-muted-foreground">→</span>
                    <Badge className={cn("text-white text-xs", getRiskColor(ra.residualRiskRating))}>
                      {ra.residualRiskFactor} {ra.residualRiskRating[0]}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
