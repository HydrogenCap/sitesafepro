import { useState } from "react";
import { motion } from "framer-motion";
import { useProcurement } from "@/hooks/useProcurement";
import { ProcurementTable } from "./ProcurementTable";
import { AddProcurementItemDialog } from "./AddProcurementItemDialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, AlertTriangle, Package, CheckCircle, Clock } from "lucide-react";
import { differenceInDays, isPast } from "date-fns";

interface Props {
  projectId: string;
  organisationId: string;
}

export function ProcurementTab({ projectId, organisationId }: Props) {
  const { itemsQuery, addItem, updateItem } = useProcurement(projectId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const items = itemsQuery.data || [];

  // Summary stats
  const atRisk = items.filter((i) => {
    if (i.status === "delivered" || i.status === "cancelled") return false;
    if (!i.required_on_site_date) return false;
    const daysUntil = differenceInDays(new Date(i.required_on_site_date), new Date());
    return (isPast(new Date(i.required_on_site_date)) || daysUntil <= 14) && !["ordered", "delivered"].includes(i.status);
  }).length;
  const ordered = items.filter((i) => i.status === "ordered").length;
  const delivered = items.filter((i) => i.status === "delivered").length;
  const pending = items.filter((i) => ["not_ordered", "enquiry_sent", "quotes_received"].includes(i.status)).length;

  const handleAdd = (data: any) => {
    addItem.mutate(
      { ...data, project_id: projectId, organisation_id: organisationId },
      { onSuccess: () => setDialogOpen(false) }
    );
  };

  const handleStatusChange = (id: string, status: string) => {
    const updates: any = { id, status };
    if (status === "delivered") updates.actual_delivery_date = new Date().toISOString().split("T")[0];
    if (status === "ordered" && !items.find((i) => i.id === id)?.order_date) updates.order_date = new Date().toISOString().split("T")[0];
    updateItem.mutate(updates);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-medium">Pending</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{pending}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 text-primary mb-1">
            <Package className="h-4 w-4" />
            <span className="text-xs font-medium">Ordered</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{ordered}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 text-success mb-1">
            <CheckCircle className="h-4 w-4" />
            <span className="text-xs font-medium">Delivered</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{delivered}</p>
        </div>
        <div className={`bg-card rounded-lg border p-4 ${atRisk > 0 ? "border-destructive" : "border-border"}`}>
          <div className={`flex items-center gap-2 mb-1 ${atRisk > 0 ? "text-destructive" : "text-muted-foreground"}`}>
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-medium">At Risk</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{atRisk}</p>
        </div>
      </div>

      {/* Filters + Add */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="All categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="plant">Plant & Equipment</SelectItem>
              <SelectItem value="materials">Materials</SelectItem>
              <SelectItem value="subcontract">Subcontract</SelectItem>
              <SelectItem value="specialist">Specialist</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="not_ordered">Not Ordered</SelectItem>
              <SelectItem value="enquiry_sent">Enquiry Sent</SelectItem>
              <SelectItem value="quotes_received">Quotes Received</SelectItem>
              <SelectItem value="ordered">Ordered</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      <ProcurementTable
        items={items}
        categoryFilter={categoryFilter === "all" ? "" : categoryFilter}
        statusFilter={statusFilter === "all" ? "" : statusFilter}
        onStatusChange={handleStatusChange}
      />

      <AddProcurementItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleAdd}
        isLoading={addItem.isPending}
      />
    </motion.div>
  );
}
