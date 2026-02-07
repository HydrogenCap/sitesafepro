import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Upload,
  XCircle,
  FileCheck,
  Info,
  AlertTriangle,
  FileText,
} from "lucide-react";

export interface RequirementStatus {
  id: string;
  requirement_type: string;
  status: string;
  document_id: string | null;
  not_required_reason: string | null;
  completed_at: string | null;
}

export interface RequirementDefinition {
  type: string;
  label: string;
  description: string;
  actions: {
    type: "upload" | "exempt" | "confirm";
    label: string;
    icon: "upload" | "x-circle" | "file-check";
  }[];
}

interface RequirementCardProps {
  requirement: RequirementDefinition;
  status: RequirementStatus | undefined;
  index: number;
  onUpload: () => void;
  onExempt: () => void;
  onConfirm?: () => void;
}

export const RequirementCard = ({
  requirement,
  status,
  index,
  onUpload,
  onExempt,
  onConfirm,
}: RequirementCardProps) => {
  const [expanded, setExpanded] = useState(false);

  const isComplete =
    status?.status === "uploaded" ||
    status?.status === "not_required" ||
    status?.status === "generated" ||
    status?.status === "confirmed";

  const getStatusIcon = () => {
    if (!status || status.status === "pending") {
      return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
    if (status.status === "uploaded" || status.status === "generated" || status.status === "confirmed") {
      return <CheckCircle2 className="h-5 w-5 text-success" />;
    }
    if (status.status === "not_required") {
      return <Info className="h-5 w-5 text-primary" />;
    }
    return <Circle className="h-5 w-5 text-muted-foreground" />;
  };

  const getStatusText = () => {
    if (!status || status.status === "pending") {
      return "Not started";
    }
    if (status.status === "uploaded") {
      return "Document uploaded";
    }
    if (status.status === "generated") {
      return "Document generated";
    }
    if (status.status === "confirmed") {
      return "Confirmed";
    }
    if (status.status === "not_required") {
      return `Not required — ${status.not_required_reason || "See details"}`;
    }
    return "Pending";
  };

  const getActionIcon = (iconType: string) => {
    switch (iconType) {
      case "upload":
        return <Upload className="h-4 w-4 mr-1.5" />;
      case "x-circle":
        return <XCircle className="h-4 w-4 mr-1.5" />;
      case "file-check":
        return <FileCheck className="h-4 w-4 mr-1.5" />;
      default:
        return null;
    }
  };

  const handleAction = (actionType: string) => {
    switch (actionType) {
      case "upload":
        onUpload();
        break;
      case "exempt":
        onExempt();
        break;
      case "confirm":
        onConfirm?.();
        break;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`
        rounded-lg border transition-all overflow-hidden
        ${isComplete ? "bg-success/5 border-success/20" : "bg-muted/30 border-border"}
      `}
    >
      {/* Header - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-4 p-4 text-left hover:bg-muted/20 transition-colors"
      >
        <div className="flex-shrink-0 mt-0.5">{getStatusIcon()}</div>

        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-foreground">{requirement.label}</h4>
          <p
            className={`text-xs mt-1 flex items-center gap-1 ${
              isComplete
                ? status?.status === "not_required"
                  ? "text-primary"
                  : "text-success"
                : "text-muted-foreground"
            }`}
          >
            {isComplete && status?.status === "uploaded" && (
              <FileText className="h-3 w-3" />
            )}
            {isComplete && status?.status === "not_required" && (
              <AlertTriangle className="h-3 w-3" />
            )}
            {getStatusText()}
          </p>
        </div>

        <div className="flex-shrink-0">
          {expanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 border-t border-border/50">
              <p className="text-sm text-muted-foreground mt-3 mb-4">
                {requirement.description}
              </p>

              {!isComplete && (
                <div className="flex flex-wrap gap-2">
                  {requirement.actions.map((action) => (
                    <Button
                      key={action.type}
                      size="sm"
                      variant={action.type === "upload" ? "default" : "outline"}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAction(action.type);
                      }}
                    >
                      {getActionIcon(action.icon)}
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}

              {isComplete && status?.status === "uploaded" && (
                <div className="flex items-center gap-2 text-sm text-success">
                  <FileText className="h-4 w-4" />
                  <span>Document uploaded and linked to this requirement</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
