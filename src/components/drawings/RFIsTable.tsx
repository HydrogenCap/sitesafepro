import { RFI } from "@/hooks/useDrawings";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, isPast } from "date-fns";
import { AlertTriangle, DollarSign, Clock } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-500/10 text-blue-600",
  pending_response: "bg-amber-500/10 text-amber-600",
  answered: "bg-success/10 text-success",
  closed: "bg-muted text-muted-foreground",
  void: "bg-destructive/10 text-destructive",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-blue-500/10 text-blue-600",
  high: "bg-amber-500/10 text-amber-600",
  critical: "bg-destructive/10 text-destructive",
};

interface Props {
  rfis: RFI[];
  statusFilter: string;
}

export function RFIsTable({ rfis, statusFilter }: Props) {
  const filtered = rfis.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    return true;
  });

  if (filtered.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No RFIs found. Raise one when you need clarification from the design team.
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>RFI #</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Assigned To</TableHead>
            <TableHead>Required By</TableHead>
            <TableHead>Impact</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((r) => {
            const overdue = r.required_by && isPast(new Date(r.required_by)) && !["answered", "closed", "void"].includes(r.status);
            return (
              <TableRow key={r.id} className={overdue ? "bg-destructive/5" : ""}>
                <TableCell className="font-mono font-medium">{r.rfi_number}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{r.title}</span>
                    {overdue && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${PRIORITY_COLORS[r.priority]}`}>
                    {r.priority}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[r.status]}`}>
                    {r.status.replace("_", " ")}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">{r.assigned_to_name || "—"}</TableCell>
                <TableCell className={overdue ? "text-destructive font-medium" : "text-muted-foreground"}>
                  {r.required_by ? format(new Date(r.required_by), "dd MMM yyyy") : "—"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {r.cost_impact && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <DollarSign className="h-3 w-3" />£
                      </Badge>
                    )}
                    {r.time_impact && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Clock className="h-3 w-3" />T
                      </Badge>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
