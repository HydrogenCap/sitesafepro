import { Drawing } from "@/hooks/useDrawings";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  preliminary: "bg-muted text-muted-foreground",
  information: "bg-blue-500/10 text-blue-600",
  coordination: "bg-amber-500/10 text-amber-600",
  construction: "bg-success/10 text-success",
  as_built: "bg-primary/10 text-primary",
  superseded: "bg-destructive/10 text-destructive",
};

const DISCIPLINE_LABELS: Record<string, string> = {
  architectural: "Arch",
  structural: "Struct",
  mechanical: "Mech",
  electrical: "Elec",
  civil: "Civil",
  landscape: "Land",
};

interface Props {
  drawings: Drawing[];
  disciplineFilter: string;
  statusFilter: string;
}

export function DrawingsTable({ drawings, disciplineFilter, statusFilter }: Props) {
  const filtered = drawings.filter((d) => {
    if (disciplineFilter && d.discipline !== disciplineFilter) return false;
    if (statusFilter && d.status !== statusFilter) return false;
    return true;
  });

  if (filtered.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No drawings found. Add your first drawing to get started.
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Number</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Discipline</TableHead>
            <TableHead>Rev</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Scale</TableHead>
            <TableHead>Issued By</TableHead>
            <TableHead>Issued Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((d) => (
            <TableRow key={d.id}>
              <TableCell className="font-mono font-medium">{d.drawing_number}</TableCell>
              <TableCell className="font-medium">{d.title}</TableCell>
              <TableCell>
                {d.discipline && (
                  <Badge variant="outline" className="text-xs">
                    {DISCIPLINE_LABELS[d.discipline] || d.discipline}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="font-mono">{d.current_revision || "—"}</TableCell>
              <TableCell>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[d.status] || ""}`}>
                  {d.status === "construction" ? "IFC" : d.status.replace("_", " ")}
                </span>
              </TableCell>
              <TableCell className="text-muted-foreground">{d.scale || "—"}</TableCell>
              <TableCell className="text-muted-foreground">{d.issued_by || "—"}</TableCell>
              <TableCell className="text-muted-foreground">
                {d.issued_date ? format(new Date(d.issued_date), "dd MMM yyyy") : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
