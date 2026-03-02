import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DISCIPLINES = [
  { value: "architectural", label: "Architectural" },
  { value: "structural", label: "Structural" },
  { value: "mechanical", label: "Mechanical" },
  { value: "electrical", label: "Electrical" },
  { value: "civil", label: "Civil" },
  { value: "landscape", label: "Landscape" },
];

const STATUSES = [
  { value: "preliminary", label: "Preliminary" },
  { value: "information", label: "For Information" },
  { value: "coordination", label: "Coordination" },
  { value: "construction", label: "Issued for Construction" },
  { value: "as_built", label: "As Built" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  isLoading?: boolean;
}

export function AddDrawingDialog({ open, onOpenChange, onSubmit, isLoading }: Props) {
  const [form, setForm] = useState({
    drawing_number: "",
    title: "",
    discipline: "",
    current_revision: "A",
    status: "information",
    scale: "",
    paper_size: "",
    issued_by: "",
    issued_date: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...form,
      issued_date: form.issued_date || null,
    });
    setForm({
      drawing_number: "",
      title: "",
      discipline: "",
      current_revision: "A",
      status: "information",
      scale: "",
      paper_size: "",
      issued_by: "",
      issued_date: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Drawing</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Drawing Number *</Label>
              <Input
                required
                value={form.drawing_number}
                onChange={(e) => setForm({ ...form, drawing_number: e.target.value })}
                placeholder="SK-001"
              />
            </div>
            <div>
              <Label>Revision</Label>
              <Input
                value={form.current_revision}
                onChange={(e) => setForm({ ...form, current_revision: e.target.value })}
                placeholder="A"
              />
            </div>
          </div>
          <div>
            <Label>Title *</Label>
            <Input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ground Floor Plan"
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
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Scale</Label>
              <Input value={form.scale} onChange={(e) => setForm({ ...form, scale: e.target.value })} placeholder="1:50" />
            </div>
            <div>
              <Label>Paper Size</Label>
              <Input value={form.paper_size} onChange={(e) => setForm({ ...form, paper_size: e.target.value })} placeholder="A1" />
            </div>
            <div>
              <Label>Issued Date</Label>
              <Input type="date" value={form.issued_date} onChange={(e) => setForm({ ...form, issued_date: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Issued By</Label>
            <Input
              value={form.issued_by}
              onChange={(e) => setForm({ ...form, issued_by: e.target.value })}
              placeholder="Architect name / firm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>Add Drawing</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
