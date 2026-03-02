import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, Trash2 } from "lucide-react";
import type { MeetingMinutes } from "@/hooks/useMeetingMinutes";

interface Props {
  meetings: MeetingMinutes[];
  onView: (m: MeetingMinutes) => void;
  onDelete: (id: string) => void;
}

const typeLabels: Record<string, string> = {
  progress: "Progress",
  design: "Design Team",
  safety: "Safety",
  pre_start: "Pre-Start",
  handover: "Handover",
  ad_hoc: "Ad Hoc",
};

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  draft: "secondary",
  issued: "default",
  approved: "outline",
};

export function MeetingsTable({ meetings, onView, onDelete }: Props) {
  if (!meetings.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No meeting minutes recorded yet. Create your first set of minutes above.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">#</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Chair</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {meetings.map((m) => (
            <TableRow key={m.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onView(m)}>
              <TableCell className="font-mono text-muted-foreground">{m.meeting_number}</TableCell>
              <TableCell className="font-medium">{m.title}</TableCell>
              <TableCell>{format(new Date(m.meeting_date), "dd MMM yyyy")}</TableCell>
              <TableCell>{typeLabels[m.meeting_type] || m.meeting_type}</TableCell>
              <TableCell>{m.chairperson || "—"}</TableCell>
              <TableCell>
                <Badge variant={statusVariant[m.status] || "secondary"}>
                  {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" onClick={() => onView(m)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(m.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
