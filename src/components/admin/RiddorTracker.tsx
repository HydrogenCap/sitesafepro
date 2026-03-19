import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ShieldAlert, AlertTriangle, CheckCircle } from "lucide-react";
import type { RiddorIncident } from "@/types/admin";

interface RiddorTrackerProps {
  incidents: RiddorIncident[];
}

export function RiddorTracker({ incidents }: RiddorTrackerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-destructive" />RIDDOR Tracker</CardTitle>
        <CardDescription>Open RIDDOR-reportable incidents across all organisations.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {incidents.length === 0 ? (
          <div className="py-12 text-center">
            <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
            <p className="text-sm font-medium">No open RIDDOR incidents</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20">
                <TableHead className="text-xs pl-6">Ref</TableHead>
                <TableHead className="text-xs">Title</TableHead>
                <TableHead className="text-xs">Organisation</TableHead>
                <TableHead className="text-xs">Project</TableHead>
                <TableHead className="text-xs">Severity</TableHead>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Reported?</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidents.map((inc) => (
                <TableRow key={inc.id} className="hover:bg-muted/20">
                  <TableCell className="pl-6 text-xs font-mono">{inc.incident_number}</TableCell>
                  <TableCell className="text-xs font-medium">{inc.title}</TableCell>
                  <TableCell className="text-xs">{inc.orgName}</TableCell>
                  <TableCell className="text-xs">{inc.project?.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={inc.severity === "major" || inc.severity === "fatal" ? "destructive" : "secondary"} className="text-xs capitalize">{inc.severity}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{format(new Date(inc.incident_date), "dd MMM yyyy")}</TableCell>
                  <TableCell className="text-xs">
                    {inc.riddor_reported_at
                      ? <span className="text-emerald-600 flex items-center gap-1"><CheckCircle className="h-3 w-3" />{format(new Date(inc.riddor_reported_at), "dd MMM")}</span>
                      : <span className="text-destructive flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Not yet</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
