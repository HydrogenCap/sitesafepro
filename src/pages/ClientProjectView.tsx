import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ClientLayout } from "@/components/client/ClientLayout";
import { useClientPortal } from "@/contexts/ClientPortalContext";
import { ComplianceScoreGauge } from "@/components/client/ComplianceScoreGauge";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  FileText,
  AlertTriangle,
  BookOpen,
  Shield,
  CheckCircle2,
  Clock,
  XCircle,
  Download,
  Eye,
  MapPin,
  Calendar,
  Users,
} from "lucide-react";
import { format } from "date-fns";

const roleLabels: Record<string, string> = {
  client: "Client",
  principal_designer: "Principal Designer",
  cdm_advisor: "CDM Advisor",
  building_control: "Building Control",
};

export default function ClientProjectView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { clientUser, logActivity } = useClientPortal();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch project details
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["client-project", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch documents
  const { data: documents } = useQuery({
    queryKey: ["client-project-documents", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("project_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id && clientUser?.can_view_documents,
  });

  // Fetch RAMS
  const { data: rams } = useQuery({
    queryKey: ["client-project-rams", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rams_records")
        .select("*")
        .eq("project_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id && clientUser?.can_view_rams,
  });

  // Fetch actions
  const { data: actions } = useQuery({
    queryKey: ["client-project-actions", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("corrective_actions")
        .select("*")
        .eq("project_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id && clientUser?.can_view_actions,
  });

  // Fetch diary entries
  const { data: diaryEntries } = useQuery({
    queryKey: ["client-project-diary", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_diary_entries")
        .select("*")
        .eq("project_id", id)
        .order("entry_date", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
    enabled: !!id && clientUser?.can_view_diary,
  });

  useEffect(() => {
    if (project) {
      logActivity("viewed_project", "project", id, project.name);
    }
  }, [project, id, logActivity]);

  // Calculate compliance score
  const calculateComplianceScore = () => {
    let score = 0;
    let factors = 0;

    if (documents) {
      const approvedDocs = documents.filter((d) => d.status === "approved").length;
      score += documents.length > 0 ? (approvedDocs / documents.length) * 100 : 100;
      factors++;
    }

    if (actions) {
      const overdueActions = actions.filter(
        (a) => new Date(a.due_date) < new Date() && a.status !== "closed"
      ).length;
      score += overdueActions === 0 ? 100 : Math.max(0, 100 - overdueActions * 20);
      factors++;
    }

    if (rams) {
      const approvedRams = rams.filter((r) => r.status === "approved").length;
      score += rams.length > 0 ? (approvedRams / rams.length) * 100 : 100;
      factors++;
    }

    return factors > 0 ? score / factors : 100;
  };

  if (projectLoading) {
    return (
      <ClientLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </ClientLayout>
    );
  }

  if (!project) {
    return (
      <ClientLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p>Project not found</p>
        </div>
      </ClientLayout>
    );
  }

  const complianceScore = calculateComplianceScore();

  return (
    <ClientLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/client")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>

        {/* Project Header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            {project.address && (
              <p className="text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-4 w-4" />
                {project.address}
              </p>
            )}
            <Badge variant="outline" className="mt-2">
              Viewing as: {roleLabels[clientUser?.role || "client"]}
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {clientUser?.can_view_documents && (
              <TabsTrigger value="documents">Documents</TabsTrigger>
            )}
            {clientUser?.can_view_rams && (
              <TabsTrigger value="rams">RAMS</TabsTrigger>
            )}
            {clientUser?.can_view_actions && (
              <TabsTrigger value="actions">Actions</TabsTrigger>
            )}
            {clientUser?.can_view_diary && (
              <TabsTrigger value="diary">Site Diary</TabsTrigger>
            )}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Compliance Score */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>Compliance Score</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <ComplianceScoreGauge score={complianceScore} size="lg" />
                </CardContent>
              </Card>

              {/* Compliance Breakdown */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Compliance Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {clientUser?.can_view_documents && (
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <span>Documents</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {documents?.filter((d) => d.status === "approved").length || 0}/
                          {documents?.length || 0} approved
                        </span>
                        {documents?.filter((d) => d.status === "approved").length === documents?.length ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <Clock className="h-5 w-5 text-amber-500" />
                        )}
                      </div>
                    </div>
                  )}

                  {clientUser?.can_view_rams && (
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-muted-foreground" />
                        <span>RAMS</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {rams?.filter((r) => r.status === "approved").length || 0}/
                          {rams?.length || 0} approved
                        </span>
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      </div>
                    </div>
                  )}

                  {clientUser?.can_view_actions && (
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                        <span>Corrective Actions</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {actions?.filter((a) => a.status !== "closed").length || 0} open
                        </span>
                        {actions?.filter((a) => new Date(a.due_date) < new Date() && a.status !== "closed").length === 0 ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                    </div>
                  )}

                  {clientUser?.can_view_diary && (
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <BookOpen className="h-5 w-5 text-muted-foreground" />
                        <span>Site Diary</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {diaryEntries?.length || 0} entries (last 30 days)
                        </span>
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>Project Documents</CardTitle>
                <CardDescription>
                  View and download project documentation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents?.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{doc.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={doc.status === "approved" ? "default" : "secondary"}
                          >
                            {doc.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(doc.created_at), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              logActivity("viewed_document", "document", doc.id, doc.name);
                              navigate(`/documents/${doc.id}`);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!documents || documents.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No documents available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* RAMS Tab */}
          <TabsContent value="rams">
            <Card>
              <CardHeader>
                <CardTitle>Risk Assessments & Method Statements</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rams?.map((ram) => (
                      <TableRow key={ram.id}>
                        <TableCell className="font-mono text-sm">{ram.rams_reference}</TableCell>
                        <TableCell className="font-medium">{ram.title}</TableCell>
                        <TableCell>
                          <Badge
                            variant={ram.status === "approved" ? "default" : "secondary"}
                          >
                            {ram.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(ram.assessment_date), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              logActivity("viewed_rams", "rams", ram.id, ram.title);
                              navigate(`/rams/${ram.id}`);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!rams || rams.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No RAMS available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Actions Tab */}
          <TabsContent value="actions">
            <Card>
              <CardHeader>
                <CardTitle>Corrective Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {actions?.map((action) => {
                      const isOverdue = new Date(action.due_date) < new Date() && action.status !== "closed";
                      return (
                        <TableRow key={action.id}>
                          <TableCell className="font-medium">{action.title}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                action.priority === "high" ? "destructive" :
                                action.priority === "medium" ? "default" : "secondary"
                              }
                            >
                              {action.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{action.status}</Badge>
                          </TableCell>
                          <TableCell className={isOverdue ? "text-red-600 font-medium" : ""}>
                            {format(new Date(action.due_date), "dd MMM yyyy")}
                            {isOverdue && " (Overdue)"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {(!actions || actions.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No corrective actions
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Diary Tab */}
          <TabsContent value="diary">
            <Card>
              <CardHeader>
                <CardTitle>Site Diary Entries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {diaryEntries?.map((entry) => {
                    const workforceEntries = entry.workforce_entries as any[] || [];
                    const totalWorkforce = workforceEntries.reduce((sum, e) => sum + (e.count || 0), 0);
                    
                    return (
                      <div
                        key={entry.id}
                        className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {format(new Date(entry.entry_date), "EEEE, dd MMMM yyyy")}
                            </span>
                          </div>
                          <Badge variant={entry.status === "complete" ? "default" : "secondary"}>
                            {entry.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>{totalWorkforce} workers</span>
                          </div>
                          {entry.weather_morning && (
                            <div>
                              <span className="text-muted-foreground">AM: </span>
                              {entry.weather_morning}
                            </div>
                          )}
                          {entry.weather_afternoon && (
                            <div>
                              <span className="text-muted-foreground">PM: </span>
                              {entry.weather_afternoon}
                            </div>
                          )}
                          {entry.temperature_high && (
                            <div>
                              <span className="text-muted-foreground">Temp: </span>
                              {entry.temperature_high}°C
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {(!diaryEntries || diaryEntries.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      No diary entries available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ClientLayout>
  );
}
