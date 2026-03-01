import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/hooks/useOrg";
import { COMPLIANCE_DOC_LABELS, ComplianceDocType } from "@/types/contractor";
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload } from "lucide-react";
import { toast } from "sonner";

const formSchema = z.object({
  doc_type: z.string().min(1, "Document type is required"),
  reference_number: z.string().optional(),
  provider: z.string().optional(),
  cover_amount: z.string().optional(),
  issue_date: z.string().optional(),
  expiry_date: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Props {
  contractorId: string;
  trigger?: React.ReactNode;
}

export function UploadComplianceDocDialog({ contractorId, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();
  const { membership } = useOrg();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      doc_type: "",
      reference_number: "",
      provider: "",
      cover_amount: "",
      issue_date: "",
      expiry_date: "",
    },
  });

  const groupedDocTypes = Object.entries(COMPLIANCE_DOC_LABELS).reduce(
    (acc, [key, value]) => {
      if (!acc[value.category]) acc[value.category] = [];
      acc[value.category].push({ key, label: value.label });
      return acc;
    },
    {} as Record<string, { key: string; label: string }[]>
  );

  const orgId = membership?.orgId;

  const onSubmit = async (data: FormData) => {
    if (!user || !orgId) return;
    setUploading(true);

    try {
      let filePath: string | null = null;

      if (file) {
        const ext = file.name.split(".").pop();
        const path = `${orgId}/contractors/${contractorId}/${data.doc_type}_${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("compliance-docs")
          .upload(path, file);
        if (uploadError) throw uploadError;
        filePath = path;
      }

      const { data: insertedDoc, error } = await supabase.from("contractor_compliance_docs").insert({
        contractor_company_id: contractorId,
        organisation_id: orgId,
        doc_type: data.doc_type as ComplianceDocType,
        reference_number: data.reference_number || null,
        provider: data.provider || null,
        cover_amount: data.cover_amount || null,
        issue_date: data.issue_date || null,
        expiry_date: data.expiry_date || null,
        file_path: filePath,
        uploaded_by: user.id,
        status: "uploaded",
        is_current: true,
        version_number: 1,
      }).select("id").single();

      if (error) throw error;

      // Create audit trail entry
      if (insertedDoc?.id) {
        await supabase.from("document_review_log").insert({
          organisation_id: orgId,
          compliance_doc_id: insertedDoc.id,
          action: "uploaded",
          actor_id: user.id,
          actor_type: "user",
          previous_status: null,
          new_status: "uploaded",
          notes: null,
          metadata: { doc_type: data.doc_type, file_path: filePath },
        });
      }

      toast.success("Compliance document uploaded");
      queryClient.invalidateQueries({ queryKey: ["contractor-compliance-docs", contractorId] });
      queryClient.invalidateQueries({ queryKey: ["contractor", contractorId] });
      setOpen(false);
      form.reset();
      setFile(null);
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.message || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Compliance Document</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="doc_type" render={({ field }) => (
              <FormItem>
                <FormLabel>Document Type *</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {Object.entries(groupedDocTypes).map(([category, docs]) => (
                      docs.map((doc) => (
                        <SelectItem key={doc.key} value={doc.key}>
                          {category} — {doc.label}
                        </SelectItem>
                      ))
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="reference_number" render={({ field }) => (
              <FormItem>
                <FormLabel>Reference / Policy Number</FormLabel>
                <FormControl><Input placeholder="e.g. POL-12345" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="provider" render={({ field }) => (
              <FormItem>
                <FormLabel>Provider / Issuer</FormLabel>
                <FormControl><Input placeholder="e.g. Aviva, CITB" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="cover_amount" render={({ field }) => (
              <FormItem>
                <FormLabel>Cover Amount</FormLabel>
                <FormControl><Input placeholder="e.g. £5,000,000" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="issue_date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Issue Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="expiry_date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Expiry Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div>
              <FormLabel>Attach File</FormLabel>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="mt-1.5"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground mt-1">PDF, image, or Word document</p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={uploading}>
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
