import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpsertBudget } from "@/hooks/useBudget";
import type { ProjectBudget } from "@/hooks/useBudget";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  organisationId: string;
  existing?: ProjectBudget | null;
}

export function BudgetSetupDialog({ open, onOpenChange, projectId, organisationId, existing }: Props) {
  const [form, setForm] = useState({
    contract_sum: existing?.contract_sum?.toString() || "",
    contract_type: existing?.contract_type || "",
    contingency: existing?.contingency?.toString() || "",
    anticipated_final_cost: existing?.anticipated_final_cost?.toString() || "",
  });

  const upsert = useUpsertBudget();

  const handleSubmit = () => {
    const contractSum = parseFloat(form.contract_sum) || null;
    upsert.mutate(
      {
        project_id: projectId,
        organisation_id: organisationId,
        contract_sum: contractSum,
        contract_type: form.contract_type || null,
        contingency: parseFloat(form.contingency) || null,
        anticipated_final_cost: parseFloat(form.anticipated_final_cost) || contractSum,
        current_contract_sum: contractSum,
      },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Budget" : "Set Up Budget"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Contract Sum (£)</Label>
            <Input type="number" step="0.01" value={form.contract_sum} onChange={(e) => setForm({ ...form, contract_sum: e.target.value })} placeholder="e.g. 500000.00" />
          </div>
          <div>
            <Label>Contract Type</Label>
            <Select value={form.contract_type} onValueChange={(v) => setForm({ ...form, contract_type: v })}>
              <SelectTrigger><SelectValue placeholder="Select contract type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="JCT_SBC">JCT SBC</SelectItem>
                <SelectItem value="JCT_Minor">JCT Minor Works</SelectItem>
                <SelectItem value="NEC4_ECC">NEC4 ECC</SelectItem>
                <SelectItem value="NEC4_ShortForm">NEC4 Short Form</SelectItem>
                <SelectItem value="Bespoke">Bespoke</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Contingency (£)</Label>
            <Input type="number" step="0.01" value={form.contingency} onChange={(e) => setForm({ ...form, contingency: e.target.value })} />
          </div>
          <div>
            <Label>Anticipated Final Cost (£)</Label>
            <Input type="number" step="0.01" value={form.anticipated_final_cost} onChange={(e) => setForm({ ...form, anticipated_final_cost: e.target.value })} placeholder="Defaults to contract sum" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={upsert.isPending}>
            {upsert.isPending ? "Saving..." : "Save Budget"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
