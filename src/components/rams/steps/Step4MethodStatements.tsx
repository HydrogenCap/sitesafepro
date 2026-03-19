import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RamsFormData, MethodStatement, MethodStep, PPE_OPTIONS, PERMIT_TYPES, parseJsonArray } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, Trash2, Copy, ChevronUp, ChevronDown, X, GripVertical, FileText } from "lucide-react";

interface Step4Props {
  formData: RamsFormData;
  updateFormData: (updates: Partial<RamsFormData>) => void;
}

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

export function Step4MethodStatements({ formData, updateFormData }: Step4Props) {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Fetch activities for pre-population
  const { data: activities } = useQuery({
    queryKey: ["rams-activity-library-for-methods"],
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

  // Pre-populate method statements from selected activities
  useEffect(() => {
    if (activities && formData.methodStatements.length === 0) {
      const newMSs: MethodStatement[] = [];
      let msNumber = 1;

      activities.forEach((activity) => {
        const steps = parseJsonArray<any>(activity.default_method_steps);
        const ppe = parseJsonArray<string>(activity.default_ppe);
        const legislation = activity.legislation_refs || [];

        newMSs.push({
          id: generateId(),
          msNumber,
          subject: activity.name,
          steps: steps.map((step: any, index: number) => ({
            stepNumber: index + 1,
            description: step.description || step.title || "",
          })),
          ppe: ppe.map(p => String(p)),
          plantEquipment: [],
          permitRequired: false,
          legislationRefs: legislation,
          supervision: "Site foreman to supervise at all times.",
          emergencyProcedure: "In the event of an emergency, stop work, make the area safe, and report to the site manager immediately.",
        });
        msNumber++;
      });

      if (newMSs.length > 0) {
        updateFormData({ methodStatements: newMSs });
        setExpandedItems([newMSs[0]?.id]);
        
        // Aggregate PPE
        const allPpe = new Set<string>();
        newMSs.forEach((ms) => ms.ppe.forEach((p) => allPpe.add(p)));
        updateFormData({ ppeRequirements: Array.from(allPpe) });
      }
    }
  }, [activities]);

  // Update a specific MS
  const updateMS = (id: string, updates: Partial<MethodStatement>) => {
    const updated = formData.methodStatements.map((ms) =>
      ms.id === id ? { ...ms, ...updates } : ms
    );
    updateFormData({ methodStatements: updated });

    // Aggregate PPE
    const allPpe = new Set<string>();
    updated.forEach((ms) => ms.ppe.forEach((p) => allPpe.add(p)));
    updateFormData({ ppeRequirements: Array.from(allPpe) });
  };

  // Update step
  const updateStep = (msId: string, stepIndex: number, description: string) => {
    const ms = formData.methodStatements.find((m) => m.id === msId);
    if (!ms) return;
    
    const updatedSteps = ms.steps.map((step, i) =>
      i === stepIndex ? { ...step, description } : step
    );
    updateMS(msId, { steps: updatedSteps });
  };

  // Add step
  const addStep = (msId: string, afterIndex?: number) => {
    const ms = formData.methodStatements.find((m) => m.id === msId);
    if (!ms) return;
    
    const newStep: MethodStep = {
      stepNumber: ms.steps.length + 1,
      description: "",
    };
    
    const updatedSteps = afterIndex !== undefined
      ? [...ms.steps.slice(0, afterIndex + 1), newStep, ...ms.steps.slice(afterIndex + 1)]
      : [...ms.steps, newStep];
    
    // Renumber
    updatedSteps.forEach((step, i) => (step.stepNumber = i + 1));
    updateMS(msId, { steps: updatedSteps });
  };

  // Remove step
  const removeStep = (msId: string, stepIndex: number) => {
    const ms = formData.methodStatements.find((m) => m.id === msId);
    if (!ms) return;
    
    const updatedSteps = ms.steps.filter((_, i) => i !== stepIndex);
    updatedSteps.forEach((step, i) => (step.stepNumber = i + 1));
    updateMS(msId, { steps: updatedSteps });
  };

  // Toggle PPE
  const togglePpe = (msId: string, ppeItem: string) => {
    const ms = formData.methodStatements.find((m) => m.id === msId);
    if (!ms) return;
    
    const updated = ms.ppe.includes(ppeItem)
      ? ms.ppe.filter((p) => p !== ppeItem)
      : [...ms.ppe, ppeItem];
    updateMS(msId, { ppe: updated });
  };

  // Add/remove plant equipment
  const addPlantEquipment = (msId: string) => {
    const ms = formData.methodStatements.find((m) => m.id === msId);
    if (!ms) return;
    updateMS(msId, { plantEquipment: [...ms.plantEquipment, ""] });
  };

  const updatePlantEquipment = (msId: string, index: number, value: string) => {
    const ms = formData.methodStatements.find((m) => m.id === msId);
    if (!ms) return;
    const updated = [...ms.plantEquipment];
    updated[index] = value;
    updateMS(msId, { plantEquipment: updated });
  };

  const removePlantEquipment = (msId: string, index: number) => {
    const ms = formData.methodStatements.find((m) => m.id === msId);
    if (!ms) return;
    updateMS(msId, { plantEquipment: ms.plantEquipment.filter((_, i) => i !== index) });
  };

  // Add/remove legislation refs
  const addLegislation = (msId: string) => {
    const ms = formData.methodStatements.find((m) => m.id === msId);
    if (!ms) return;
    updateMS(msId, { legislationRefs: [...ms.legislationRefs, ""] });
  };

  const updateLegislation = (msId: string, index: number, value: string) => {
    const ms = formData.methodStatements.find((m) => m.id === msId);
    if (!ms) return;
    const updated = [...ms.legislationRefs];
    updated[index] = value;
    updateMS(msId, { legislationRefs: updated });
  };

  const removeLegislation = (msId: string, index: number) => {
    const ms = formData.methodStatements.find((m) => m.id === msId);
    if (!ms) return;
    updateMS(msId, { legislationRefs: ms.legislationRefs.filter((_, i) => i !== index) });
  };

  // Duplicate MS
  const duplicateMS = (ms: MethodStatement) => {
    const newMS: MethodStatement = {
      ...ms,
      id: generateId(),
      msNumber: formData.methodStatements.length + 1,
      steps: ms.steps.map((s) => ({ ...s })),
      ppe: [...ms.ppe],
      plantEquipment: [...ms.plantEquipment],
      legislationRefs: [...ms.legislationRefs],
    };
    updateFormData({ methodStatements: [...formData.methodStatements, newMS] });
  };

  // Delete MS
  const deleteMS = (id: string) => {
    const updated = formData.methodStatements
      .filter((ms) => ms.id !== id)
      .map((ms, index) => ({ ...ms, msNumber: index + 1 }));
    updateFormData({ methodStatements: updated });
    setDeleteId(null);
  };

  // Move MS up/down
  const moveMS = (id: string, direction: "up" | "down") => {
    const index = formData.methodStatements.findIndex((ms) => ms.id === id);
    if (index === -1) return;
    
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= formData.methodStatements.length) return;
    
    const updated = [...formData.methodStatements];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    updated.forEach((ms, i) => (ms.msNumber = i + 1));
    updateFormData({ methodStatements: updated });
  };

  // Add blank MS
  const addBlankMS = () => {
    const newMS: MethodStatement = {
      id: generateId(),
      msNumber: formData.methodStatements.length + 1,
      subject: "",
      steps: [{ stepNumber: 1, description: "" }],
      ppe: [],
      plantEquipment: [],
      permitRequired: false,
      legislationRefs: [],
      supervision: "Site foreman to supervise at all times.",
      emergencyProcedure: "In the event of an emergency, stop work, make the area safe, and report to the site manager immediately.",
    };
    updateFormData({ methodStatements: [...formData.methodStatements, newMS] });
    setExpandedItems([...expandedItems, newMS.id]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Method Statements</h3>
          <p className="text-sm text-muted-foreground">
            {formData.methodStatements.length} method statements
          </p>
        </div>
        <Button onClick={addBlankMS} variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add Method Statement
        </Button>
      </div>

      {formData.methodStatements.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No method statements yet. Go back to select activities or add one manually.
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
          {formData.methodStatements.map((ms, index) => (
            <AccordionItem
              key={ms.id}
              value={ms.id}
              className="border rounded-lg overflow-hidden"
            >
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-3 flex-1">
                  <Badge variant="outline" className="shrink-0">
                    MS {ms.msNumber}
                  </Badge>
                  <span className="font-medium truncate">
                    {ms.subject || "Untitled Method Statement"}
                  </span>
                  <Badge variant="secondary" className="ml-auto mr-4">
                    {ms.steps.length} steps
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-6 pt-2">
                  {/* Subject */}
                  <div className="space-y-2">
                    <Label>Subject *</Label>
                    <Input
                      value={ms.subject}
                      onChange={(e) => updateMS(ms.id, { subject: e.target.value })}
                      placeholder="e.g. Working at Height — Scaffolding"
                    />
                  </div>

                  {/* Sequential Steps */}
                  <div className="space-y-3">
                    <Label>Method Steps</Label>
                    {ms.steps.map((step, stepIndex) => (
                      <div key={stepIndex} className="flex gap-2 items-start">
                        <div className="flex items-center gap-2 pt-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <Badge variant="outline" className="w-8 justify-center">
                            {step.stepNumber}
                          </Badge>
                        </div>
                        <Textarea
                          value={step.description}
                          onChange={(e) => updateStep(ms.id, stepIndex, e.target.value)}
                          placeholder="Describe this step..."
                          rows={2}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeStep(ms.id, stepIndex)}
                          disabled={ms.steps.length === 1}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addStep(ms.id)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Step
                    </Button>
                  </div>

                  {/* PPE Requirements */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">PPE Requirements</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {PPE_OPTIONS.map((ppe) => (
                          <div key={ppe} className="flex items-center gap-2">
                            <Checkbox
                              id={`${ms.id}-${ppe}`}
                              checked={ms.ppe.includes(ppe)}
                              onCheckedChange={() => togglePpe(ms.id, ppe)}
                            />
                            <Label
                              htmlFor={`${ms.id}-${ppe}`}
                              className="text-sm cursor-pointer"
                            >
                              {ppe}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Plant & Equipment */}
                  <div className="space-y-2">
                    <Label>Plant & Equipment</Label>
                    {ms.plantEquipment.map((item, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          value={item}
                          onChange={(e) => updatePlantEquipment(ms.id, i, e.target.value)}
                          placeholder="e.g. Scaffolding, 110v drill"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removePlantEquipment(ms.id, i)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addPlantEquipment(ms.id)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Equipment
                    </Button>
                  </div>

                  {/* Permit to Work */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={ms.permitRequired}
                        onCheckedChange={(checked) => updateMS(ms.id, { permitRequired: checked })}
                      />
                      <Label className="cursor-pointer">Permit to Work Required?</Label>
                    </div>
                    {ms.permitRequired && (
                      <Select
                        value={ms.permitType}
                        onValueChange={(value) => updateMS(ms.id, { permitType: value })}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Select permit type" />
                        </SelectTrigger>
                        <SelectContent>
                          {PERMIT_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Legislation References */}
                  <div className="space-y-2">
                    <Label>Legislation References</Label>
                    {ms.legislationRefs.map((ref, i) => (
                      <div key={i} className="flex gap-2">
                        <Input
                          value={ref}
                          onChange={(e) => updateLegislation(ms.id, i, e.target.value)}
                          placeholder="e.g. Work at Height Regulations 2005"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLegislation(ms.id, i)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addLegislation(ms.id)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Reference
                    </Button>
                  </div>

                  {/* Supervision */}
                  <div className="space-y-2">
                    <Label>Supervision Arrangements</Label>
                    <Input
                      value={ms.supervision}
                      onChange={(e) => updateMS(ms.id, { supervision: e.target.value })}
                    />
                  </div>

                  {/* Emergency Procedure */}
                  <div className="space-y-2">
                    <Label>Emergency Procedure</Label>
                    <Textarea
                      value={ms.emergencyProcedure}
                      onChange={(e) => updateMS(ms.id, { emergencyProcedure: e.target.value })}
                      rows={2}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => moveMS(ms.id, "up")}
                      disabled={index === 0}
                    >
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Move Up
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => moveMS(ms.id, "down")}
                      disabled={index === formData.methodStatements.length - 1}
                    >
                      <ChevronDown className="h-4 w-4 mr-1" />
                      Move Down
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => duplicateMS(ms)}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Duplicate
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(ms.id)}
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
            <AlertDialogTitle>Delete Method Statement?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this method statement. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMS(deleteId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
