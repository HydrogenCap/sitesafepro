import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/hooks/useOrg";
import { useCompliancePresets } from "@/hooks/useCompliancePresets";
import { TRADES, COMPLIANCE_DOC_LABELS, ComplianceDocType } from "@/types/contractor";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { UserPlus, Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

const formSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  contactName: z.string().min(2, "Contact name is required"),
  email: z.string().email("Valid email is required"),
  primaryTrade: z.string().min(1, "Trade is required"),
  message: z.string().optional(),
  requiredDocTypes: z.array(z.string()).default([]),
});

type FormData = z.infer<typeof formSchema>;

const DEFAULT_REQUIRED_DOCS: ComplianceDocType[] = [
  "public_liability",
  "employers_liability",
];

interface Props {
  trigger?: React.ReactNode;
}

export function InviteContractorDialog({ trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { membership } = useOrg();
  const { data: presets } = useCompliancePresets();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "",
      contactName: "",
      email: "",
      primaryTrade: "",
      message: "",
      requiredDocTypes: DEFAULT_REQUIRED_DOCS,
    },
  });

  // Auto-populate required docs from preset when trade changes
  const watchedTrade = form.watch("primaryTrade");
  useEffect(() => {
    if (!watchedTrade || !presets) return;
    const preset = presets.find((p) => p.trade_category === watchedTrade && p.is_active);
    if (preset) {
      form.setValue("requiredDocTypes", preset.required_doc_types);
    }
  }, [watchedTrade, presets, form]);

  const onSubmit = async (data: FormData) => {
    if (!membership?.orgId) return;
    setSubmitting(true);
    setInviteUrl(null);

    try {
      const { data: result, error } = await supabase.functions.invoke("contractor-invite", {
        body: {
          action: "invite",
          organisationId: membership.orgId,
          companyName: data.companyName,
          contactName: data.contactName,
          email: data.email,
          primaryTrade: data.primaryTrade,
          message: data.message || null,
          requiredDocTypes: data.requiredDocTypes,
        },
      });

      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      setInviteUrl(result.inviteUrl);
      toast.success(result.emailSent
        ? "Invitation sent to contractor"
        : "Invitation created — share the link manually"
      );
    } catch (err: any) {
      console.error("Invite error:", err);
      toast.error(err.message || "Failed to send invitation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      form.reset();
      setInviteUrl(null);
      setCopied(false);
    }
  };

  // Group doc types by category for the checklist
  const docTypesByCategory = Object.entries(COMPLIANCE_DOC_LABELS).reduce(
    (acc, [key, val]) => {
      if (!acc[val.category]) acc[val.category] = [];
      acc[val.category].push({ key, label: val.label });
      return acc;
    },
    {} as Record<string, { key: string; label: string }[]>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Contractor
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite Contractor</DialogTitle>
        </DialogHeader>

        {inviteUrl ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-success/30 bg-success/5 p-4 text-center">
              <Check className="h-8 w-8 text-success mx-auto mb-2" />
              <p className="font-medium text-foreground">Invitation Sent!</p>
              <p className="text-sm text-muted-foreground mt-1">
                The contractor will receive an email to set up their account.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Or share this link directly:</p>
              <div className="flex gap-2">
                <Input value={inviteUrl} readOnly className="text-xs" />
                <Button variant="outline" size="icon" onClick={handleCopyLink}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button className="w-full" onClick={() => handleClose(false)}>
              Done
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="companyName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name *</FormLabel>
                  <FormControl><Input placeholder="ABC Construction Ltd" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="contactName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Name *</FormLabel>
                    <FormControl><Input placeholder="John Smith" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl><Input placeholder="john@abc.com" type="email" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="primaryTrade" render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Trade *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select trade" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {TRADES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="message" render={({ field }) => (
                <FormItem>
                  <FormLabel>Message (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Please upload your insurance docs before site start..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Required documents checklist */}
              <FormField control={form.control} name="requiredDocTypes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Required Documents</FormLabel>
                  <div className="space-y-3 max-h-40 overflow-y-auto border border-border rounded-lg p-3">
                    {Object.entries(docTypesByCategory).slice(0, 3).map(([category, docs]) => (
                      <div key={category}>
                        <p className="text-xs font-medium text-muted-foreground mb-1">{category}</p>
                        {docs.map((doc) => (
                          <div key={doc.key} className="flex items-center gap-2 py-0.5">
                            <Checkbox
                              checked={field.value?.includes(doc.key)}
                              onCheckedChange={(checked) => {
                                const current = field.value || [];
                                field.onChange(
                                  checked
                                    ? [...current, doc.key]
                                    : current.filter((d) => d !== doc.key)
                                );
                              }}
                            />
                            <span className="text-sm">{doc.label}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Send Invitation
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
