import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { FileText, Plus, Download, Loader2, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";

interface Document {
  id: string;
  name: string;
  description: string | null;
  file_path: string;
  file_size: number;
  mime_type: string;
  category: string;
  status: string;
  is_auto_generated: boolean | null;
  requires_acknowledgement: boolean | null;
  created_at: string;
}

interface ProjectDocumentsTabProps {
  projectId: string;
}

export const ProjectDocumentsTab = ({ projectId }: ProjectDocumentsTabProps) => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [projectId]);

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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      rams: "RAMS",
      method_statement: "Method Statement",
      risk_assessment: "Risk Assessment",
      induction: "Induction",
      permit: "Permit",
      inspection: "Inspection",
      health_safety: "H&S",
      other: "Other",
    };
    return labels[category] || category;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleUploadClick = () => {
    navigate(`/documents?project=${projectId}`);
  };

  if (documents.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl border-2 border-dashed border-border p-12 text-center"
      >
        <div className="h-16 w-16 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          No documents yet
        </h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Upload RAMS, method statements, and other safety documents for this project.
        </p>
        <Button onClick={handleUploadClick}>
          <Plus className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          Project Documents ({documents.length})
        </h3>
        <Button onClick={handleUploadClick}>
          <Plus className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="divide-y divide-border">
          {documents.map((doc, index) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => navigate(`/documents/${doc.id}`)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-foreground truncate">
                        {doc.name}
                      </h4>
                      {doc.is_auto_generated && (
                        <Badge variant="secondary" className="text-xs">
                          Auto-generated
                        </Badge>
                      )}
                      {doc.status === "approved" && (
                        <Badge className="bg-success/10 text-success text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approved
                        </Badge>
                      )}
                      {doc.status === "pending" && (
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span>{getCategoryLabel(doc.category)}</span>
                      <span>•</span>
                      <span>{formatFileSize(doc.file_size)}</span>
                      <span>•</span>
                      <span>{formatDate(doc.created_at)}</span>
                    </div>
                    {doc.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                        {doc.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handleDownload(doc); }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};