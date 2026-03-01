import { Badge } from "@/components/ui/badge";
import type { ComplianceDocStatus } from "@/types/contractor";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Upload,
  Loader2,
  Circle,
  Archive,
} from "lucide-react";

const STATUS_CONFIG: Record<ComplianceDocStatus, {
  label: string;
  className: string;
  icon: React.ReactNode;
}> = {
  missing: {
    label: "Missing",
    className: "text-muted-foreground",
    icon: <Circle className="h-3 w-3" />,
  },
  uploaded: {
    label: "Uploaded",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    icon: <Upload className="h-3 w-3" />,
  },
  ai_checking: {
    label: "AI Checking",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  needs_review: {
    label: "Needs Review",
    className: "bg-warning/10 text-warning",
    icon: <Clock className="h-3 w-3" />,
  },
  approved: {
    label: "Approved",
    className: "bg-success/10 text-success",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  rejected: {
    label: "Rejected",
    className: "bg-destructive/10 text-destructive",
    icon: <XCircle className="h-3 w-3" />,
  },
  expired: {
    label: "Expired",
    className: "bg-destructive/10 text-destructive",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  superseded: {
    label: "Superseded",
    className: "text-muted-foreground line-through",
    icon: <Archive className="h-3 w-3" />,
  },
};

interface Props {
  status: ComplianceDocStatus;
}

export function ComplianceDocStatusBadge({ status }: Props) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.missing;
  return (
    <Badge variant="outline" className={config.className}>
      {config.icon}
      <span className="ml-1">{config.label}</span>
    </Badge>
  );
}
