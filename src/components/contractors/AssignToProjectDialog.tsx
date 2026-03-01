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
import { Loader2, FolderOpen } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { useAssignContractor } from "@/hooks/useProjectContractors";
import { useContractorProjects } from "@/hooks/useContractors";
import { TRADES } from "@/types/contractor";

const formSchema = z.object({
  project_id: z.string().min(1, "Select a project"),
  trade: z.string().min(1, "Select a trade"),
  scope_of_works: z.string().optional(),
  start_date: z.string().optional(),
  estimated_end_date: z.string().optional(),
  purchase_order_number: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Props {
  contractorId: string;
  contractorName: string;
  primaryTrade: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssignToProjectDialog({
  contractorId,
  contractorName,
  primaryTrade,
  open,
  onOpenChange,
}: Props) {
  const { data: allProjects = [] } = useProjects();
  const { data: existingAssignments = [] } = useContractorProjects(contractorId);
  const assignContractor = useAssignContractor();

  const existingProjectIds = existingAssignments.map((a: any) => a.project_id);
  const availableProjects = allProjects.filter(
    (p: any) => p.status !== "completed" && !existingProjectIds.includes(p.id)
  );

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      project_id: "",
      trade: primaryTrade,
      scope_of_works: "",
      start_date: "",
      estimated_end_date: "",
      purchase_order_number: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await assignContractor.mutateAsync({
        project_id: data.project_id,
        contractor_company_id: contractorId,
        trade: data.trade,
        scope_of_works: data.scope_of_works || null,
        start_date: data.start_date || null,
        estimated_end_date: data.estimated_end_date || null,
        purchase_order_number: data.purchase_order_number || null,
      });
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Error assigning to project:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Assign to Project
          </DialogTitle>
          <DialogDescription>
            Assign {contractorName} to a project.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="project_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableProjects.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          No available projects
                        </div>
                      ) : (
                        availableProjects.map((project: any) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
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
                      placeholder="Describe the scope of works..."
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={assignContractor.isPending}>
                {assignContractor.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  "Assign to Project"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
