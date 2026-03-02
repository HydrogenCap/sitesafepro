import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
import { AddPaymentApplicationDialog } from "./AddPaymentApplicationDialog";
import type { PaymentApplication } from "@/hooks/useBudget";

interface Props {
  applications: PaymentApplication[];
  projectId: string;
  organisationId: string;
}

const fmt = (v: number | null | undefined) => {
  if (v == null) return "—";
  return `£${v.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-500/10 text-blue-600",
  certified: "bg-green-500/10 text-green-600",
  disputed: "bg-amber-500/10 text-amber-600",
  paid: "bg-primary/10 text-primary",
};

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

export function PaymentApplicationsTable({ applications, projectId, organisationId }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Payment Applications</h3>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Application
        </Button>
      </div>

      {applications.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No payment applications yet.
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>App No.</TableHead>
                <TableHead>Valuation Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Gross Value</TableHead>
                <TableHead className="text-right">Retention</TableHead>
                <TableHead className="text-right">This Application</TableHead>
                <TableHead className="text-right">Certified</TableHead>
                <TableHead className="text-right">Paid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((pa) => (
                <TableRow key={pa.id}>
                  <TableCell className="font-mono">{pa.application_number}</TableCell>
                  <TableCell>{fmtDate(pa.valuation_date)}</TableCell>
                  <TableCell>{fmtDate(pa.due_date)}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[pa.status] || ""}>
                      {pa.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{fmt(pa.gross_value)}</TableCell>
                  <TableCell className="text-right">{fmt(pa.retention)}</TableCell>
                  <TableCell className="text-right font-medium">{fmt(pa.this_application)}</TableCell>
                  <TableCell className="text-right">{fmt(pa.certified_value)}</TableCell>
                  <TableCell className="text-right">{fmt(pa.paid_value)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AddPaymentApplicationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectId={projectId}
        organisationId={organisationId}
        nextNumber={applications.length + 1}
      />
    </div>
  );
}
