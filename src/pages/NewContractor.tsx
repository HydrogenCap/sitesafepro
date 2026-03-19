import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateContractor } from "@/hooks/useContractors";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ArrowLeft, Building2, Star } from "lucide-react";
import { TRADES, COMPLIANCE_DOC_LABELS, ComplianceDocType } from "@/types/contractor";

const formSchema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  trading_name: z.string().optional(),
  company_registration_number: z.string().optional(),
  vat_number: z.string().optional(),
  primary_trade: z.string().min(1, "Primary trade is required"),
  secondary_trades: z.array(z.string()).optional(),
  tax_status: z.enum(["limited_company", "sole_trader", "partnership", "cis_registered"]).optional(),
  utr_number: z.string().optional(),
  primary_contact_name: z.string().optional(),
  primary_contact_email: z.string().email().optional().or(z.literal("")),
  primary_contact_phone: z.string().optional(),
  office_address: z.string().optional(),
  website: z.string().optional(),
  notes: z.string().optional(),
  internal_rating: z.number().min(1).max(5).optional(),
});

type FormData = z.infer<typeof formSchema>;

const DEFAULT_REQUIRED_DOCS: ComplianceDocType[] = [
  'public_liability',
  'employers_liability',
  'cscs_card',
];

const TRADE_SPECIFIC_DOCS: Record<string, ComplianceDocType[]> = {
  electrician: ['niceic', 'part_p'],
  plumber: ['gas_safe'],
  scaffolder: ['cisrs'],
  general_builder: ['car_insurance', 'chas'],
};

const NewContractor = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createContractor = useCreateContractor();
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [requiredDocs, setRequiredDocs] = useState<ComplianceDocType[]>(DEFAULT_REQUIRED_DOCS);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      company_name: "",
      trading_name: "",
      company_registration_number: "",
      vat_number: "",
      primary_trade: "",
      secondary_trades: [],
      primary_contact_name: "",
      primary_contact_email: "",
      primary_contact_phone: "",
      office_address: "",
      website: "",
      notes: "",
    },
  });

  const selectedTrade = form.watch("primary_trade");

  const handleTradeChange = (trade: string) => {
    form.setValue("primary_trade", trade);
    // Add trade-specific docs
    const tradeDocs = TRADE_SPECIFIC_DOCS[trade] || [];
    setRequiredDocs([...new Set([...DEFAULT_REQUIRED_DOCS, ...tradeDocs])]);
  };

  const toggleRequiredDoc = (docType: ComplianceDocType) => {
    setRequiredDocs((prev) =>
      prev.includes(docType)
        ? prev.filter((d) => d !== docType)
        : [...prev, docType]
    );
  };

  const onSubmit = async (data: FormData) => {
    if (!user) return;

    // Get organisation_id
    const { data: member } = await supabase
      .from("organisation_members")
      .select("organisation_id")
      .eq("profile_id", user.id)
      .eq("status", "active")
      .single();

    if (!member) return;

    createContractor.mutate(
      {
        ...data,
        organisation_id: member.organisation_id,
        internal_rating: selectedRating,
        compliance_status: 'incomplete',
        compliance_score: 0,
        required_doc_types: requiredDocs,
      } as any,
      {
        onSuccess: (result) => {
          navigate(`/contractors/${result.id}`);
        },
      }
    );
  };

  const groupedDocs = Object.entries(COMPLIANCE_DOC_LABELS).reduce(
    (acc, [key, value]) => {
      if (!acc[value.category]) {
        acc[value.category] = [];
      }
      acc[value.category].push({ key: key as ComplianceDocType, ...value });
      return acc;
    },
    {} as Record<string, { key: ComplianceDocType; label: string; category: string }[]>
  );

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/contractors")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contractors
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Add New Contractor</h1>
          <p className="text-sm text-muted-foreground">
            Add a contractor company and define their compliance requirements
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Section 1: Company Details */}
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Company Details</h2>
                  <p className="text-sm text-muted-foreground">
                    Basic information about the contractor
                  </p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="company_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="ABC Electrical Ltd" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="trading_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trading Name</FormLabel>
                      <FormControl>
                        <Input placeholder="If different from company name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="primary_trade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Trade *</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={handleTradeChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select trade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TRADES.map((trade) => (
                            <SelectItem key={trade.value} value={trade.value}>
                              {trade.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tax_status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax Status</FormLabel>
                      <Select
                        value={field.value || ""}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="limited_company">Limited Company</SelectItem>
                          <SelectItem value="sole_trader">Sole Trader</SelectItem>
                          <SelectItem value="partnership">Partnership</SelectItem>
                          <SelectItem value="cis_registered">CIS Registered</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="company_registration_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Registration No.</FormLabel>
                      <FormControl>
                        <Input placeholder="12345678" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vat_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>VAT Number</FormLabel>
                      <FormControl>
                        <Input placeholder="GB123456789" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="utr_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UTR Number</FormLabel>
                      <FormControl>
                        <Input placeholder="1234567890" {...field} />
                      </FormControl>
                      <FormDescription>
                        Unique Taxpayer Reference (10 digits)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Section 2: Contact Information */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="text-lg font-semibold mb-6">Contact Information</h2>

              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="primary_contact_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Contact Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Smith" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="primary_contact_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john@company.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="primary_contact_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="07700 900000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input placeholder="https://www.company.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="office_address"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Office Address</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="123 Business Park, London, SW1A 1AA"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Section 3: Required Compliance Documents */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="text-lg font-semibold mb-2">Required Compliance Documents</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Select which documents this contractor must provide. These create the compliance checklist.
              </p>

              <div className="space-y-6">
                {Object.entries(groupedDocs).map(([category, docs]) => (
                  <div key={category}>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">
                      {category}
                    </h3>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {docs.map((doc) => (
                        <div
                          key={doc.key}
                          className="flex items-center space-x-3"
                        >
                          <Checkbox
                            id={doc.key}
                            checked={requiredDocs.includes(doc.key)}
                            onCheckedChange={() => toggleRequiredDoc(doc.key)}
                          />
                          <Label
                            htmlFor={doc.key}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {doc.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 4: Notes & Rating */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="text-lg font-semibold mb-6">Notes & Rating</h2>

              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Internal Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add any internal notes about this contractor..."
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        These notes are only visible to your team
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <Label className="mb-3 block">Internal Rating</Label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setSelectedRating(star)}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`h-6 w-6 ${
                            selectedRating && star <= selectedRating
                              ? "text-warning fill-warning"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      </button>
                    ))}
                    {selectedRating && (
                      <button
                        type="button"
                        onClick={() => setSelectedRating(null)}
                        className="ml-2 text-sm text-muted-foreground hover:text-foreground"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/contractors")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createContractor.isPending}>
                {createContractor.isPending ? "Creating..." : "Create Contractor"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
};

export default NewContractor;
