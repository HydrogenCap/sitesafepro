import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useCreateVariation } from "@/hooks/useBudget";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  organisationId: string;
  nextNumber: string;
}

export function AddVariationDialog({ open, onOpenChange, projectId, organisationId, nextNumber }: Props) {
  const [form, setForm] = useState({
    variation_number: nextNumber,
    title: "",
    description: "",
    type: "addition" as "addition" | "omission" | "substitution",
    quoted_value: "",
    time_impact_days: "0",
    is_compensation_event: false,
    early_warning_reference: "",
  });

  const createVariation = useCreateVariation();

  const handleSubmit = () => {
    if (!form.title.trim() || !form.variation_number.trim()) return;
    createVariation.mutate(
      {
        project_id: projectId,
        organisation_id: organisationId,
        variation_number: form.variation_number,
        title: form.title,
        description: form.description || null,
        type: form.type,
        quoted_value: form.quoted_value ? parseFloat(form.quoted_value) : null,
        time_impact_days: parseInt(form.time_impact_days) || 0,
        is_compensation_event: form.is_compensation_event,
        early_warning_reference: form.early_warning_reference || null,
        submitted_date: new Date().toISOString().split("T")[0],
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setForm({ variation_number: nextNumber, title: "", description: "", type: "addition", quoted_value: "", time_impact_days: "0", is_compensation_event: false, early_warning_reference: "" });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Variation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Number</Label>
              <Input value={form.variation_number} onChange={(e) => setForm({ ...form, variation_number: e.target.value })} />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="addition">Addition</SelectItem>
                  <SelectItem value="omission">Omission</SelectItem>
                  <SelectItem value="substitution">Substitution</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Additional structural steelwork" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Quoted Value (£)</Label>
              <Input type="number" step="0.01" value={form.quoted_value} onChange={(e) => setForm({ ...form, quoted_value: e.target.value })} />
            </div>
            <div>
              <Label>Time Impact (days)</Label>
              <Input type="number" value={form.time_impact_days} onChange={(e) => setForm({ ...form, time_impact_days: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.is_compensation_event} onCheckedChange={(v) => setForm({ ...form, is_compensation_event: v })} />
            <Label>NEC Compensation Event</Label>
          </div>
          {form.is_compensation_event && (
            <div>
              <Label>Early Warning Reference</Label>
              <Input value={form.early_warning_reference} onChange={(e) => setForm({ ...form, early_warning_reference: e.target.value })} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!form.title.trim() || createVariation.isPending}>
            {createVariation.isPending ? "Creating..." : "Create Variation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
