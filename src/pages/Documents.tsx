import { useState, useEffect, useCallback } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useActivityLog, activityDescriptions } from "@/hooks/useActivityLog";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { DocumentUploadDialog } from "@/components/documents/DocumentUploadDialog";
import { DocumentGeneratorDialog } from "@/components/documents/DocumentGeneratorDialog";
import { toast } from "sonner";
import {
  Plus,
  Search,
  FileText,
  Filter,
  Download,
  Trash2,
  Eye,
  MoreVertical,
  FolderOpen,
  CheckCircle,
  Clock,
  XCircle,
  File,
  Image,
  Upload,
  Users,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Document {
  id: string;
  name: string;
  description: string | null;
  category: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  status: string;
  created_at: string;
  project_id: string | null;
  project_name?: string | null;
  uploader_name?: string | null;
  uploaded_by: string;
  version: number;
  parent_document_id: string | null;
  ai_confidence?: string | null;
  ai_category?: string | null;
  requires_acknowledgement?: boolean;
  acknowledgement_count?: number;
  total_contractors?: number;
  expiry_date?: string | null;
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

type ViewTab = "all" | "my-uploads" | "shared" | "pending-review" | "expiring";

const Documents = () => {
  const { user } = useAuth();
  const { organisation, loading: subLoading } = useSubscription();
  const { logActivity } = useActivityLog();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [versionParentDoc, setVersionParentDoc] = useState<Document | null>(null);
  const [activeTab, setActiveTab] = useState<ViewTab>("all");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [pendingCount, setPendingCount] = useState(0);
  const [expiringCount, setExpiringCount] = useState(0);
  const [generatorDialogOpen, setGeneratorDialogOpen] = useState(false);

  // Fetch user role
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("organisation_members")
        .select("role")
        .eq("profile_id", user.id)
        .eq("status", "active")
        .single();
      if (data) {
        setUserRole(data.role);
      }
    };
    fetchUserRole();
  }, [user]);

  const isAdmin = userRole === "owner" || userRole === "admin" || userRole === "site_manager";
  const isContractor = userRole === "contractor";

  const fetchDocuments = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("documents")
        .select(`
          id,
          name,
          description,
          category,
          file_path,
          file_size,
          mime_type,
          status,
          created_at,
          project_id,
          version,
          parent_document_id,
          ai_confidence,
          ai_category,
          requires_acknowledgement,
          uploaded_by,
          expiry_date,
          projects(name),
          profiles!documents_uploaded_by_fkey(full_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Transform the data to flatten the nested objects
      const transformedData: Document[] = (data || []).map((doc: any) => ({
        id: doc.id,
        name: doc.name,
        description: doc.description,
        category: doc.category,
        file_path: doc.file_path,
        file_size: doc.file_size,
        mime_type: doc.mime_type,
        status: doc.status,
        created_at: doc.created_at,
        project_id: doc.project_id,
        project_name: doc.projects?.name || null,
        uploader_name: doc.profiles?.full_name || null,
        uploaded_by: doc.uploaded_by,
        version: doc.version || 1,
        parent_document_id: doc.parent_document_id || null,
        ai_confidence: doc.ai_confidence || null,
        ai_category: doc.ai_category || null,
        requires_acknowledgement: doc.requires_acknowledgement || false,
        expiry_date: doc.expiry_date || null,
      }));
      
      setDocuments(transformedData);

      // Count pending documents for review badge
      const pending = transformedData.filter(d => d.status === "pending").length;
      setPendingCount(pending);

      // Count expiring documents (within 30 days)
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const expiring = transformedData.filter(d => {
        if (!d.expiry_date) return false;
        const exp = new Date(d.expiry_date);
        return exp <= thirtyDaysFromNow;
      }).length;
      setExpiringCount(expiring);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Filter documents based on active tab and filters
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || doc.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;

    // Tab filtering
    let matchesTab = true;
    if (activeTab === "my-uploads") {
      matchesTab = doc.uploaded_by === user?.id;
    } else if (activeTab === "shared") {
      matchesTab = doc.uploaded_by !== user?.id && doc.requires_acknowledgement === true;
    } else if (activeTab === "pending-review") {
      matchesTab = doc.status === "pending";
    } else if (activeTab === "expiring") {
      if (!doc.expiry_date) return false;
      const exp = new Date(doc.expiry_date);
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      matchesTab = exp <= thirtyDaysFromNow;
    }

    return matchesSearch && matchesCategory && matchesStatus && matchesTab;
  }).sort((a, b) => {
    // Sort expiring tab by soonest expiry first
    if (activeTab === "expiring" && a.expiry_date && b.expiry_date) {
      return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
    }
    return 0;
  });

  const getExpiryPill = (expiryDate: string | null | undefined) => {
    if (!expiryDate) return null;
    const exp = new Date(expiryDate);
    const now = new Date();
    const daysRemaining = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysRemaining <= 0) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
          Expired
        </span>
      );
    } else if (daysRemaining <= 7) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
          {daysRemaining}d left
        </span>
      );
    } else if (daysRemaining <= 30) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent">
          {daysRemaining}d left
        </span>
      );
    }
    return null;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-accent" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-success/10 text-success";
      case "rejected":
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-accent/10 text-accent";
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) {
      return <Image className="h-5 w-5" />;
    }
    return <File className="h-5 w-5" />;
  };

  const handleDownload = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = doc.name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading document:", error);
      toast.error("Failed to download document");
    }
  };

  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);

  const handleDeleteConfirmed = async (doc: Document) => {

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("documents")
        .remove([doc.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("documents")
        .delete()
        .eq("id", doc.id);

      if (dbError) throw dbError;

      // Update organisation storage usage
      if (organisation) {
        const newBytes = Math.max(0, (organisation.storage_used_bytes || 0) - doc.file_size);
        await supabase
          .from('organisations')
          .update({ storage_used_bytes: newBytes })
          .eq('id', organisation.id);
      }

      // Log activity
      logActivity({
        activityType: 'document_deleted',
        entityType: 'document',
        entityName: doc.name,
        description: activityDescriptions.document_deleted(doc.name),
        projectId: doc.project_id || undefined,
      });

      toast.success("Document deleted");
      fetchDocuments();
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Failed to delete document");
    }
  };

  const handleApprove = async (doc: Document) => {
    try {
      const { error } = await supabase
        .from("documents")
        .update({
          status: "approved",
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", doc.id);

      if (error) throw error;

      logActivity({
        activityType: "document_approved",
        entityType: "document",
        entityId: doc.id,
        entityName: doc.name,
        description: activityDescriptions.document_approved(doc.name),
        projectId: doc.project_id || undefined,
      });

      toast.success("Document approved");
      fetchDocuments();
    } catch (error) {
      console.error("Error approving document:", error);
      toast.error("Failed to approve document");
    }
  };

  const handleReject = async () => {
    if (!selectedDoc || !rejectionReason.trim()) return;

    try {
      const { error } = await supabase
        .from("documents")
        .update({
          status: "rejected",
          rejected_by: user?.id,
          rejected_at: new Date().toISOString(),
          rejection_reason: rejectionReason.trim(),
        })
        .eq("id", selectedDoc.id);

      if (error) throw error;

      logActivity({
        activityType: "document_rejected",
        entityType: "document",
        entityId: selectedDoc.id,
        entityName: selectedDoc.name,
        description: activityDescriptions.document_rejected(selectedDoc.name),
        projectId: selectedDoc.project_id || undefined,
      });

      toast.success("Document rejected");
      setRejectDialogOpen(false);
      setSelectedDoc(null);
      setRejectionReason("");
      fetchDocuments();
    } catch (error) {
      console.error("Error rejecting document:", error);
      toast.error("Failed to reject document");
    }
  };

  const handleUploadComplete = () => {
    setUploadDialogOpen(false);
    setVersionParentDoc(null);
    fetchDocuments();
  };

  const handleUploadNewVersion = (doc: Document) => {
    setVersionParentDoc(doc);
    setUploadDialogOpen(true);
  };

  const handlePreview = (doc: Document) => {
    navigate(`/documents/${doc.id}`);
  };

  if (subLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Documents</h1>
            <p className="text-sm text-muted-foreground">
              {documents.length} document{documents.length !== 1 ? "s" : ""} uploaded
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                variant="outline"
                onClick={() => setGeneratorDialogOpen(true)}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Document
              </Button>
            )}
            <Button onClick={() => setUploadDialogOpen(true)}>
              {isContractor ? (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Submit RAMS for Review
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Upload Document
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Tabs - show different tabs for contractors vs admins */}
        <div className="mb-6">
          {isContractor ? (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ViewTab)}>
              <TabsList>
                <TabsTrigger value="my-uploads" className="gap-2">
                  <FileText className="h-4 w-4" />
                  My Uploads
                </TabsTrigger>
                <TabsTrigger value="shared" className="gap-2">
                  <Users className="h-4 w-4" />
                  Shared with Me
                </TabsTrigger>
              </TabsList>
            </Tabs>
          ) : isAdmin ? (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ViewTab)}>
              <TabsList>
                <TabsTrigger value="all" className="gap-2">
                  <FolderOpen className="h-4 w-4" />
                  All Documents
                </TabsTrigger>
                <TabsTrigger value="pending-review" className="gap-2 relative">
                  <AlertCircle className="h-4 w-4" />
                  Pending Review
                  {pendingCount > 0 && (
                    <Badge className="ml-2 h-5 min-w-5 px-1.5 bg-accent text-accent-foreground">
                      {pendingCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="expiring" className="gap-2 relative">
                  <Clock className="h-4 w-4" />
                  Expiring
                  {expiringCount > 0 && (
                    <Badge className="ml-2 h-5 min-w-5 px-1.5 bg-destructive text-destructive-foreground">
                      {expiringCount}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          ) : null}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {activeTab !== "pending-review" && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Documents list */}
        {filteredDocuments.length > 0 ? (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                      Document
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3 hidden md:table-cell">
                      Category
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3 hidden lg:table-cell">
                      {activeTab === "pending-review" ? "Uploaded By" : "Project"}
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3 hidden sm:table-cell">
                      Status
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3 hidden lg:table-cell">
                      Size
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3 hidden md:table-cell">
                      Uploaded
                    </th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-6 py-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredDocuments.map((doc, index) => (
                    <motion.tr
                      key={doc.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => handlePreview(doc)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center text-primary">
                            {getFileIcon(doc.mime_type)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground truncate max-w-[200px]">
                                {doc.name}
                              </p>
                              {getExpiryPill(doc.expiry_date)}
                            </div>
                            {doc.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {doc.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                            {CATEGORY_LABELS[doc.category] || doc.category}
                          </span>
                          {doc.ai_confidence && (
                            <Tooltip>
                              <TooltipTrigger>
                                <span
                                  className={`h-2 w-2 rounded-full ${
                                    doc.ai_confidence === "high"
                                      ? "bg-success"
                                      : doc.ai_confidence === "medium"
                                      ? "bg-accent"
                                      : "bg-muted-foreground"
                                  }`}
                                />
                              </TooltipTrigger>
                              <TooltipContent>
                                AI classified with {doc.ai_confidence} confidence
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell" onClick={(e) => e.stopPropagation()}>
                        <span className="text-sm text-muted-foreground">
                          {activeTab === "pending-review"
                            ? doc.uploader_name || "Unknown"
                            : doc.project_name || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell" onClick={(e) => e.stopPropagation()}>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            doc.status
                          )}`}
                        >
                          {getStatusIcon(doc.status)}
                          {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell" onClick={(e) => e.stopPropagation()}>
                        <span className="text-sm text-muted-foreground">
                          {formatFileSize(doc.file_size)}
                        </span>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell" onClick={(e) => e.stopPropagation()}>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(doc.created_at)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {/* Quick approve/reject for pending review */}
                          {activeTab === "pending-review" && isAdmin && doc.status === "pending" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-success hover:text-success hover:bg-success/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApprove(doc);
                                }}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDoc(doc);
                                  setRejectDialogOpen(true);
                                }}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleDownload(doc)}>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePreview(doc)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUploadNewVersion(doc)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Upload New Version
                              </DropdownMenuItem>
                              {isAdmin && doc.status === "pending" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-success"
                                    onClick={() => handleApprove(doc)}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Approve
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => {
                                      setSelectedDoc(doc);
                                      setRejectDialogOpen(true);
                                    }}
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Reject
                                  </DropdownMenuItem>
                                </>
                              )}
                              {isAdmin && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => setDeleteTarget(doc)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl border-2 border-dashed border-border p-12 text-center"
          >
            <div className="h-16 w-16 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
              <FolderOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {activeTab === "pending-review"
                ? "No documents pending review"
                : activeTab === "my-uploads"
                ? "No uploads yet"
                : activeTab === "shared"
                ? "No documents shared with you"
                : activeTab === "expiring"
                ? "No expiring documents"
                : searchQuery || categoryFilter !== "all" || statusFilter !== "all"
                ? "No documents found"
                : "No documents yet"}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {activeTab === "pending-review"
                ? "All documents have been reviewed"
                : activeTab === "my-uploads"
                ? "Upload RAMS and safety documents for review"
                : activeTab === "shared"
                ? "Documents requiring your acknowledgement will appear here"
                : activeTab === "expiring"
                ? "No documents are expiring within the next 30 days"
                : searchQuery || categoryFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Upload RAMS, method statements, and other safety documents to get started."}
            </p>
            {activeTab !== "pending-review" && activeTab !== "shared" && (
              <Button onClick={() => setUploadDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {isContractor ? "Submit RAMS for Review" : "Upload Your First Document"}
              </Button>
            )}
          </motion.div>
        )}
      </div>

      {/* Upload Dialog */}
      <DocumentUploadDialog
        open={uploadDialogOpen}
        onOpenChange={(open) => {
          setUploadDialogOpen(open);
          if (!open) setVersionParentDoc(null);
        }}
        organisationId={organisation?.id || ""}
        onUploadComplete={handleUploadComplete}
        parentDocument={versionParentDoc}
      />

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Document</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting "{selectedDoc?.name}". This will be visible to the uploader.
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
              onClick={handleReject}
              disabled={!rejectionReason.trim()}
            >
              Reject Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Generator Dialog */}
      <DocumentGeneratorDialog
        open={generatorDialogOpen}
        onOpenChange={setGeneratorDialogOpen}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Archive this document?"
        description="For compliance purposes, documents should be archived rather than permanently deleted. Are you sure you want to proceed with deletion? This action cannot be undone."
        confirmLabel="Delete Document"
        variant="destructive"
        onConfirm={() => {
          if (deleteTarget) {
            handleDeleteConfirmed(deleteTarget);
            setDeleteTarget(null);
          }
        }}
      />
    </DashboardLayout>
  );
};

export default Documents;
