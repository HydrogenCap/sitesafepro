import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
import { AddVariationDialog } from "./AddVariationDialog";
import type { Variation } from "@/hooks/useBudget";
import { useUpdateVariation } from "@/hooks/useBudget";

interface Props {
  variations: Variation[];
  projectId: string;
  organisationId: string;
}

const fmt = (v: number | null | undefined) => {
  if (v == null) return "—";
  return `£${v.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const statusColors: Record<string, string> = {
  submitted: "bg-blue-500/10 text-blue-600",
  under_review: "bg-amber-500/10 text-amber-600",
  approved: "bg-green-500/10 text-green-600",
  rejected: "bg-destructive/10 text-destructive",
  withdrawn: "bg-muted text-muted-foreground",
};

export function VariationsTable({ variations, projectId, organisationId }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const updateVariation = useUpdateVariation();

  const handleStatusChange = (variation: Variation, newStatus: Variation["status"]) => {
    updateVariation.mutate({
      id: variation.id,
      projectId,
      status: newStatus,
      ...(newStatus === "approved" ? { approved_date: new Date().toISOString().split("T")[0] } : {}),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Variations</h3>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Variation
        </Button>
      </div>

      {variations.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No variations recorded yet.
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No.</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Quoted</TableHead>
                <TableHead className="text-right">Agreed</TableHead>
                <TableHead className="text-right">Time Impact</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variations.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono text-sm">{v.variation_number}</TableCell>
                  <TableCell className="font-medium">
                    {v.title}
                    {v.is_compensation_event && (
                      <Badge variant="outline" className="ml-2 text-xs">CE</Badge>
                    )}
                  </TableCell>
                  <TableCell className="capitalize">{v.type}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[v.status] || ""}>
                      {v.status.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{fmt(v.quoted_value)}</TableCell>
                  <TableCell className="text-right font-medium">{fmt(v.agreed_value)}</TableCell>
                  <TableCell className="text-right">
                    {v.time_impact_days > 0 ? `+${v.time_impact_days}d` : v.time_impact_days < 0 ? `${v.time_impact_days}d` : "—"}
                  </TableCell>
                  <TableCell>
                    {v.status === "submitted" && (
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(v, "approved")}>
                        Approve
                      </Button>
                    )}
                    {v.status === "under_review" && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => handleStatusChange(v, "approved")}>
                          Approve
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleStatusChange(v, "rejected")}>
                          Reject
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AddVariationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectId={projectId}
        organisationId={organisationId}
        nextNumber={`VOI ${String(variations.length + 1).padStart(3, "0")}`}
      />
    </div>
  );
}
