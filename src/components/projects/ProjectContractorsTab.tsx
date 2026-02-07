import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useProjectContractors, useRemoveProjectContractor } from "@/hooks/useProjectContractors";
import { AssignContractorDialog } from "./AssignContractorDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  HardHat,
  Users,
  Plus,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Phone,
  Mail,
  Calendar,
  FileText,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { TRADES } from "@/types/contractor";

interface ProjectContractorsTabProps {
  projectId: string;
}

export function ProjectContractorsTab({ projectId }: ProjectContractorsTabProps) {
  const { data: assignments = [], isLoading, refetch } = useProjectContractors(projectId);
  const removeContractor = useRemoveProjectContractor();
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);

  const existingContractorIds = assignments.map((a) => a.contractor_company_id);

  const getComplianceIcon = (status: string) => {
    switch (status) {
      case "compliant":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "expiring_soon":
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      default:
        return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getComplianceBadge = (status: string) => {
    switch (status) {
      case "compliant":
        return <Badge className="bg-success/10 text-success border-success/20">Compliant</Badge>;
      case "expiring_soon":
        return <Badge className="bg-warning/10 text-warning border-warning/20">Expiring</Badge>;
      default:
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Non-Compliant</Badge>;
    }
  };

  const getTradeBadge = (trade: string) => {
    const tradeLabel = TRADES.find((t) => t.value === trade)?.label || trade;
    return <Badge variant="secondary">{tradeLabel}</Badge>;
  };

  const handleRemove = (assignmentId: string) => {
    setSelectedAssignment(assignmentId);
    setRemoveDialogOpen(true);
  };

  const confirmRemove = async () => {
    if (!selectedAssignment) return;
    await removeContractor.mutateAsync({ id: selectedAssignment, projectId });
    setRemoveDialogOpen(false);
    setSelectedAssignment(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl border-2 border-dashed border-border p-12 text-center"
      >
        <div className="h-16 w-16 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          No contractors assigned
        </h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Assign contractors to this project so they can access documents and sign inductions.
        </p>
        <AssignContractorDialog
          projectId={projectId}
          existingContractorIds={existingContractorIds}
          onAssigned={refetch}
        />
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Assigned Contractors</h3>
          <p className="text-sm text-muted-foreground">
            {assignments.length} contractor{assignments.length !== 1 ? "s" : ""} working on this project
          </p>
        </div>
        <AssignContractorDialog
          projectId={projectId}
          existingContractorIds={existingContractorIds}
          onAssigned={refetch}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {assignments.map((assignment, index) => (
          <motion.div
            key={assignment.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="hover:border-primary/30 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                      <HardHat className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {assignment.contractor?.company_name || "Unknown"}
                        {assignment.contractor && getComplianceIcon(assignment.contractor.compliance_status)}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        {getTradeBadge(assignment.trade)}
                        {assignment.contractor && getComplianceBadge(assignment.contractor.compliance_status)}
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={`/contractors/${assignment.contractor_company_id}`}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Contractor
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleRemove(assignment.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove from Project
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {assignment.scope_of_works && (
                  <div className="mb-3">
                    <p className="text-sm text-muted-foreground flex items-start gap-2">
                      <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{assignment.scope_of_works}</span>
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-4 text-sm">
                  {assignment.start_date && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Start: {format(new Date(assignment.start_date), "dd MMM yyyy")}</span>
                    </div>
                  )}
                  {assignment.estimated_end_date && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>End: {format(new Date(assignment.estimated_end_date), "dd MMM yyyy")}</span>
                    </div>
                  )}
                </div>

                {assignment.contractor?.primary_contact_name && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-sm font-medium mb-1">{assignment.contractor.primary_contact_name}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {assignment.contractor.primary_contact_email && (
                        <a
                          href={`mailto:${assignment.contractor.primary_contact_email}`}
                          className="flex items-center gap-1 hover:text-primary"
                        >
                          <Mail className="h-3 w-3" />
                          {assignment.contractor.primary_contact_email}
                        </a>
                      )}
                      {assignment.contractor.primary_contact_phone && (
                        <a
                          href={`tel:${assignment.contractor.primary_contact_phone}`}
                          className="flex items-center gap-1 hover:text-primary"
                        >
                          <Phone className="h-3 w-3" />
                          {assignment.contractor.primary_contact_phone}
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Contractor?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the contractor from this project. They will no longer have access to project-specific documents.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
