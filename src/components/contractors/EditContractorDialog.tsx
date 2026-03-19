import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useUpdateContractor } from "@/hooks/useContractors";
import { ContractorCompany, TRADES } from "@/types/contractor";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Edit } from "lucide-react";

const formSchema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  trading_name: z.string().optional(),
  company_registration_number: z.string().optional(),
  vat_number: z.string().optional(),
  utr_number: z.string().optional(),
  primary_trade: z.string().min(1, "Primary trade is required"),
  tax_status: z.string().optional(),
  primary_contact_name: z.string().optional(),
  primary_contact_email: z.string().email().optional().or(z.literal("")),
  primary_contact_phone: z.string().optional(),
  office_address: z.string().optional(),
  website: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Props {
  contractor: ContractorCompany;
}

export function EditContractorDialog({ contractor }: Props) {
  const [open, setOpen] = useState(false);
  const updateContractor = useUpdateContractor();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      company_name: contractor.company_name,
      trading_name: contractor.trading_name || "",
      company_registration_number: contractor.company_registration_number || "",
      vat_number: contractor.vat_number || "",
      utr_number: contractor.utr_number || "",
      primary_trade: contractor.primary_trade,
      tax_status: contractor.tax_status || "",
      primary_contact_name: contractor.primary_contact_name || "",
      primary_contact_email: contractor.primary_contact_email || "",
      primary_contact_phone: contractor.primary_contact_phone || "",
      office_address: contractor.office_address || "",
      website: contractor.website || "",
      notes: contractor.notes || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        company_name: contractor.company_name,
        trading_name: contractor.trading_name || "",
        company_registration_number: contractor.company_registration_number || "",
        vat_number: contractor.vat_number || "",
        utr_number: contractor.utr_number || "",
        primary_trade: contractor.primary_trade,
        tax_status: contractor.tax_status || "",
        primary_contact_name: contractor.primary_contact_name || "",
        primary_contact_email: contractor.primary_contact_email || "",
        primary_contact_phone: contractor.primary_contact_phone || "",
        office_address: contractor.office_address || "",
        website: contractor.website || "",
        notes: contractor.notes || "",
      });
    }
  }, [open, contractor]);

  const onSubmit = (data: FormData) => {
    const { tax_status, ...rest } = data;
    const payload: any = { ...rest };
    if (tax_status) payload.tax_status = tax_status;
    updateContractor.mutate(
      { id: contractor.id, data: payload },
      { onSuccess: () => setOpen(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Contractor</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField control={form.control} name="company_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name *</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="trading_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Trading Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="primary_trade" render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Trade *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {TRADES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="tax_status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax Status</FormLabel>
                  <Select value={field.value || ""} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="limited_company">Limited Company</SelectItem>
                      <SelectItem value="sole_trader">Sole Trader</SelectItem>
                      <SelectItem value="partnership">Partnership</SelectItem>
                      <SelectItem value="cis_registered">CIS Registered</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="company_registration_number" render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Reg No.</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="vat_number" render={({ field }) => (
                <FormItem>
                  <FormLabel>VAT Number</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="utr_number" render={({ field }) => (
                <FormItem>
                  <FormLabel>UTR Number</FormLabel>
                  <FormControl><Input placeholder="1234567890" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <h3 className="font-medium text-sm text-muted-foreground pt-2">Contact Information</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField control={form.control} name="primary_contact_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="primary_contact_email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="primary_contact_phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="website" render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="office_address" render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Office Address</FormLabel>
                  <FormControl><Textarea {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Internal Notes</FormLabel>
                <FormControl><Textarea rows={3} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={updateContractor.isPending}>
                {updateContractor.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
