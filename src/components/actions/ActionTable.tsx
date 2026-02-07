import { Link } from "react-router-dom";
import { format, differenceInDays, isBefore, startOfToday } from "date-fns";
import { MoreVertical } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ActionPriorityDot } from "./ActionPriorityDot";
import { ActionStatusBadge } from "./ActionStatusBadge";
import { ActionSourceBadge } from "./ActionSourceBadge";
import { cn } from "@/lib/utils";

interface Action {
  id: string;
  title: string;
  priority: "critical" | "high" | "medium" | "low";
  status: string;
  source: string;
  due_date: string;
  assigned_to: string | null;
  assigned_to_company: string | null;
  project_id: string;
  projects?: { name: string };
  assigned_profile?: { full_name: string };
}

interface ActionTableProps {
  actions: Action[];
  isAdmin: boolean;
  onClose: (id: string) => void;
  onDelete: (id: string) => void;
}

export const ActionTable = ({ actions, isAdmin, onClose, onDelete }: ActionTableProps) => {
  const today = startOfToday();

  const isOverdue = (action: Action) => {
    return (
      action.status !== "closed" &&
      action.status !== "awaiting_verification" &&
      isBefore(new Date(action.due_date), today)
    );
  };

  const isDueSoon = (action: Action) => {
    if (action.status === "closed") return false;
    const dueDate = new Date(action.due_date);
    const daysUntilDue = differenceInDays(dueDate, today);
    return daysUntilDue >= 0 && daysUntilDue <= 3 && !isOverdue(action);
  };

  const getRowClassName = (action: Action) => {
    if (isOverdue(action)) return "bg-red-50 dark:bg-red-950/20";
    if (isDueSoon(action)) return "bg-amber-50 dark:bg-amber-950/20";
    return "";
  };

  const getDueDateClassName = (action: Action) => {
    if (isOverdue(action)) return "text-red-600 font-medium";
    if (isDueSoon(action)) return "text-amber-600";
    return "text-foreground";
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">Priority</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Assigned To</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Source</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {actions.map((action) => (
            <TableRow
              key={action.id}
              className={cn(
                getRowClassName(action),
                action.priority === "critical" && "border-l-4 border-l-red-500"
              )}
            >
              <TableCell>
                <ActionPriorityDot priority={action.priority} />
              </TableCell>
              <TableCell>
                <Link
                  to={`/actions/${action.id}`}
                  className="font-medium text-foreground hover:text-primary transition-colors"
                >
                  {action.title}
                </Link>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="font-normal">
                  {action.projects?.name || "Unknown"}
                </Badge>
              </TableCell>
              <TableCell>
                {action.assigned_profile?.full_name || action.assigned_to_company || (
                  <span className="italic text-muted-foreground">Unassigned</span>
                )}
              </TableCell>
              <TableCell className={getDueDateClassName(action)}>
                {format(new Date(action.due_date), "dd/MM/yyyy")}
              </TableCell>
              <TableCell>
                <ActionStatusBadge status={action.status} isOverdue={isOverdue(action)} />
              </TableCell>
              <TableCell>
                <ActionSourceBadge source={action.source} />
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to={`/actions/${action.id}`}>View</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={`/actions/${action.id}?edit=true`}>Edit</Link>
                    </DropdownMenuItem>
                    {action.status !== "closed" && (
                      <DropdownMenuItem onClick={() => onClose(action.id)}>
                        Close
                      </DropdownMenuItem>
                    )}
                    {isAdmin && (
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => onDelete(action.id)}
                      >
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
