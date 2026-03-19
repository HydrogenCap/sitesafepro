import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { FileWarning, CheckCircle } from "lucide-react";
import type { ComplianceAlert } from "@/types/admin";

interface ComplianceAlertsProps {
  alerts: ComplianceAlert[];
}

export function ComplianceAlerts({ alerts }: ComplianceAlertsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><FileWarning className="h-4 w-4 text-amber-600" />Compliance Alerts</CardTitle>
        <CardDescription>Contractor documents expiring within 30 days across all organisations.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {alerts.length === 0 ? (
          <div className="py-12 text-center">
            <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
            <p className="text-sm font-medium">No upcoming expirations</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20">
                <TableHead className="text-xs pl-6">Document Type</TableHead>
                <TableHead className="text-xs">Organisation</TableHead>
                <TableHead className="text-xs">Contractor</TableHead>
                <TableHead className="text-xs">Expires</TableHead>
                <TableHead className="text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.map((alert) => (
                <TableRow key={alert.id} className={`hover:bg-muted/20 ${alert.daysUntilExpiry < 0 ? "bg-red-50/40 dark:bg-red-950/10" : alert.daysUntilExpiry <= 7 ? "bg-amber-50/40 dark:bg-amber-950/10" : ""}`}>
                  <TableCell className="pl-6 text-xs font-medium capitalize">{alert.doc_type.replace(/_/g, " ")}</TableCell>
                  <TableCell className="text-xs">{alert.orgName}</TableCell>
                  <TableCell className="text-xs">{alert.contractor?.company_name ?? "—"}</TableCell>
                  <TableCell className="text-xs">{format(new Date(alert.expiry_date), "dd MMM yyyy")}</TableCell>
                  <TableCell>
                    {alert.daysUntilExpiry < 0
                      ? <Badge variant="destructive" className="text-xs">Expired {Math.abs(alert.daysUntilExpiry)}d ago</Badge>
                      : alert.daysUntilExpiry <= 7
                      ? <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-700">Expires in {alert.daysUntilExpiry}d</Badge>
                      : <Badge variant="secondary" className="text-xs">{alert.daysUntilExpiry}d remaining</Badge>}
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
