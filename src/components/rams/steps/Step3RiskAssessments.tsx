import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RamsFormData, RiskAssessment, ActivityLibraryItem, calculateRiskRating, getRiskColor, parseJsonArray } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Copy, ChevronUp, ChevronDown, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step3Props {
  formData: RamsFormData;
  updateFormData: (updates: Partial<RamsFormData>) => void;
}

const SEVERITY_LABELS: Record<number, string> = {
  1: "Minor Injury",
  2: "Lost Time",
  3: "Serious Injury",
  4: "Critical",
  5: "Death",
};

const PROBABILITY_LABELS: Record<number, string> = {
  1: "Remote",
  2: "Unlikely",
  3: "Reasonable",
  4: "Probable",
  5: "Certain",
};

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

export function Step3RiskAssessments({ formData, updateFormData }: Step3Props) {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Fetch activities for pre-population
  const { data: activities } = useQuery({
    queryKey: ["rams-activity-library-for-risks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rams_activity_library")
        .select("id, name, category, description, default_hazards, default_method_steps, default_ppe, legislation_refs")
        .in("id", formData.selectedActivityIds);
      if (error) throw error;
      return data;
    },
    enabled: formData.selectedActivityIds.length > 0,
  });

  // Pre-populate risk assessments from selected activities
  useEffect(() => {
    if (activities && formData.riskAssessments.length === 0) {
      const newRAs: RiskAssessment[] = [];
      let raNumber = 1;

      activities.forEach((activity) => {
        const hazards = parseJsonArray<any>(activity.default_hazards);
        hazards.forEach((hazard: any) => {
          const severity = hazard.severity || 3;
          const probability = hazard.probability || 3;
          const riskFactor = severity * probability;
          const residualProbability = hazard.residualProbability || 2;
          const residualFactor = severity * residualProbability;

          newRAs.push({
            id: generateId(),
            raNumber,
            subject: activity.name,
            locationOfHazard: hazard.locationOfHazard || "",
            canHazardBeRemoved: false,
            hazardDescription: hazard.description || "",
            hazardSeverity: severity,
            riskProbability: probability,
            riskFactor,
            riskRating: calculateRiskRating(severity, probability),
            existingControls: hazard.existingControls || [],
            whoAtRisk: hazard.whoAtRisk || "",
            couldBeDesignedOut: false,
            additionalControls: hazard.additionalControls || [],
            residualSeverity: severity,
            residualProbability,
            residualRiskFactor: residualFactor,
            residualRiskRating: calculateRiskRating(severity, residualProbability),
            comments: "",
          });
          raNumber++;
        });
      });

      if (newRAs.length > 0) {
        updateFormData({ riskAssessments: newRAs });
        setExpandedItems([newRAs[0]?.id]);
      }
    }
  }, [activities]);

  // Update a specific RA
  const updateRA = (id: string, updates: Partial<RiskAssessment>) => {
    const updated = formData.riskAssessments.map((ra) => {
      if (ra.id !== id) return ra;
      
      const newRA = { ...ra, ...updates };
      
      // Recalculate risk factors
      if (updates.hazardSeverity !== undefined || updates.riskProbability !== undefined) {
        newRA.riskFactor = newRA.hazardSeverity * newRA.riskProbability;
        newRA.riskRating = calculateRiskRating(newRA.hazardSeverity, newRA.riskProbability);
      }
      if (updates.residualSeverity !== undefined || updates.residualProbability !== undefined) {
        newRA.residualRiskFactor = newRA.residualSeverity * newRA.residualProbability;
        newRA.residualRiskRating = calculateRiskRating(newRA.residualSeverity, newRA.residualProbability);
      }
      
      return newRA;
    });
    updateFormData({ riskAssessments: updated });
  };

  // Add control to list
  const addControl = (raId: string, type: "existing" | "additional") => {
    const ra = formData.riskAssessments.find((r) => r.id === raId);
    if (!ra) return;
    
    const field = type === "existing" ? "existingControls" : "additionalControls";
    updateRA(raId, { [field]: [...ra[field], ""] });
  };

  // Update control in list
  const updateControl = (raId: string, type: "existing" | "additional", index: number, value: string) => {
    const ra = formData.riskAssessments.find((r) => r.id === raId);
    if (!ra) return;
    
    const field = type === "existing" ? "existingControls" : "additionalControls";
    const updated = [...ra[field]];
    updated[index] = value;
    updateRA(raId, { [field]: updated });
  };

  // Remove control from list
  const removeControl = (raId: string, type: "existing" | "additional", index: number) => {
    const ra = formData.riskAssessments.find((r) => r.id === raId);
    if (!ra) return;
    
    const field = type === "existing" ? "existingControls" : "additionalControls";
    const updated = ra[field].filter((_, i) => i !== index);
    updateRA(raId, { [field]: updated });
  };

  // Duplicate RA
  const duplicateRA = (ra: RiskAssessment) => {
    const newRA: RiskAssessment = {
      ...ra,
      id: generateId(),
      raNumber: formData.riskAssessments.length + 1,
    };
    updateFormData({ riskAssessments: [...formData.riskAssessments, newRA] });
  };

  // Delete RA
  const deleteRA = (id: string) => {
    const updated = formData.riskAssessments
      .filter((ra) => ra.id !== id)
      .map((ra, index) => ({ ...ra, raNumber: index + 1 }));
    updateFormData({ riskAssessments: updated });
    setDeleteId(null);
  };

  // Move RA up/down
  const moveRA = (id: string, direction: "up" | "down") => {
    const index = formData.riskAssessments.findIndex((ra) => ra.id === id);
    if (index === -1) return;
    
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= formData.riskAssessments.length) return;
    
    const updated = [...formData.riskAssessments];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    
    // Renumber
    updated.forEach((ra, i) => (ra.raNumber = i + 1));
    updateFormData({ riskAssessments: updated });
  };

  // Add blank RA
  const addBlankRA = () => {
    const newRA: RiskAssessment = {
      id: generateId(),
      raNumber: formData.riskAssessments.length + 1,
      subject: "",
      locationOfHazard: "",
      canHazardBeRemoved: false,
      hazardDescription: "",
      hazardSeverity: 3,
      riskProbability: 3,
      riskFactor: 9,
      riskRating: "Medium",
      existingControls: [""],
      whoAtRisk: "",
      couldBeDesignedOut: false,
      additionalControls: [""],
      residualSeverity: 3,
      residualProbability: 2,
      residualRiskFactor: 6,
      residualRiskRating: "Low",
      comments: "",
    };
    updateFormData({ riskAssessments: [...formData.riskAssessments, newRA] });
    setExpandedItems([...expandedItems, newRA.id]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Risk Assessments</h3>
          <p className="text-sm text-muted-foreground">
            {formData.riskAssessments.length} risk assessments
          </p>
        </div>
        <Button onClick={addBlankRA} variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add Risk Assessment
        </Button>
      </div>

      {formData.riskAssessments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No risk assessments yet. Go back to select activities or add one manually.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Accordion
          type="multiple"
          value={expandedItems}
          onValueChange={setExpandedItems}
          className="space-y-4"
        >
          {formData.riskAssessments.map((ra, index) => (
            <AccordionItem
              key={ra.id}
              value={ra.id}
              className="border rounded-lg overflow-hidden"
            >
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-3 flex-1">
                  <Badge variant="outline" className="shrink-0">
                    RA {ra.raNumber}
                  </Badge>
                  <span className="font-medium truncate">
                    {ra.subject || "Untitled Risk Assessment"}
                  </span>
                  <div className="flex items-center gap-2 ml-auto mr-4">
                    <Badge className={cn("text-white", getRiskColor(ra.riskRating))}>
                      {ra.riskFactor} {ra.riskRating[0]}
                    </Badge>
                    <span className="text-muted-foreground">→</span>
                    <Badge className={cn("text-white", getRiskColor(ra.residualRiskRating))}>
                      {ra.residualRiskFactor} {ra.residualRiskRating[0]}
                    </Badge>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-6 pt-2">
                  {/* Subject & Location */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Subject *</Label>
                      <Input
                        value={ra.subject}
                        onChange={(e) => updateRA(ra.id, { subject: e.target.value })}
                        placeholder="e.g. Working at Height — Scaffolding"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Location of Hazard</Label>
                      <Input
                        value={ra.locationOfHazard}
                        onChange={(e) => updateRA(ra.id, { locationOfHazard: e.target.value })}
                        placeholder="e.g. External scaffolding, 2nd floor"
                      />
                    </div>
                  </div>

                  {/* Hazard Description */}
                  <div className="space-y-2">
                    <Label>Hazard Description *</Label>
                    <Textarea
                      value={ra.hazardDescription}
                      onChange={(e) => updateRA(ra.id, { hazardDescription: e.target.value })}
                      rows={3}
                    />
                  </div>

                  {/* Toggles */}
                  <div className="flex flex-wrap gap-6">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={ra.canHazardBeRemoved}
                        onCheckedChange={(checked) => updateRA(ra.id, { canHazardBeRemoved: checked })}
                      />
                      <Label className="cursor-pointer">Can hazard be removed?</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={ra.couldBeDesignedOut}
                        onCheckedChange={(checked) => updateRA(ra.id, { couldBeDesignedOut: checked })}
                      />
                      <Label className="cursor-pointer">Could be designed out?</Label>
                    </div>
                  </div>

                  {/* Who at Risk */}
                  <div className="space-y-2">
                    <Label>Who is at Risk</Label>
                    <Input
                      value={ra.whoAtRisk}
                      onChange={(e) => updateRA(ra.id, { whoAtRisk: e.target.value })}
                      placeholder="e.g. Operatives and persons below"
                    />
                  </div>

                  {/* Risk Scoring */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Initial Risk Assessment</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Severity (1-5)</Label>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((score) => (
                              <Button
                                key={score}
                                type="button"
                                variant={ra.hazardSeverity === score ? "default" : "outline"}
                                className="flex-1 h-12 flex-col p-1"
                                onClick={() => updateRA(ra.id, { hazardSeverity: score, residualSeverity: score })}
                              >
                                <span className="text-lg font-bold">{score}</span>
                                <span className="text-[10px] leading-tight">{SEVERITY_LABELS[score]}</span>
                              </Button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Probability (1-5)</Label>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((score) => (
                              <Button
                                key={score}
                                type="button"
                                variant={ra.riskProbability === score ? "default" : "outline"}
                                className="flex-1 h-12 flex-col p-1"
                                onClick={() => updateRA(ra.id, { riskProbability: score })}
                              >
                                <span className="text-lg font-bold">{score}</span>
                                <span className="text-[10px] leading-tight">{PROBABILITY_LABELS[score]}</span>
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-2 p-3 bg-muted rounded-lg">
                        <span className="text-muted-foreground">Risk Factor:</span>
                        <Badge className={cn("text-white text-lg px-3 py-1", getRiskColor(ra.riskRating))}>
                          {ra.riskFactor} — {ra.riskRating}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Existing Controls */}
                  <div className="space-y-2">
                    <Label>Existing Controls</Label>
                    {ra.existingControls.map((control, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          value={control}
                          onChange={(e) => updateControl(ra.id, "existing", i, e.target.value)}
                          placeholder="Control measure..."
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeControl(ra.id, "existing", i)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addControl(ra.id, "existing")}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Control
                    </Button>
                  </div>

                  {/* Additional Controls */}
                  <div className="space-y-2">
                    <Label>Additional Controls / Precautions</Label>
                    {ra.additionalControls.map((control, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          value={control}
                          onChange={(e) => updateControl(ra.id, "additional", i, e.target.value)}
                          placeholder="Additional control..."
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeControl(ra.id, "additional", i)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addControl(ra.id, "additional")}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Control
                    </Button>
                  </div>

                  {/* Residual Risk */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Residual Risk (After Controls)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Reduced Probability (1-5)</Label>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((score) => (
                            <Button
                              key={score}
                              type="button"
                              variant={ra.residualProbability === score ? "default" : "outline"}
                              className="flex-1 h-12 flex-col p-1"
                              onClick={() => updateRA(ra.id, { residualProbability: score })}
                            >
                              <span className="text-lg font-bold">{score}</span>
                              <span className="text-[10px] leading-tight">{PROBABILITY_LABELS[score]}</span>
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-4 p-3 bg-muted rounded-lg">
                        <div className="text-center">
                          <span className="text-xs text-muted-foreground block">Initial</span>
                          <Badge className={cn("text-white", getRiskColor(ra.riskRating))}>
                            {ra.riskFactor} {ra.riskRating[0]}
                          </Badge>
                        </div>
                        <span className="text-muted-foreground">→</span>
                        <div className="text-center">
                          <span className="text-xs text-muted-foreground block">Residual</span>
                          <Badge className={cn("text-white", getRiskColor(ra.residualRiskRating))}>
                            {ra.residualRiskFactor} {ra.residualRiskRating[0]}
                          </Badge>
                        </div>
                        {ra.residualRiskFactor < ra.riskFactor && (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            Reduced
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Comments */}
                  <div className="space-y-2">
                    <Label>Comments</Label>
                    <Textarea
                      value={ra.comments}
                      onChange={(e) => updateRA(ra.id, { comments: e.target.value })}
                      rows={2}
                      placeholder="Additional notes..."
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => moveRA(ra.id, "up")}
                      disabled={index === 0}
                    >
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Move Up
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => moveRA(ra.id, "down")}
                      disabled={index === formData.riskAssessments.length - 1}
                    >
                      <ChevronDown className="h-4 w-4 mr-1" />
                      Move Down
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => duplicateRA(ra)}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Duplicate
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(ra.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Risk Assessment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this risk assessment. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteRA(deleteId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
