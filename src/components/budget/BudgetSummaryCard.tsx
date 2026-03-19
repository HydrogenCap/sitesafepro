import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PoundSterling, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { ProjectBudget } from "@/hooks/useBudget";

interface Props {
  budget: ProjectBudget | null;
}

const fmt = (v: number | null | undefined) => {
  if (v == null) return "—";
  return `£${v.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export function BudgetSummaryCard({ budget }: Props) {
  if (!budget) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No budget configured yet. Set up the contract sum to get started.
        </CardContent>
      </Card>
    );
  }

  const contractSum = budget.contract_sum ?? 0;
  const currentSum = budget.current_contract_sum ?? contractSum;
  const afc = budget.anticipated_final_cost ?? currentSum;
  const variance = currentSum - afc;
  const certifiedPct = currentSum > 0 ? (budget.certified_to_date / currentSum) * 100 : 0;

  const items = [
    { label: "Contract Sum", value: fmt(budget.contract_sum), sub: budget.contract_type?.replace(/_/g, " ") },
    { label: "Approved Variations", value: fmt(budget.approved_variations) },
    { label: "Current Contract Sum", value: fmt(currentSum) },
    { label: "Anticipated Final Cost", value: fmt(afc) },
    { label: "Contingency", value: fmt(budget.contingency) },
    { label: "Certified to Date", value: fmt(budget.certified_to_date) },
    { label: "Paid to Date", value: fmt(budget.paid_to_date) },
  ];

  return (
    <div className="space-y-6">
      {/* Variance banner */}
      <Card className={variance > 0 ? "border-green-500/30 bg-green-500/5" : variance < 0 ? "border-destructive/30 bg-destructive/5" : ""}>
        <CardContent className="py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {variance > 0 ? <TrendingDown className="h-5 w-5 text-green-600" /> : variance < 0 ? <TrendingUp className="h-5 w-5 text-destructive" /> : <Minus className="h-5 w-5 text-muted-foreground" />}
            <span className="font-medium text-foreground">
              {variance > 0 ? "Under budget" : variance < 0 ? "Over budget" : "On budget"}
            </span>
          </div>
          <span className={`text-lg font-bold ${variance > 0 ? "text-green-600" : variance < 0 ? "text-destructive" : "text-foreground"}`}>
            {variance !== 0 ? `${variance > 0 ? "+" : ""}${fmt(variance)}` : "—"}
          </span>
        </CardContent>
      </Card>

      {/* Spend progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Spend Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Certified</span>
            <span className="text-sm font-medium">{certifiedPct.toFixed(1)}%</span>
          </div>
          <Progress value={Math.min(certifiedPct, 100)} className="h-3" />
          <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
            <span>{fmt(budget.certified_to_date)}</span>
            <span>{fmt(currentSum)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Key figures grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((item) => (
          <Card key={item.label}>
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
              <p className="text-lg font-semibold text-foreground">{item.value}</p>
              {item.sub && <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
