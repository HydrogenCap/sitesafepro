import { ProcurementItem } from "@/hooks/useProcurement";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, differenceInDays, isPast, addDays } from "date-fns";
import { AlertTriangle, CheckCircle, Clock, Package, Truck } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Package }> = {
  not_ordered: { label: "Not Ordered", color: "bg-muted text-muted-foreground", icon: Package },
  enquiry_sent: { label: "Enquiry Sent", color: "bg-blue-500/10 text-blue-600", icon: Clock },
  quotes_received: { label: "Quotes Received", color: "bg-amber-500/10 text-amber-600", icon: Clock },
  ordered: { label: "Ordered", color: "bg-primary/10 text-primary", icon: Truck },
  delivered: { label: "Delivered", color: "bg-success/10 text-success", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "bg-destructive/10 text-destructive", icon: Package },
};

const CATEGORY_LABELS: Record<string, string> = {
  plant: "Plant",
  materials: "Materials",
  subcontract: "Subcontract",
  specialist: "Specialist",
};

interface Props {
  items: ProcurementItem[];
  categoryFilter: string;
  statusFilter: string;
  onStatusChange: (id: string, status: string) => void;
}

function getTrafficLight(item: ProcurementItem): "green" | "amber" | "red" | "grey" {
  if (item.status === "delivered" || item.status === "cancelled") return "grey";
  if (!item.required_on_site_date) return "green";

  const requiredDate = new Date(item.required_on_site_date);
  const daysUntil = differenceInDays(requiredDate, new Date());

  if (isPast(requiredDate) && item.status !== "delivered") return "red";
  if (daysUntil <= 14 && !["ordered", "delivered"].includes(item.status)) return "red";
  if (daysUntil <= 28) return "amber";
  return "green";
}

const TRAFFIC_LIGHT_CLASSES: Record<string, string> = {
  red: "border-l-4 border-l-destructive bg-destructive/5",
  amber: "border-l-4 border-l-amber-500 bg-amber-500/5",
  green: "",
  grey: "opacity-60",
};

export function ProcurementTable({ items, categoryFilter, statusFilter, onStatusChange }: Props) {
  const filtered = items.filter((item) => {
    if (categoryFilter && item.category !== categoryFilter) return false;
    if (statusFilter && item.status !== statusFilter) return false;
    return true;
  });

  if (filtered.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No procurement items found. Add items to track orders and deliveries.
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Description</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Required On Site</TableHead>
            <TableHead>Lead Time</TableHead>
            <TableHead>Budget (£)</TableHead>
            <TableHead>PO #</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((item) => {
            const light = getTrafficLight(item);
            const overdue = item.required_on_site_date && isPast(new Date(item.required_on_site_date)) && item.status !== "delivered";

            return (
              <TableRow key={item.id} className={TRAFFIC_LIGHT_CLASSES[light]}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.description}</span>
                    {light === "red" && <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />}
                  </div>
                  {item.notes && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[250px]">{item.notes}</p>
                  )}
                </TableCell>
                <TableCell>
                  {item.category && (
                    <Badge variant="outline" className="text-xs">
                      {CATEGORY_LABELS[item.category] || item.category}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{item.supplier_name || "—"}</TableCell>
                <TableCell className={overdue ? "text-destructive font-medium" : "text-muted-foreground"}>
                  {item.required_on_site_date ? format(new Date(item.required_on_site_date), "dd MMM yyyy") : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {item.lead_time_weeks ? `${item.lead_time_weeks}w` : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {item.budget_value != null ? `£${Number(item.budget_value).toLocaleString("en-GB", { minimumFractionDigits: 0 })}` : "—"}
                </TableCell>
                <TableCell className="font-mono text-muted-foreground text-sm">
                  {item.purchase_order_number || "—"}
                </TableCell>
                <TableCell>
                  <Select
                    value={item.status}
                    onValueChange={(v) => onStatusChange(item.id, v)}
                  >
                    <SelectTrigger className="h-7 text-xs w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                        <SelectItem key={value} value={value}>{config.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
