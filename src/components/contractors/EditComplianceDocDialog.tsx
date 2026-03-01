import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { COMPLIANCE_DOC_LABELS, ContractorComplianceDoc } from "@/types/contractor";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  doc: ContractorComplianceDoc;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditComplianceDocDialog({ doc, open, onOpenChange }: Props) {
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    reference_number: "",
    provider: "",
    cover_amount: "",
    issue_date: "",
    expiry_date: "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        reference_number: doc.reference_number || "",
        provider: doc.provider || "",
        cover_amount: doc.cover_amount || "",
        issue_date: doc.issue_date || "",
        expiry_date: doc.expiry_date || "",
      });
    }
  }, [open, doc]);

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from("contractor_compliance_docs")
        .update({
          reference_number: form.reference_number || null,
          provider: form.provider || null,
          cover_amount: form.cover_amount || null,
          issue_date: form.issue_date || null,
          expiry_date: form.expiry_date || null,
        })
        .eq("id", doc.id);

      if (error) throw error;

      toast.success("Document updated");
      queryClient.invalidateQueries({ queryKey: ["contractor-compliance-docs", doc.contractor_company_id] });
      queryClient.invalidateQueries({ queryKey: ["contractor", doc.contractor_company_id] });
      onOpenChange(false);
    } catch (err: any) {
      console.error("Update error:", err);
      toast.error(err.message || "Failed to update document");
    } finally {
      setSaving(false);
    }
  };

  const label = COMPLIANCE_DOC_LABELS[doc.doc_type]?.label || doc.doc_type;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {label}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit_ref">Reference / Policy Number</Label>
            <Input
              id="edit_ref"
              placeholder="e.g. POL-12345"
              value={form.reference_number}
              onChange={(e) => update("reference_number", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="edit_provider">Provider / Issuer</Label>
            <Input
              id="edit_provider"
              placeholder="e.g. Aviva, CITB"
              value={form.provider}
              onChange={(e) => update("provider", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="edit_cover">Cover Amount</Label>
            <Input
              id="edit_cover"
              placeholder="e.g. £5,000,000"
              value={form.cover_amount}
              onChange={(e) => update("cover_amount", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit_issue">Issue Date</Label>
              <Input
                id="edit_issue"
                type="date"
                value={form.issue_date}
                onChange={(e) => update("issue_date", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit_expiry">Expiry Date</Label>
              <Input
                id="edit_expiry"
                type="date"
                value={form.expiry_date}
                onChange={(e) => update("expiry_date", e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
