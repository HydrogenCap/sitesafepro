import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreatePaymentApplication } from "@/hooks/useBudget";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  organisationId: string;
  nextNumber: number;
}

export function AddPaymentApplicationDialog({ open, onOpenChange, projectId, organisationId, nextNumber }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    valuation_date: today,
    gross_value: "",
    retention: "",
    previous_certified: "",
    notes: "",
  });

  const create = useCreatePaymentApplication();

  const grossVal = parseFloat(form.gross_value) || 0;
  const retentionVal = parseFloat(form.retention) || 0;
  const prevCertified = parseFloat(form.previous_certified) || 0;
  const netValue = grossVal - retentionVal;
  const thisApp = netValue - prevCertified;

  // Due date = 28 days from valuation
  const dueDate = form.valuation_date
    ? new Date(new Date(form.valuation_date).getTime() + 28 * 86400000).toISOString().split("T")[0]
    : null;

  const handleSubmit = () => {
    create.mutate(
      {
        project_id: projectId,
        organisation_id: organisationId,
        application_number: nextNumber,
        valuation_date: form.valuation_date,
        submission_date: today,
        due_date: dueDate,
        gross_value: grossVal || null,
        retention: retentionVal || null,
        net_value: netValue || null,
        previous_certified: prevCertified || null,
        this_application: thisApp || null,
        notes: form.notes || null,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setForm({ valuation_date: today, gross_value: "", retention: "", previous_certified: "", notes: "" });
        },
      }
    );
  };

  const fmt = (v: number) => `£${v.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Payment Application #{nextNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Valuation Date</Label>
            <Input type="date" value={form.valuation_date} onChange={(e) => setForm({ ...form, valuation_date: e.target.value })} />
          </div>
          {dueDate && (
            <p className="text-xs text-muted-foreground">
              Due date (28 days): {new Date(dueDate).toLocaleDateString("en-GB")}
            </p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Gross Value (£)</Label>
              <Input type="number" step="0.01" value={form.gross_value} onChange={(e) => setForm({ ...form, gross_value: e.target.value })} />
            </div>
            <div>
              <Label>Retention (£)</Label>
              <Input type="number" step="0.01" value={form.retention} onChange={(e) => setForm({ ...form, retention: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Previous Certified (£)</Label>
            <Input type="number" step="0.01" value={form.previous_certified} onChange={(e) => setForm({ ...form, previous_certified: e.target.value })} />
          </div>
          <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Net Value</span>
              <span className="font-medium">{fmt(netValue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">This Application</span>
              <span className="font-bold">{fmt(thisApp)}</span>
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!form.valuation_date || create.isPending}>
            {create.isPending ? "Creating..." : "Submit Application"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
