import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";
import { 
  FileText, 
  Users, 
  ClipboardCheck, 
  MessageSquare, 
  FileBarChart,
  Download,
  Calendar as CalendarIcon,
  Loader2,
  Building2
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import {
  generateSiteVisitsReport,
  generateInductionReport,
  generateToolboxTalksReport,
  generateDocumentsReport,
  generateComplianceSummaryReport,
  type SiteVisitReportData,
  type InductionReportData,
  type ToolboxTalkReportData,
  type DocumentReportData,
  type ProjectComplianceData,
} from "@/lib/report-generators";

interface Project {
  id: string;
  name: string;
}

type ReportType = "site-visits" | "inductions" | "toolbox-talks" | "documents" | "compliance";

const REPORT_TYPES = [
  {
    id: "site-visits" as ReportType,
    title: "Site Attendance",
    description: "Visitor check-in/check-out records",
    icon: Users,
    color: "bg-blue-500/10 text-blue-500",
  },
  {
    id: "inductions" as ReportType,
    title: "Site Inductions",
    description: "Completed induction records with signatures",
    icon: ClipboardCheck,
    color: "bg-green-500/10 text-green-500",
  },
  {
    id: "toolbox-talks" as ReportType,
    title: "Toolbox Talks",
    description: "Safety talks with attendance records",
    icon: MessageSquare,
    color: "bg-purple-500/10 text-purple-500",
  },
  {
    id: "documents" as ReportType,
    title: "Document Audit",
    description: "Document upload and approval records",
    icon: FileText,
    color: "bg-orange-500/10 text-orange-500",
  },
  {
    id: "compliance" as ReportType,
    title: "Compliance Summary",
    description: "Project compliance overview across all metrics",
    icon: FileBarChart,
    color: "bg-primary/10 text-primary",
  },
];

const DATE_PRESETS = [
  { label: "Last 7 days", getValue: () => ({ start: subDays(new Date(), 7), end: new Date() }) },
  { label: "Last 30 days", getValue: () => ({ start: subDays(new Date(), 30), end: new Date() }) },
  { label: "This month", getValue: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) }) },
  { label: "Last month", getValue: () => ({ start: startOfMonth(subMonths(new Date(), 1)), end: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: "Last 3 months", getValue: () => ({ start: subMonths(new Date(), 3), end: new Date() }) },
];

export default function Reports() {
  const { organisation } = useSubscription();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedReportType, setSelectedReportType] = useState<ReportType>("site-visits");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: subDays(new Date(), 30),
    end: new Date(),
  });
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .eq("status", "active")
        .order("name");

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDatePreset = (preset: typeof DATE_PRESETS[0]) => {
    setDateRange(preset.getValue());
  };

  const generateReport = async () => {
    setGenerating(true);
    
    try {
      const projectFilter = selectedProjectId !== "all" ? selectedProjectId : null;
      const projectName = projectFilter ? projects.find(p => p.id === projectFilter)?.name || null : null;

      switch (selectedReportType) {
        case "site-visits":
          await generateSiteVisitsReportData(projectFilter, projectName);
          break;
        case "inductions":
          await generateInductionReportData(projectFilter, projectName);
          break;
        case "toolbox-talks":
          await generateToolboxTalksReportData();
          break;
        case "documents":
          await generateDocumentsReportData(projectFilter, projectName);
          break;
        case "compliance":
          await generateComplianceSummaryData();
          break;
      }
      
      toast.success("Report generated successfully");
    } catch (error: any) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  const generateSiteVisitsReportData = async (projectFilter: string | null, projectName: string | null) => {
    let query = supabase
      .from("site_visits")
      .select(`
        visitor_name,
        visitor_company,
        visitor_email,
        purpose,
        checked_in_at,
        checked_out_at,
        has_signed_induction,
        project:projects(name)
      `)
      .gte("checked_in_at", dateRange.start.toISOString())
      .lte("checked_in_at", dateRange.end.toISOString())
      .order("checked_in_at", { ascending: false });

    if (projectFilter) {
      query = query.eq("project_id", projectFilter);
    }

    const { data, error } = await query;
    if (error) throw error;

    const visits: SiteVisitReportData[] = (data || []).map(v => ({
      visitor_name: v.visitor_name,
      visitor_company: v.visitor_company,
      visitor_email: v.visitor_email,
      purpose: v.purpose,
      checked_in_at: v.checked_in_at,
      checked_out_at: v.checked_out_at,
      has_signed_induction: v.has_signed_induction || false,
      project_name: (v.project as any)?.name || "Unknown",
    }));

    generateSiteVisitsReport(visits, projectName, dateRange, organisation?.name);
  };

  const generateInductionReportData = async (projectFilter: string | null, projectName: string | null) => {
    let query = supabase
      .from("site_induction_completions")
      .select(`
        visitor_name,
        visitor_company,
        visitor_email,
        completed_at,
        signature_data,
        project:projects(name),
        template:site_induction_templates(name)
      `)
      .gte("completed_at", dateRange.start.toISOString())
      .lte("completed_at", dateRange.end.toISOString())
      .order("completed_at", { ascending: false });

    if (projectFilter) {
      query = query.eq("project_id", projectFilter);
    }

    const { data, error } = await query;
    if (error) throw error;

    const completions: InductionReportData[] = (data || []).map(c => ({
      visitor_name: c.visitor_name,
      visitor_company: c.visitor_company,
      visitor_email: c.visitor_email,
      completed_at: c.completed_at,
      signature_data: c.signature_data,
      project_name: (c.project as any)?.name || "Unknown",
      template_name: (c.template as any)?.name || "Unknown",
    }));

    generateInductionReport(completions, projectName, dateRange, organisation?.name);
  };

  const generateToolboxTalksReportData = async () => {
    const { data, error } = await supabase
      .from("toolbox_talks")
      .select(`
        title,
        category,
        delivered_at,
        status,
        deliverer:profiles!toolbox_talks_delivered_by_fkey(full_name),
        project:projects(name)
      `)
      .gte("delivered_at", dateRange.start.toISOString())
      .lte("delivered_at", dateRange.end.toISOString())
      .order("delivered_at", { ascending: false });

    if (error) throw error;

    // Get attendee counts
    const talkIds = (data || []).map(t => (t as any).id);
    const { data: attendeeCounts } = await supabase
      .from("toolbox_talk_attendees")
      .select("toolbox_talk_id")
      .in("toolbox_talk_id", talkIds.length > 0 ? talkIds : ["00000000-0000-0000-0000-000000000000"]);

    const countMap = (attendeeCounts || []).reduce((acc, a) => {
      acc[a.toolbox_talk_id] = (acc[a.toolbox_talk_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const talks: ToolboxTalkReportData[] = (data || []).map((t: any) => ({
      title: t.title,
      category: t.category,
      delivered_at: t.delivered_at,
      deliverer_name: t.deliverer?.full_name || "Unknown",
      project_name: t.project?.name || null,
      attendee_count: countMap[t.id] || 0,
      status: t.status,
    }));

    generateToolboxTalksReport(talks, dateRange, organisation?.name);
  };

  const generateDocumentsReportData = async (projectFilter: string | null, projectName: string | null) => {
    let query = supabase
      .from("documents")
      .select(`
        name,
        category,
        status,
        created_at,
        file_size,
        uploader:profiles!documents_uploaded_by_fkey(full_name),
        project:projects(name)
      `)
      .gte("created_at", dateRange.start.toISOString())
      .lte("created_at", dateRange.end.toISOString())
      .order("created_at", { ascending: false });

    if (projectFilter) {
      query = query.eq("project_id", projectFilter);
    }

    const { data, error } = await query;
    if (error) throw error;

    const documents: DocumentReportData[] = (data || []).map((d: any) => ({
      name: d.name,
      category: d.category,
      status: d.status,
      uploaded_at: d.created_at,
      uploaded_by: d.uploader?.full_name || "Unknown",
      project_name: d.project?.name || null,
      file_size: d.file_size,
    }));

    generateDocumentsReport(documents, projectName, dateRange, organisation?.name);
  };

  const generateComplianceSummaryData = async () => {
    // Fetch all projects
    const { data: projectsData, error: projectsError } = await supabase
      .from("projects")
      .select("id, name")
      .eq("status", "active");

    if (projectsError) throw projectsError;

    const projectComplianceData: ProjectComplianceData[] = [];

    for (const project of projectsData || []) {
      // Documents
      const { count: totalDocs } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("project_id", project.id)
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString());

      const { count: approvedDocs } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("project_id", project.id)
        .eq("status", "approved")
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString());

      const { count: pendingDocs } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("project_id", project.id)
        .eq("status", "pending")
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString());

      // Site visits
      const { count: visits } = await supabase
        .from("site_visits")
        .select("*", { count: "exact", head: true })
        .eq("project_id", project.id)
        .gte("checked_in_at", dateRange.start.toISOString())
        .lte("checked_in_at", dateRange.end.toISOString());

      // Inductions
      const { count: inductions } = await supabase
        .from("site_induction_completions")
        .select("*", { count: "exact", head: true })
        .eq("project_id", project.id)
        .gte("completed_at", dateRange.start.toISOString())
        .lte("completed_at", dateRange.end.toISOString());

      // Toolbox talks
      const { count: talks } = await supabase
        .from("toolbox_talks")
        .select("*", { count: "exact", head: true })
        .eq("project_id", project.id)
        .gte("delivered_at", dateRange.start.toISOString())
        .lte("delivered_at", dateRange.end.toISOString());

      projectComplianceData.push({
        project_name: project.name,
        total_documents: totalDocs || 0,
        approved_documents: approvedDocs || 0,
        pending_documents: pendingDocs || 0,
        total_visits: visits || 0,
        completed_inductions: inductions || 0,
        toolbox_talks: talks || 0,
      });
    }

    generateComplianceSummaryReport(projectComplianceData, dateRange, organisation?.name);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">
            Generate and export compliance reports
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Report Types */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="font-semibold">Select Report Type</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {REPORT_TYPES.map(report => (
                <Card
                  key={report.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    selectedReportType === report.id && "ring-2 ring-primary"
                  )}
                  onClick={() => setSelectedReportType(report.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn("p-2 rounded-lg", report.color)}>
                        <report.icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{report.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {report.description}
                        </p>
                      </div>
                      {selectedReportType === report.id && (
                        <Badge variant="default" className="ml-2">
                          Selected
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Report Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Project Filter */}
                {selectedReportType !== "toolbox-talks" && selectedReportType !== "compliance" && (
                  <div className="space-y-2">
                    <Label>Project</Label>
                    <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            All Projects
                          </div>
                        </SelectItem>
                        {projects.map(project => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Date Range */}
                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <div className="flex flex-wrap gap-2">
                    {DATE_PRESETS.map(preset => (
                      <Button
                        key={preset.label}
                        variant="outline"
                        size="sm"
                        onClick={() => handleDatePreset(preset)}
                        className="text-xs"
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Custom Date Range */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label className="text-xs">Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(dateRange.start, "dd/MM/yy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateRange.start}
                          onSelect={(date) => date && setDateRange(prev => ({ ...prev, start: date }))}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(dateRange.end, "dd/MM/yy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateRange.end}
                          onSelect={(date) => date && setDateRange(prev => ({ ...prev, end: date }))}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Generate Button */}
                <Button
                  className="w-full"
                  onClick={generateReport}
                  disabled={generating}
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Generate PDF Report
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Report Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Report Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>
                    <strong>Report:</strong> {REPORT_TYPES.find(r => r.id === selectedReportType)?.title}
                  </p>
                  <p>
                    <strong>Period:</strong> {format(dateRange.start, "dd MMM yyyy")} - {format(dateRange.end, "dd MMM yyyy")}
                  </p>
                  {selectedProjectId !== "all" && selectedReportType !== "toolbox-talks" && selectedReportType !== "compliance" && (
                    <p>
                      <strong>Project:</strong> {projects.find(p => p.id === selectedProjectId)?.name}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}