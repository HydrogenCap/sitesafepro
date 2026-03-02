import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateBudgetItem } from "@/hooks/useBudget";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  organisationId: string;
}

export function AddBudgetItemDialog({ open, onOpenChange, projectId, organisationId }: Props) {
  const [form, setForm] = useState({
    code: "",
    description: "",
    category: "",
    budget_value: "",
    forecast_final: "",
  });

  const create = useCreateBudgetItem();

  const handleSubmit = () => {
    if (!form.description.trim()) return;
    const budgetVal = parseFloat(form.budget_value) || null;
    create.mutate(
      {
        project_id: projectId,
        organisation_id: organisationId,
        code: form.code || null,
        description: form.description,
        category: form.category || null,
        budget_value: budgetVal,
        forecast_final: parseFloat(form.forecast_final) || budgetVal,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setForm({ code: "", description: "", category: "", budget_value: "", forecast_final: "" });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Budget Item</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Code</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="A" />
            </div>
            <div className="col-span-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="prelims">Preliminaries</SelectItem>
                  <SelectItem value="groundworks">Groundworks</SelectItem>
                  <SelectItem value="structure">Structure</SelectItem>
                  <SelectItem value="envelope">Envelope</SelectItem>
                  <SelectItem value="mep">M&E</SelectItem>
                  <SelectItem value="finishes">Finishes</SelectItem>
                  <SelectItem value="external">External Works</SelectItem>
                  <SelectItem value="contingency">Contingency</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Substructure concrete works" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Budget Value (£)</Label>
              <Input type="number" step="0.01" value={form.budget_value} onChange={(e) => setForm({ ...form, budget_value: e.target.value })} />
            </div>
            <div>
              <Label>Forecast Final (£)</Label>
              <Input type="number" step="0.01" value={form.forecast_final} onChange={(e) => setForm({ ...form, forecast_final: e.target.value })} placeholder="Defaults to budget" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!form.description.trim() || create.isPending}>
            {create.isPending ? "Adding..." : "Add Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
