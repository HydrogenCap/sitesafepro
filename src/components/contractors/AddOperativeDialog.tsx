import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useCreateOperative } from "@/hooks/useContractors";
import { useOrg } from "@/hooks/useOrg";
import { TRADES, CSCS_CARD_TYPES } from "@/types/contractor";
import { Plus } from "lucide-react";

interface Props {
  contractorId: string;
}

export function AddOperativeDialog({ contractorId }: Props) {
  const [open, setOpen] = useState(false);
  const createOperative = useCreateOperative();
  const { membership } = useOrg();

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

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!membership?.orgId || !form.full_name || !form.trade) return;

    await createOperative.mutateAsync({
      contractor_company_id: contractorId,
      organisation_id: membership.orgId,
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
      health_data_consent: false,
    });

    setForm({
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
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Operative
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Operative</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={(e) => update("full_name", e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
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
              <Label htmlFor="cscs_number">CSCS Card Number</Label>
              <Input
                id="cscs_number"
                value={form.cscs_card_number}
                onChange={(e) => update("cscs_card_number", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="cscs_expiry">CSCS Expiry Date</Label>
              <Input
                id="cscs_expiry"
                type="date"
                value={form.cscs_expiry_date}
                onChange={(e) => update("cscs_expiry_date", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="ec_name">Emergency Contact</Label>
              <Input
                id="ec_name"
                placeholder="Name"
                value={form.emergency_contact_name}
                onChange={(e) => update("emergency_contact_name", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="ec_phone">Emergency Phone</Label>
              <Input
                id="ec_phone"
                value={form.emergency_contact_phone}
                onChange={(e) => update("emergency_contact_phone", e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createOperative.isPending}>
              {createOperative.isPending ? "Adding…" : "Add Operative"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
