import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useActivityLog, activityDescriptions } from "@/hooks/useActivityLog";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { DocumentUploadDialog } from "@/components/documents/DocumentUploadDialog";
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
}

const CATEGORY_LABELS: Record<string, string> = {
  rams: "RAMS",
  method_statement: "Method Statement",
  safety_plan: "Safety Plan",
  coshh: "COSHH",
  induction: "Induction",
  permit: "Permit",
  inspection: "Inspection",
  certificate: "Certificate",
  insurance: "Insurance",
  other: "Other",
};

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
          projects(name)
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
      }));
      
      setDocuments(transformedData);
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

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || doc.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

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
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading document:", error);
      toast.error("Failed to download document");
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

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

  const handleUploadComplete = () => {
    setUploadDialogOpen(false);
    fetchDocuments();
  };

  const handlePreview = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(doc.file_path, 3600); // 1 hour expiry

      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank");
      }
    } catch (error) {
      console.error("Error previewing document:", error);
      toast.error("Failed to preview document");
    }
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Documents</h1>
            <p className="text-sm text-muted-foreground">
              {documents.length} document{documents.length !== 1 ? "s" : ""} uploaded
            </p>
          </div>
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
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
                      Project
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
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center text-primary">
                            {getFileIcon(doc.mime_type)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate max-w-[200px]">
                              {doc.name}
                            </p>
                            {doc.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {doc.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                          {CATEGORY_LABELS[doc.category] || doc.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {doc.project_name || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            doc.status
                          )}`}
                        >
                          {getStatusIcon(doc.status)}
                          {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {formatFileSize(doc.file_size)}
                        </span>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {formatDate(doc.created_at)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
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
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(doc)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
              {searchQuery || categoryFilter !== "all" || statusFilter !== "all"
                ? "No documents found"
                : "No documents yet"}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {searchQuery || categoryFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Upload RAMS, method statements, and other safety documents to get started."}
            </p>
            {!searchQuery && categoryFilter === "all" && statusFilter === "all" && (
              <Button onClick={() => setUploadDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Upload Your First Document
              </Button>
            )}
          </motion.div>
        )}
      </div>

      <DocumentUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        organisationId={organisation?.id || ""}
        onUploadComplete={handleUploadComplete}
      />
    </DashboardLayout>
  );
};

export default Documents;
