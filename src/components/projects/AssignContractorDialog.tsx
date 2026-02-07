import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2, HardHat } from "lucide-react";
import { useContractors } from "@/hooks/useContractors";
import { useAssignContractor } from "@/hooks/useProjectContractors";
import { TRADES } from "@/types/contractor";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  contractor_company_id: z.string().min(1, "Select a contractor"),
  trade: z.string().min(1, "Select a trade"),
  scope_of_works: z.string().optional(),
  start_date: z.string().optional(),
  estimated_end_date: z.string().optional(),
  purchase_order_number: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface AssignContractorDialogProps {
  projectId: string;
  existingContractorIds: string[];
  onAssigned?: () => void;
}

export function AssignContractorDialog({
  projectId,
  existingContractorIds,
  onAssigned,
}: AssignContractorDialogProps) {
  const [open, setOpen] = useState(false);
  const { data: allContractors = [], isLoading: loadingContractors } = useContractors();
  const assignContractor = useAssignContractor();

  const availableContractors = allContractors.filter(
    (c) => c.is_active && !existingContractorIds.includes(c.id)
  );

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contractor_company_id: "",
      trade: "",
      scope_of_works: "",
      start_date: "",
      estimated_end_date: "",
      purchase_order_number: "",
    },
  });

  const selectedContractorId = form.watch("contractor_company_id");
  const selectedContractor = allContractors.find(c => c.id === selectedContractorId);

  // Auto-fill trade when contractor is selected
  const handleContractorChange = (contractorId: string) => {
    form.setValue("contractor_company_id", contractorId);
    const contractor = allContractors.find(c => c.id === contractorId);
    if (contractor) {
      form.setValue("trade", contractor.primary_trade);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      await assignContractor.mutateAsync({
        project_id: projectId,
        contractor_company_id: data.contractor_company_id,
        trade: data.trade,
        scope_of_works: data.scope_of_works || null,
        start_date: data.start_date || null,
        estimated_end_date: data.estimated_end_date || null,
        purchase_order_number: data.purchase_order_number || null,
      });
      setOpen(false);
      form.reset();
      onAssigned?.();
    } catch (error) {
      console.error("Error assigning contractor:", error);
    }
  };

  const getComplianceBadge = (status: string) => {
    switch (status) {
      case "compliant":
        return <Badge className="bg-success/10 text-success border-success/20 text-xs">Compliant</Badge>;
      case "expiring_soon":
        return <Badge className="bg-warning/10 text-warning border-warning/20 text-xs">Expiring</Badge>;
      default:
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs">Non-Compliant</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Assign Contractor
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardHat className="h-5 w-5" />
            Assign Contractor to Project
          </DialogTitle>
          <DialogDescription>
            Select an approved contractor and define their scope of work.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="contractor_company_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contractor</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={handleContractorChange}
                    disabled={loadingContractors}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a contractor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableContractors.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          No available contractors
                        </div>
                      ) : (
                        availableContractors.map((contractor) => (
                          <SelectItem key={contractor.id} value={contractor.id}>
                            <div className="flex items-center justify-between w-full gap-2">
                              <span>{contractor.company_name}</span>
                              {getComplianceBadge(contractor.compliance_status)}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="trade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trade / Package</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
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
              name="scope_of_works"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scope of Works</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the scope of works for this contractor..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estimated_end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="purchase_order_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PO Number (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="PO-12345" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={assignContractor.isPending}>
                {assignContractor.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  "Assign Contractor"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
