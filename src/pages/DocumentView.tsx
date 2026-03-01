import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useActivityLog, activityDescriptions } from "@/hooks/useActivityLog";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { DocumentPreview } from "@/components/documents/DocumentPreview";
import { DocumentDetailsPanel } from "@/components/documents/DocumentDetailsPanel";
import { AcknowledgementSection } from "@/components/documents/AcknowledgementSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ArrowLeft,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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

const CATEGORY_LABELS: Record<string, string> = {
  rams: "RAMS",
  risk_assessment: "Risk Assessment",
  method_statement: "Method Statement",
  safety_plan: "Safety Plan",
  coshh: "COSHH",
  fire_safety: "Fire Safety",
  induction: "Induction",
  permit: "Permit",
  inspection: "Inspection",
  certificate: "Certificate",
  insurance: "Insurance",
  meeting_minutes: "Minutes",
  drawing: "Drawing",
  other: "Other",
};

const DocumentView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organisation, canAccess } = useSubscription();
  const { logActivity } = useActivityLog();
  
  const [document, setDocument] = useState<DocumentData | null>(null);
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const fetchDocument = useCallback(async () => {
    if (!id || !user) return;

    try {
      // Fetch document with related data
      const { data, error } = await supabase
        .from("documents")
        .select(`
          *,
          project:projects(name),
          uploader:profiles!documents_uploaded_by_fkey(full_name, email),
          approver:profiles!documents_approved_by_fkey(full_name),
          rejecter:profiles!documents_rejected_by_fkey(full_name)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      
      setDocument(data as unknown as DocumentData);

      // Get signed URL for preview
      const { data: urlData, error: urlError } = await supabase.storage
        .from("documents")
        .createSignedUrl(data.file_path, 3600);

      if (!urlError && urlData) {
        setSignedUrl(urlData.signedUrl);
      }

      // Fetch version history
      const { data: versionData } = await supabase
        .from("documents")
        .select(`
          id, version, created_at, uploaded_by,
          uploader:profiles!documents_uploaded_by_fkey(full_name)
        `)
        .or(`id.eq.${id},parent_document_id.eq.${id},parent_document_id.eq.${data.parent_document_id}`)
        .order("version", { ascending: false });

      if (versionData) {
        setVersions(
          versionData.map((v: any) => ({
            id: v.id,
            version: v.version,
            created_at: v.created_at,
            uploaded_by: v.uploaded_by,
            uploader_name: v.uploader?.full_name,
          }))
        );
      }

      // Check user role
      const { data: memberData } = await supabase
        .from("organisation_members")
        .select("role")
        .eq("profile_id", user.id)
        .eq("status", "active")
        .single();

      if (memberData) {
        setUserRole(memberData.role);
      }

      // Check if user has acknowledged
      if (data.requires_acknowledgement) {
        const { data: ackData } = await supabase
          .from("document_acknowledgements")
          .select("id")
          .eq("document_id", id)
          .eq("profile_id", user.id)
          .single();

        setHasAcknowledged(!!ackData);
      }
    } catch (error) {
      console.error("Error fetching document:", error);
      toast.error("Failed to load document");
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  const handleApprove = async () => {
    if (!document || !user) return;

    try {
      const { error } = await supabase
        .from("documents")
        .update({
          status: "approved",
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", document.id);

      if (error) throw error;

      logActivity({
        activityType: "document_approved",
        entityType: "document",
        entityId: document.id,
        entityName: document.name,
        description: activityDescriptions.document_approved(document.name),
        projectId: document.project_id || undefined,
      });

      toast.success("Document approved");
      fetchDocument();
    } catch (error) {
      console.error("Error approving document:", error);
      toast.error("Failed to approve document");
    }
  };

  const handleReject = async (reason: string) => {
    if (!document || !user || !reason.trim()) return;

    try {
      const { error } = await supabase
        .from("documents")
        .update({
          status: "rejected",
          rejected_by: user.id,
          rejected_at: new Date().toISOString(),
          rejection_reason: reason.trim(),
        })
        .eq("id", document.id);

      if (error) throw error;

      logActivity({
        activityType: "document_rejected",
        entityType: "document",
        entityId: document.id,
        entityName: document.name,
        description: activityDescriptions.document_rejected(document.name),
        projectId: document.project_id || undefined,
      });

      toast.success("Document rejected");
      fetchDocument();
    } catch (error) {
      console.error("Error rejecting document:", error);
      toast.error("Failed to reject document");
    }
  };

  const handleCategoryChange = async (newCategory: string) => {
    if (!document) return;

    try {
      const { error } = await supabase
        .from("documents")
        .update({ category: newCategory as any })
        .eq("id", document.id);

      if (error) throw error;
      toast.success("Category updated");
      fetchDocument();
    } catch (error) {
      console.error("Error updating category:", error);
      toast.error("Failed to update category");
    }
  };

  const handleDownload = async () => {
    if (!document) return;

    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .download(document.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = document.name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading document:", error);
      toast.error("Failed to download document");
    }
  };

  const handleSaveName = async () => {
    if (!document || !editName.trim()) return;
    try {
      const { error } = await supabase
        .from("documents")
        .update({ name: editName.trim() })
        .eq("id", document.id);
      if (error) throw error;
      toast.success("Document name updated");
      setEditingName(false);
      fetchDocument();
    } catch (error) {
      console.error("Error updating name:", error);
      toast.error("Failed to update name");
    }
  };

  const handleSaveDescription = async () => {
    if (!document) return;
    try {
      const { error } = await supabase
        .from("documents")
        .update({ description: editDescription.trim() || null })
        .eq("id", document.id);
      if (error) throw error;
      toast.success("Description updated");
      setEditingDescription(false);
      fetchDocument();
    } catch (error) {
      console.error("Error updating description:", error);
      toast.error("Failed to update description");
    }
  };

  const handleDelete = async () => {
    if (!document) return;

    try {
      const { error } = await supabase
        .from("documents")
        .update({ status: "archived" })
        .eq("id", document.id);

      if (error) throw error;

      logActivity({
        activityType: "document_deleted",
        entityType: "document",
        entityName: document.name,
        description: `Archived document: ${document.name}`,
        projectId: document.project_id || undefined,
      });

      toast.success("Document archived");
      navigate("/documents");
    } catch (error) {
      console.error("Error archiving document:", error);
      toast.error("Failed to archive document");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-success/10 text-success border-success/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-destructive/10 text-destructive border-destructive/20">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-accent/10 text-accent border-accent/20">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const isAdmin = userRole === "owner" || userRole === "admin" || userRole === "site_manager";

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Skeleton className="h-[600px] rounded-xl" />
            </div>
            <div>
              <Skeleton className="h-[400px] rounded-xl" />
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!document) {
    return (
      <DashboardLayout>
        <div className="p-6 text-center">
          <h1 className="text-xl font-semibold">Document not found</h1>
          <Button variant="link" onClick={() => navigate("/documents")}>
            Back to Documents
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Top bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
        >
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/documents")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Documents
            </Button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {getStatusBadge(document.status)}
            <Badge variant="secondary">
              {CATEGORY_LABELS[document.category] || document.category}
            </Badge>
            {document.version > 1 && (
              <Badge variant="outline">v{document.version}</Badge>
            )}
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6"
        >
          {editingName ? (
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary flex-shrink-0" />
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="text-2xl font-bold h-auto py-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName();
                  if (e.key === "Escape") setEditingName(false);
                }}
              />
              <Button size="icon" variant="ghost" onClick={handleSaveName}>
                <Check className="h-4 w-4 text-success" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setEditingName(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3 group">
              <FileText className="h-6 w-6 text-primary" />
              {document.name}
              {isAdmin && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => { setEditName(document.name); setEditingName(true); }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </h1>
          )}

          {/* Description */}
          {editingDescription ? (
            <div className="mt-2 flex items-start gap-2 ml-9">
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="text-sm"
                rows={2}
                autoFocus
                placeholder="Add a description..."
              />
              <div className="flex flex-col gap-1">
                <Button size="icon" variant="ghost" onClick={handleSaveDescription}>
                  <Check className="h-4 w-4 text-success" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setEditingDescription(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-1 ml-9 group/desc">
              {document.description ? (
                <p className="text-sm text-muted-foreground inline">
                  {document.description}
                </p>
              ) : isAdmin ? (
                <p className="text-sm text-muted-foreground/50 inline italic">
                  No description
                </p>
              ) : null}
              {isAdmin && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="opacity-0 group-hover/desc:opacity-100 transition-opacity h-6 px-2 ml-1 text-xs"
                  onClick={() => { setEditDescription(document.description || ""); setEditingDescription(true); }}
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          )}
        </motion.div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Preview */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 space-y-6"
          >
            <DocumentPreview
              signedUrl={signedUrl}
              mimeType={document.mime_type}
              fileName={document.name}
              onDownload={handleDownload}
            />

            {/* Acknowledgement section */}
            {document.requires_acknowledgement && (
              <AcknowledgementSection
                documentId={document.id}
                organisationId={document.organisation_id}
                isAdmin={isAdmin}
                hasAcknowledged={hasAcknowledged}
                onAcknowledged={() => {
                  setHasAcknowledged(true);
                  fetchDocument();
                }}
              />
            )}
          </motion.div>

          {/* Right column - Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <DocumentDetailsPanel
              document={document}
              versions={versions}
              isAdmin={isAdmin}
              canAccessAIAnalysis={canAccess("ai_document_analysis")}
              onApprove={handleApprove}
              onReject={handleReject}
              onDownload={handleDownload}
              onDelete={handleDelete}
              onCategoryChange={handleCategoryChange}
              categoryLabels={CATEGORY_LABELS}
            />
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DocumentView;
