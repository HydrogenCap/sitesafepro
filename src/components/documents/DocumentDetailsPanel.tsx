import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ComplianceAnalysisCard } from "./ComplianceAnalysisCard";
import {
  Download,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  FolderOpen,
  User,
  Calendar,
  HardDrive,
  Sparkles,
  AlertTriangle,
  History,
  Upload,
  Lock,
} from "lucide-react";

interface DocumentData {
  id: string;
  name: string;
  description: string | null;
  category: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  status: string;
  created_at: string;
  updated_at: string;
  project_id: string | null;
  organisation_id: string;
  uploaded_by: string;
  version: number;
  parent_document_id: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  ai_category: string | null;
  ai_confidence: string | null;
  ai_compliance_flags: string[] | null;
  requires_acknowledgement: boolean;
  acknowledgement_deadline: string | null;
  project?: { name: string } | null;
  uploader?: { full_name: string; email: string } | null;
  approver?: { full_name: string } | null;
  rejecter?: { full_name: string } | null;
}

interface VersionInfo {
  id: string;
  version: number;
  created_at: string;
  uploaded_by: string;
  uploader_name?: string;
}

interface DocumentDetailsPanelProps {
  document: DocumentData;
  versions: VersionInfo[];
  isAdmin: boolean;
  canAccessAIAnalysis: boolean;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onDownload: () => void;
  onDelete: () => void;
  onCategoryChange: (category: string) => void;
  categoryLabels: Record<string, string>;
}

const CATEGORIES = [
  { value: "rams", label: "RAMS" },
  { value: "risk_assessment", label: "Risk Assessment" },
  { value: "method_statement", label: "Method Statement" },
  { value: "safety_plan", label: "Safety / Construction Phase Plan" },
  { value: "coshh", label: "COSHH Assessment" },
  { value: "fire_safety", label: "Fire Risk Assessment" },
  { value: "induction", label: "Induction Material" },
  { value: "permit", label: "Permit to Work" },
  { value: "inspection", label: "Inspection Report" },
  { value: "certificate", label: "Certificate / Training Record" },
  { value: "insurance", label: "Insurance Document" },
  { value: "meeting_minutes", label: "Meeting Minutes" },
  { value: "drawing", label: "Drawing / Plan" },
  { value: "other", label: "Other" },
];

