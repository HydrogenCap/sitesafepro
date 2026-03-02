import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { AddBudgetItemDialog } from "./AddBudgetItemDialog";
import { useDeleteBudgetItem } from "@/hooks/useBudget";
import type { BudgetItem } from "@/hooks/useBudget";

interface Props {
  items: BudgetItem[];
  projectId: string;
  organisationId: string;
}

const fmt = (v: number | null | undefined) => {
  if (v == null) return "—";
  return `£${v.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const CATEGORIES: Record<string, string> = {
  prelims: "Preliminaries",
  groundworks: "Groundworks",
  structure: "Structure",
  envelope: "Envelope",
  mep: "M&E",
  finishes: "Finishes",
  external: "External Works",
  contingency: "Contingency",
};

export function CostPlanTable({ items, projectId, organisationId }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const deleteItem = useDeleteBudgetItem();

  const totals = items.reduce(
    (acc, item) => ({
      budget: acc.budget + (item.budget_value ?? 0),
      committed: acc.committed + item.committed_value,
      certified: acc.certified + item.certified_value,
      forecast: acc.forecast + (item.forecast_final ?? item.budget_value ?? 0),
    }),
    { budget: 0, committed: 0, certified: 0, forecast: 0 }
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Cost Plan</h3>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No cost plan items yet. Add budget line items to track costs.
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Committed</TableHead>
                <TableHead className="text-right">Certified</TableHead>
                <TableHead className="text-right">Forecast Final</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const variance = (item.budget_value ?? 0) - (item.forecast_final ?? item.budget_value ?? 0);
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">{item.code || "—"}</TableCell>
                    <TableCell className="font-medium">{item.description}</TableCell>
                    <TableCell className="text-sm">{item.category ? CATEGORIES[item.category] || item.category : "—"}</TableCell>
                    <TableCell className="text-right">{fmt(item.budget_value)}</TableCell>
                    <TableCell className="text-right">{fmt(item.committed_value)}</TableCell>
                    <TableCell className="text-right">{fmt(item.certified_value)}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(item.forecast_final)}</TableCell>
                    <TableCell className={`text-right font-medium ${variance > 0 ? "text-green-600" : variance < 0 ? "text-destructive" : ""}`}>
                      {variance !== 0 ? fmt(variance) : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => deleteItem.mutate({ id: item.id, projectId })}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {/* Totals row */}
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell colSpan={3} className="text-right">Totals</TableCell>
                <TableCell className="text-right">{fmt(totals.budget)}</TableCell>
                <TableCell className="text-right">{fmt(totals.committed)}</TableCell>
                <TableCell className="text-right">{fmt(totals.certified)}</TableCell>
                <TableCell className="text-right">{fmt(totals.forecast)}</TableCell>
                <TableCell className={`text-right ${totals.budget - totals.forecast > 0 ? "text-green-600" : totals.budget - totals.forecast < 0 ? "text-destructive" : ""}`}>
                  {fmt(totals.budget - totals.forecast)}
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}

      <AddBudgetItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectId={projectId}
        organisationId={organisationId}
      />
    </div>
  );
}
