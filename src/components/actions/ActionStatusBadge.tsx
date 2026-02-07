import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ActionStatusBadgeProps {
  status: string;
  isOverdue?: boolean;
  className?: string;
}

export const ActionStatusBadge = ({ status, isOverdue, className }: ActionStatusBadgeProps) => {
  // If overdue, override the display
  const displayStatus = isOverdue ? "overdue" : status;
  
  const statusConfig: Record<string, { label: string; className: string }> = {
    open: {
      label: "Open",
      className: "bg-transparent border-muted-foreground text-muted-foreground",
    },
    in_progress: {
      label: "In Progress",
      className: "bg-blue-500 text-white border-blue-500",
    },
    awaiting_verification: {
      label: "Awaiting Verification",
      className: "bg-amber-500 text-white border-amber-500",
    },
    closed: {
      label: "Closed",
      className: "bg-green-500 text-white border-green-500",
    },
    overdue: {
      label: "Overdue",
      className: "bg-red-500 text-white border-red-500",
    },
  };

  const config = statusConfig[displayStatus] || statusConfig.open;

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
};
