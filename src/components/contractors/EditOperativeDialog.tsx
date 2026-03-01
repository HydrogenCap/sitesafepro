import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateOperative } from "@/hooks/useContractors";
import { TRADES, CSCS_CARD_TYPES, ContractorOperative } from "@/types/contractor";

interface Props {
  operative: ContractorOperative;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditOperativeDialog({ operative, open, onOpenChange }: Props) {
  const updateOperative = useUpdateOperative();

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    trade: "",
    role_on_site: "",
    cscs_card_type: "",
    cscs_card_number: "",
    cscs_expiry_date: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
  });

  useEffect(() => {
    if (open) {
      setForm({
        full_name: operative.full_name,
        email: operative.email || "",
        phone: operative.phone || "",
        trade: operative.trade,
        role_on_site: operative.role_on_site || "",
        cscs_card_type: operative.cscs_card_type || "",
        cscs_card_number: operative.cscs_card_number || "",
        cscs_expiry_date: operative.cscs_expiry_date || "",
        emergency_contact_name: operative.emergency_contact_name || "",
        emergency_contact_phone: operative.emergency_contact_phone || "",
      });
    }
  }, [open, operative]);

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name || !form.trade) return;

    await updateOperative.mutateAsync({
      id: operative.id,
      data: {
        full_name: form.full_name,
        email: form.email || null,
        phone: form.phone || null,
        trade: form.trade,
        role_on_site: (form.role_on_site as any) || null,
        cscs_card_type: (form.cscs_card_type as any) || null,
        cscs_card_number: form.cscs_card_number || null,
        cscs_expiry_date: form.cscs_expiry_date || null,
        emergency_contact_name: form.emergency_contact_name || null,
        emergency_contact_phone: form.emergency_contact_phone || null,
      },
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Operative</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="edit_full_name">Full Name *</Label>
              <Input
                id="edit_full_name"
                value={form.full_name}
                onChange={(e) => update("full_name", e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit_email">Email</Label>
              <Input
                id="edit_email"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit_phone">Phone</Label>
              <Input
                id="edit_phone"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
              />
            </div>
            <div>
              <Label>Trade *</Label>
              <Select value={form.trade} onValueChange={(v) => update("trade", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select trade" />
                </SelectTrigger>
                <SelectContent>
                  {TRADES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Role on Site</Label>
              <Select value={form.role_on_site} onValueChange={(v) => update("role_on_site", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operative">Operative</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="foreman">Foreman</SelectItem>
                  <SelectItem value="apprentice">Apprentice</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>CSCS Card Type</Label>
              <Select value={form.cscs_card_type} onValueChange={(v) => update("cscs_card_type", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {CSCS_CARD_TYPES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit_cscs_number">CSCS Card Number</Label>
              <Input
                id="edit_cscs_number"
                value={form.cscs_card_number}
                onChange={(e) => update("cscs_card_number", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit_cscs_expiry">CSCS Expiry Date</Label>
              <Input
                id="edit_cscs_expiry"
                type="date"
                value={form.cscs_expiry_date}
                onChange={(e) => update("cscs_expiry_date", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit_ec_name">Emergency Contact</Label>
              <Input
                id="edit_ec_name"
                placeholder="Name"
                value={form.emergency_contact_name}
                onChange={(e) => update("emergency_contact_name", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit_ec_phone">Emergency Phone</Label>
              <Input
                id="edit_ec_phone"
                value={form.emergency_contact_phone}
                onChange={(e) => update("emergency_contact_phone", e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateOperative.isPending}>
              {updateOperative.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
