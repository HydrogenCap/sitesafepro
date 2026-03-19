import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Pencil, Save, X, User, Phone, Mail, MapPin, Globe } from "lucide-react";

interface ContractorProfileCardProps {
  contractor: {
    id: string;
    company_name: string;
    trading_name: string | null;
    primary_contact_name: string | null;
    primary_contact_email: string | null;
    primary_contact_phone: string | null;
    office_address: string | null;
    website: string | null;
    vat_number: string | null;
    company_registration_number: string | null;
  };
}

export function ContractorProfileCard({ contractor }: ContractorProfileCardProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    primary_contact_name: contractor.primary_contact_name || "",
    primary_contact_phone: contractor.primary_contact_phone || "",
    office_address: contractor.office_address || "",
    website: contractor.website || "",
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("contractor_companies")
        .update({
          primary_contact_name: form.primary_contact_name || null,
          primary_contact_phone: form.primary_contact_phone || null,
          office_address: form.office_address || null,
          website: form.website || null,
        })
        .eq("id", contractor.id);

      if (error) throw error;

      toast.success("Profile updated");
      queryClient.invalidateQueries({ queryKey: ["my-contractor-company"] });
      setEditing(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { icon: User, label: "Contact Name", key: "primary_contact_name" as const, value: contractor.primary_contact_name },
    { icon: Mail, label: "Email", key: null, value: contractor.primary_contact_email },
    { icon: Phone, label: "Phone", key: "primary_contact_phone" as const, value: contractor.primary_contact_phone },
    { icon: MapPin, label: "Address", key: "office_address" as const, value: contractor.office_address },
    { icon: Globe, label: "Website", key: "website" as const, value: contractor.website },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Company Profile</CardTitle>
        {!editing ? (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4 mr-1" /> Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>
              <X className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {fields.map(({ icon: Icon, label, key, value }) => (
          <div key={label} className="flex items-start gap-3">
            <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">{label}</p>
              {editing && key ? (
                <Input
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="h-8 mt-0.5 text-sm"
                  placeholder={`Enter ${label.toLowerCase()}`}
                />
              ) : (
                <p className="text-sm font-medium truncate">{value || "—"}</p>
              )}
            </div>
          </div>
        ))}

        {/* Read-only fields */}
        {contractor.vat_number && (
          <div className="flex items-start gap-3 pt-2 border-t border-border">
            <div className="h-4 w-4" />
            <div>
              <p className="text-xs text-muted-foreground">VAT Number</p>
              <p className="text-sm font-medium">{contractor.vat_number}</p>
            </div>
          </div>
        )}
        {contractor.company_registration_number && (
          <div className="flex items-start gap-3">
            <div className="h-4 w-4" />
            <div>
              <p className="text-xs text-muted-foreground">Company Reg.</p>
              <p className="text-sm font-medium">{contractor.company_registration_number}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
