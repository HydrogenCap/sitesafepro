import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const DISCIPLINES = [
  { value: "architectural", label: "Architectural" },
  { value: "structural", label: "Structural" },
  { value: "mechanical", label: "Mechanical" },
  { value: "electrical", label: "Electrical" },
  { value: "civil", label: "Civil" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  nextNumber: string;
  isLoading?: boolean;
}

export function AddRFIDialog({ open, onOpenChange, onSubmit, nextNumber, isLoading }: Props) {
  const [form, setForm] = useState({
    rfi_number: nextNumber,
    title: "",
    description: "",
    discipline: "",
    priority: "normal",
    assigned_to_name: "",
    assigned_to_email: "",
    required_by: "",
    cost_impact: false,
    time_impact: false,
  });

  // Update rfi_number when nextNumber changes
  if (form.rfi_number !== nextNumber && !form.title) {
    setForm((prev) => ({ ...prev, rfi_number: nextNumber }));
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...form,
      required_by: form.required_by || null,
    });
    setForm({
      rfi_number: nextNumber,
      title: "",
      description: "",
      discipline: "",
      priority: "normal",
      assigned_to_name: "",
      assigned_to_email: "",
      required_by: "",
      cost_impact: false,
      time_impact: false,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Raise RFI</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>RFI Number</Label>
              <Input
                value={form.rfi_number}
                onChange={(e) => setForm({ ...form, rfi_number: e.target.value })}
              />
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Title *</Label>
            <Input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Clarification on foundation detail"
            />
          </div>
          <div>
            <Label>Description *</Label>
            <Textarea
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the question or issue..."
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Discipline</Label>
              <Select value={form.discipline} onValueChange={(v) => setForm({ ...form, discipline: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {DISCIPLINES.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Required By</Label>
              <Input
                type="date"
                value={form.required_by}
                onChange={(e) => setForm({ ...form, required_by: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Assigned To (Name)</Label>
            <Input
              value={form.assigned_to_name}
              onChange={(e) => setForm({ ...form, assigned_to_name: e.target.value })}
              placeholder="Architect / Engineer name"
            />
          </div>
          <div>
            <Label>Assigned To (Email)</Label>
            <Input
              type="email"
              value={form.assigned_to_email}
              onChange={(e) => setForm({ ...form, assigned_to_email: e.target.value })}
              placeholder="architect@example.com"
            />
          </div>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={form.cost_impact}
                onCheckedChange={(c) => setForm({ ...form, cost_impact: !!c })}
              />
              <Label className="cursor-pointer">Cost Impact</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={form.time_impact}
                onCheckedChange={(c) => setForm({ ...form, time_impact: !!c })}
              />
              <Label className="cursor-pointer">Time Impact</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>Create RFI</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
