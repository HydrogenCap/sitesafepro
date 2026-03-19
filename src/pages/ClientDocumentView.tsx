import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ClientLayout } from "@/components/client/ClientLayout";
import { useClientPortal } from "@/contexts/ClientPortalContext";
import { supabase } from "@/integrations/supabase/client";
import { DocumentPreview } from "@/components/documents/DocumentPreview";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar, FileText, FolderOpen, MapPin } from "lucide-react";
import { format } from "date-fns";

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

export default function ClientDocumentView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { clientUser, logActivity } = useClientPortal();

  const { data, isLoading } = useQuery({
    queryKey: ["client-document", id],
    queryFn: async () => {
      const { data: document, error } = await supabase
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
          version,
          project_id,
          project:projects(name, address)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;

      const { data: urlData, error: urlError } = await supabase.storage
        .from("documents")
        .createSignedUrl(document.file_path, 3600);

      if (urlError) throw urlError;

      return {
        document,
        signedUrl: urlData?.signedUrl ?? null,
      };
    },
    enabled: !!id && !!clientUser?.can_view_documents,
  });

  useEffect(() => {
    if (data?.document) {
      logActivity("viewed_document", "document", data.document.id, data.document.name);
    }
  }, [data?.document, logActivity]);

  const handleDownload = async () => {
    if (!data?.document) return;

    const { data: file, error } = await supabase.storage
      .from("documents")
      .download(data.document.file_path);

    if (error) throw error;

    const url = URL.createObjectURL(file);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = data.document.name;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!clientUser?.can_view_documents) {
    return (
      <ClientLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="py-10 text-center">
              <p>You do not have permission to view documents.</p>
            </CardContent>
          </Card>
        </div>
      </ClientLayout>
    );
  }

  if (isLoading) {
    return (
      <ClientLayout>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid gap-6 lg:grid-cols-3">
            <Skeleton className="h-[520px] lg:col-span-2 rounded-lg" />
            <Skeleton className="h-[260px] rounded-lg" />
          </div>
        </div>
      </ClientLayout>
    );
  }

  if (!data?.document) {
    return (
      <ClientLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="py-10 text-center">
              <p>Document not found.</p>
            </CardContent>
          </Card>
        </div>
      </ClientLayout>
    );
  }

  const { document, signedUrl } = data;

  return (
    <ClientLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(document.project_id ? `/client/project/${document.project_id}` : "/client")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="flex flex-col gap-3 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{document.name}</h1>
            <Badge variant="outline">{CATEGORY_LABELS[document.category] || document.category}</Badge>
            <Badge variant="secondary">v{document.version}</Badge>
          </div>
          {document.description && (
            <p className="text-muted-foreground">{document.description}</p>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <DocumentPreview
              signedUrl={signedUrl}
              mimeType={document.mime_type}
              fileName={document.name}
              onDownload={handleDownload}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
              <CardDescription>Read-only document information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <FolderOpen className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Category</p>
                  <p className="font-medium">{CATEGORY_LABELS[document.category] || document.category}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">{format(new Date(document.created_at), "dd MMM yyyy")}</p>
                </div>
              </div>
              {document.project && (
                <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Project</p>
                    <p className="font-medium">{document.project.name}</p>
                  </div>
                </div>
              )}
              {document.project?.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Location</p>
                    <p className="font-medium">{document.project.address}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ClientLayout>
  );
}
