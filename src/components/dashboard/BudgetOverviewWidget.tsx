import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { PoundSterling, TrendingUp, TrendingDown } from "lucide-react";

interface BudgetSnapshot {
  project_id: string;
  project_name: string;
  contract_sum: number;
  anticipated_final_cost: number;
  certified_to_date: number;
  variance: number;
  variance_pct: number;
}

export function BudgetOverviewWidget() {
  const { data: snapshots, isLoading } = useQuery({
    queryKey: ["budget-overview-dashboard"],
    queryFn: async () => {
      const { data: budgets } = await supabase
        .from("project_budget")
        .select("project_id, contract_sum, anticipated_final_cost, certified_to_date");

      if (!budgets?.length) return [];

      const projectIds = budgets.map((b) => b.project_id);
      const { data: projects } = await supabase
        .from("projects")
        .select("id, name")
        .in("id", projectIds);

      const nameMap = new Map((projects || []).map((p) => [p.id, p.name]));

      return budgets.map((b): BudgetSnapshot => {
        const cs = b.contract_sum || 0;
        const afc = b.anticipated_final_cost || cs;
        const variance = cs - afc;
        return {
          project_id: b.project_id,
          project_name: nameMap.get(b.project_id) || "Unknown",
          contract_sum: cs,
          anticipated_final_cost: afc,
          certified_to_date: b.certified_to_date || 0,
          variance,
          variance_pct: cs > 0 ? Math.round((variance / cs) * 100) : 0,
        };
      });
    },
  });

  if (isLoading || !snapshots?.length) return null;

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(v);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
        <PoundSterling className="h-5 w-5 text-primary" />
        Budget Overview
      </h3>

      <div className="grid gap-3">
        {snapshots.map((s) => (
          <Link
            key={s.project_id}
            to={`/projects/${s.project_id}`}
            className="bg-card rounded-xl p-4 border border-border hover:border-primary/30 hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-foreground text-sm truncate mr-4">{s.project_name}</span>
              <span
                className={`text-xs font-semibold flex items-center gap-1 ${
                  s.variance < 0 ? "text-destructive" : "text-success"
                }`}
              >
                {s.variance < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
                {fmt(Math.abs(s.variance))} ({s.variance_pct > 0 ? "+" : ""}{s.variance_pct}%)
              </span>
            </div>
            <div className="flex gap-6 text-xs text-muted-foreground">
              <span>Contract: {fmt(s.contract_sum)}</span>
              <span>AFC: {fmt(s.anticipated_final_cost)}</span>
              <span>Certified: {fmt(s.certified_to_date)}</span>
            </div>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
