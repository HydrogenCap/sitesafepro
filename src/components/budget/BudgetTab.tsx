import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Settings2 } from "lucide-react";
import { useBudget, useBudgetItems, useVariations, usePaymentApplications } from "@/hooks/useBudget";
import { BudgetSummaryCard } from "./BudgetSummaryCard";
import { BudgetSetupDialog } from "./BudgetSetupDialog";
import { VariationsTable } from "./VariationsTable";
import { PaymentApplicationsTable } from "./PaymentApplicationsTable";
import { CostPlanTable } from "./CostPlanTable";

interface Props {
  projectId: string;
  organisationId: string;
}

export function BudgetTab({ projectId, organisationId }: Props) {
  const { data: budget, isLoading: budgetLoading } = useBudget(projectId);
  const { data: budgetItems = [] } = useBudgetItems(projectId);
  const { data: variations = [] } = useVariations(projectId);
  const { data: applications = [] } = usePaymentApplications(projectId);
  const [setupOpen, setSetupOpen] = useState(false);

  if (budgetLoading) {
    return <div className="py-12 text-center text-muted-foreground">Loading budget...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Budget & Cost Management</h2>
        <Button variant="outline" size="sm" onClick={() => setSetupOpen(true)}>
          <Settings2 className="h-4 w-4 mr-2" />
          {budget ? "Edit Budget" : "Set Up Budget"}
        </Button>
      </div>

      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="cost-plan">Cost Plan</TabsTrigger>
          <TabsTrigger value="variations">
            Variations
            {variations.length > 0 && (
              <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">{variations.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="applications">
            Applications
            {applications.length > 0 && (
              <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">{applications.length}</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-6">
          <BudgetSummaryCard budget={budget ?? null} />
        </TabsContent>

        <TabsContent value="cost-plan" className="mt-6">
          <CostPlanTable items={budgetItems} projectId={projectId} organisationId={organisationId} />
        </TabsContent>

        <TabsContent value="variations" className="mt-6">
          <VariationsTable variations={variations} projectId={projectId} organisationId={organisationId} />
        </TabsContent>

        <TabsContent value="applications" className="mt-6">
          <PaymentApplicationsTable applications={applications} projectId={projectId} organisationId={organisationId} />
        </TabsContent>
      </Tabs>

      <BudgetSetupDialog
        open={setupOpen}
        onOpenChange={setSetupOpen}
        projectId={projectId}
        organisationId={organisationId}
        existing={budget}
      />
    </div>
  );
}
