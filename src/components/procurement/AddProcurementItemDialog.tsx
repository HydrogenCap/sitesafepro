import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CATEGORIES = [
  { value: "plant", label: "Plant & Equipment" },
  { value: "materials", label: "Materials" },
  { value: "subcontract", label: "Subcontract Package" },
  { value: "specialist", label: "Specialist" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  isLoading?: boolean;
}

export function AddProcurementItemDialog({ open, onOpenChange, onSubmit, isLoading }: Props) {
  const [form, setForm] = useState({
    description: "",
    category: "",
    supplier_name: "",
    design_info_required_date: "",
    required_on_site_date: "",
    lead_time_weeks: "",
    budget_value: "",
    purchase_order_number: "",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      description: form.description,
      category: form.category || null,
      supplier_name: form.supplier_name || null,
      design_info_required_date: form.design_info_required_date || null,
      required_on_site_date: form.required_on_site_date || null,
      lead_time_weeks: form.lead_time_weeks ? parseInt(form.lead_time_weeks) : null,
      budget_value: form.budget_value ? parseFloat(form.budget_value) : null,
      purchase_order_number: form.purchase_order_number || null,
      notes: form.notes || null,
    });
    setForm({
      description: "",
      category: "",
      supplier_name: "",
      design_info_required_date: "",
      required_on_site_date: "",
      lead_time_weeks: "",
      budget_value: "",
      purchase_order_number: "",
      notes: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Procurement Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Description *</Label>
            <Input
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Steel beams — Level 2 frame"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Supplier / Contractor</Label>
              <Input
                value={form.supplier_name}
                onChange={(e) => setForm({ ...form, supplier_name: e.target.value })}
                placeholder="Supplier name"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Design Info Required By</Label>
              <Input type="date" value={form.design_info_required_date} onChange={(e) => setForm({ ...form, design_info_required_date: e.target.value })} />
            </div>
            <div>
              <Label>Required On Site</Label>
              <Input type="date" value={form.required_on_site_date} onChange={(e) => setForm({ ...form, required_on_site_date: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Lead Time (weeks)</Label>
              <Input type="number" min={0} value={form.lead_time_weeks} onChange={(e) => setForm({ ...form, lead_time_weeks: e.target.value })} />
            </div>
            <div>
              <Label>Budget Value (£)</Label>
              <Input type="number" step="0.01" min={0} value={form.budget_value} onChange={(e) => setForm({ ...form, budget_value: e.target.value })} />
            </div>
            <div>
              <Label>PO Number</Label>
              <Input value={form.purchase_order_number} onChange={(e) => setForm({ ...form, purchase_order_number: e.target.value })} placeholder="PO-001" />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>Add Item</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