export const DocumentDetailsPanel = ({
  document,
  versions,
  isAdmin,
  canAccessAIAnalysis,
  onApprove,
  onReject,
  onDownload,
  onDelete,
  onCategoryChange,
  categoryLabels,
}: DocumentDetailsPanelProps) => {
  const navigate = useNavigate();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [editingCategory, setEditingCategory] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "d MMM yyyy, HH:mm");
  };

  const handleRejectSubmit = () => {
    if (rejectionReason.trim()) {
      onReject(rejectionReason);
      setRejectDialogOpen(false);
      setRejectionReason("");
    }
  };

  const getConfidenceColor = (confidence: string | null) => {
    switch (confidence) {
      case "high":
        return "bg-success/10 text-success";
      case "medium":
        return "bg-accent/10 text-accent";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-4">
      {/* File Info Card */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            File Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Format</span>
            <span className="text-sm font-medium">
              {document.mime_type.split("/")[1]?.toUpperCase() || "Unknown"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <HardDrive className="h-3 w-3" />
              Size
            </span>
            <span className="text-sm font-medium">{formatFileSize(document.file_size)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Uploaded
            </span>
            <span className="text-sm font-medium">{formatDate(document.created_at)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" />
              Uploaded by
            </span>
            <span className="text-sm font-medium">
              {document.uploader?.full_name || "Unknown"}
            </span>
          </div>

          <Separator />

          {/* Category */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Category</span>
            {editingCategory && isAdmin ? (
              <Select
                value={document.category}
                onValueChange={(v) => {
                  onCategoryChange(v);
                  setEditingCategory(false);
                }}
              >
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {categoryLabels[document.category] || document.category}
                </Badge>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setEditingCategory(true)}
                  >
                    Edit
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Project */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <FolderOpen className="h-3 w-3" />
              Project
            </span>
            {document.project ? (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-sm"
                onClick={() => navigate(`/projects/${document.project_id}`)}
              >
                {document.project.name}
              </Button>
            ) : (
              <span className="text-sm text-muted-foreground">No project</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status Card */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {document.status === "approved" ? (
              <CheckCircle className="h-4 w-4 text-success" />
            ) : document.status === "rejected" ? (
              <XCircle className="h-4 w-4 text-destructive" />
            ) : (
              <Clock className="h-4 w-4 text-accent" />
            )}
            Review Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {document.status === "approved" && document.approver && (
            <>
              <p className="text-sm text-success">
                Approved by {document.approver.full_name}
              </p>
              {document.approved_at && (
                <p className="text-xs text-muted-foreground">
                  {formatDate(document.approved_at)}
                </p>
              )}
            </>
          )}

          {document.status === "rejected" && (
            <>
              <p className="text-sm text-destructive">
                Rejected by {document.rejecter?.full_name || "Unknown"}
              </p>
              {document.rejected_at && (
                <p className="text-xs text-muted-foreground">
                  {formatDate(document.rejected_at)}
                </p>
              )}
              {document.rejection_reason && (
                <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">{document.rejection_reason}</p>
                </div>
              )}
            </>
          )}

          {document.status === "pending" && isAdmin && (
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-success hover:bg-success/90"
                size="sm"
                onClick={onApprove}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                size="sm"
                onClick={() => setRejectDialogOpen(true)}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>
          )}

          {document.status === "pending" && !isAdmin && (
            <p className="text-sm text-muted-foreground">Awaiting review by admin</p>
          )}
        </CardContent>
      </Card>

      {/* AI Analysis Card */}
      {document.ai_confidence && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Confidence</span>
              <Badge className={getConfidenceColor(document.ai_confidence)}>
                {document.ai_confidence}
              </Badge>
            </div>

            {document.ai_category && document.ai_category !== document.category && (
              <p className="text-xs text-muted-foreground">
                AI suggested: {categoryLabels[document.ai_category] || document.ai_category}
              </p>
            )}

            {document.ai_compliance_flags && document.ai_compliance_flags.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-accent" />
                  Compliance Notes
                </p>
                <ul className="space-y-1">
                  {document.ai_compliance_flags.map((flag, i) => (
                    <li key={i} className="text-xs text-accent flex items-start gap-1.5">
                      <span className="mt-0.5">•</span>
                      <span>{flag}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Deep Compliance Analysis (Enterprise) */}
      {document.category === "rams" && (
        canAccessAIAnalysis ? (
          <ComplianceAnalysisCard documentId={document.id} />
        ) : (
          <Card className="bg-card border-border">
            <CardContent className="p-6 text-center">
              <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-medium text-foreground mb-1">
                AI Compliance Analysis
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Available on Enterprise plan
              </p>
              <Button variant="outline" size="sm" onClick={() => navigate("/settings")}>
                Upgrade
              </Button>
            </CardContent>
          </Card>
        )
      )}

      {/* Version History */}
      {versions.length > 1 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Version History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {versions.map((v) => (
              <div
                key={v.id}
                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                  v.id === document.id
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-muted/50"
                }`}
                onClick={() => v.id !== document.id && navigate(`/documents/${v.id}`)}
              >
                <div>
                  <p className="text-sm font-medium">
                    Version {v.version}
                    {v.id === document.id && (
                      <span className="text-xs text-muted-foreground ml-2">(current)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(v.created_at), "d MMM yyyy")} • {v.uploader_name}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 space-y-2">
          <Button className="w-full" onClick={onDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate("/documents")}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload New Version
          </Button>
          {isAdmin && (
            <Button
              variant="destructive"
              className="w-full"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Document
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Document</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this document. This will be visible to the uploader.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter rejection reason..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectSubmit}
              disabled={!rejectionReason.trim()}
            >
              Reject Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
