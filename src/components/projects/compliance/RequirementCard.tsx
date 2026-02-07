import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
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
  Eye,
  Download,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

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

interface DocumentInfo {
  id: string;
  name: string;
  file_path: string;
  mime_type: string;
  file_size: number;
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
  const [document, setDocument] = useState<DocumentInfo | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Fetch document info when expanded and has document_id
  useEffect(() => {
    if (expanded && status?.document_id && !document) {
      fetchDocument();
    }
  }, [expanded, status?.document_id]);

  const fetchDocument = async () => {
    if (!status?.document_id) return;
    
    setLoadingDoc(true);
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("id, name, file_path, mime_type, file_size")
        .eq("id", status.document_id)
        .single();

      if (error) throw error;
      setDocument(data);
    } catch (error) {
      console.error("Error fetching document:", error);
    } finally {
      setLoadingDoc(false);
    }
  };

  const handleViewDocument = async () => {
    if (!document) return;

    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(document.file_path, 300); // 5 min expiry

      if (error) throw error;
      
      window.open(data.signedUrl, "_blank");
    } catch (error) {
      console.error("Error viewing document:", error);
      toast.error("Failed to open document");
    }
  };

  const handleDownloadDocument = async () => {
    if (!document) return;

    setDownloading(true);
    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .download(document.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = document.name;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Document downloaded");
    } catch (error) {
      console.error("Error downloading document:", error);
      toast.error("Failed to download document");
    } finally {
      setDownloading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

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

              {/* Document viewer for uploaded documents */}
              {isComplete && status?.status === "uploaded" && status?.document_id && (
                <div className="bg-muted/50 rounded-lg p-3 border border-border">
                  {loadingDoc ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading document...
                    </div>
                  ) : document ? (
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {document.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(document.file_size)} • {document.mime_type.split("/")[1]?.toUpperCase() || "File"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDocument();
                          }}
                          className="h-8 w-8 p-0"
                          title="View document"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadDocument();
                          }}
                          className="h-8 w-8 p-0"
                          title="Download document"
                          disabled={downloading}
                        >
                          {downloading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-success">
                      <FileText className="h-4 w-4" />
                      <span>Document uploaded and linked to this requirement</span>
                    </div>
                  )}
                </div>
              )}

              {/* Confirmed status display */}
              {isComplete && status?.status === "confirmed" && (
                <div className="flex items-center gap-2 text-sm text-success bg-success/10 rounded-lg p-3">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{status.not_required_reason || "Confirmed"}</span>
                </div>
              )}

              {/* Not required status display */}
              {isComplete && status?.status === "not_required" && (
                <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 rounded-lg p-3">
                  <Info className="h-4 w-4" />
                  <span>{status.not_required_reason || "Marked as not required"}</span>
                </div>
              )}

              {/* Allow re-upload for completed items */}
              {isComplete && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpload();
                    }}
                    className="text-xs"
                  >
                    <Upload className="h-3 w-3 mr-1.5" />
                    Replace / Upload New
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
