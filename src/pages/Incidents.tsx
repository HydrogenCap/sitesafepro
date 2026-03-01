import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Plus, AlertTriangle, Search, Filter, Clock, CheckCircle, XCircle, FileWarning, ExternalLink, Calendar, Building, User } from "lucide-react";
import { format } from "date-fns";

interface Incident {
  id: string;
  incident_number: string;
  severity: string;
  status: string;
  title: string;
  description: string;
  location: string | null;
  incident_date: string;
  incident_time: string | null;
  injured_person_name: string | null;
  injured_person_company: string | null;
  injury_description: string | null;
  body_part_affected: string | null;
  immediate_actions: string | null;
  root_cause: string | null;
  corrective_actions: string | null;
  is_riddor_reportable: boolean;
  riddor_reference: string | null;
  investigation_notes: string | null;
  created_at: string;
  project: { name: string } | null;
  reporter: { full_name: string } | null;
}

interface Project {
  id: string;
  name: string;
}

const SEVERITY_CONFIG = {
  near_miss: { label: "Near Miss", variant: "secondary" as const, color: "text-blue-500" },
  minor_injury: { label: "Minor Injury", variant: "outline" as const, color: "text-yellow-500" },
  major_injury: { label: "Major Injury", variant: "destructive" as const, color: "text-orange-500" },
  dangerous_occurrence: { label: "Dangerous Occurrence", variant: "destructive" as const, color: "text-red-500" },
  fatality: { label: "Fatality", variant: "destructive" as const, color: "text-red-700" },
};

const STATUS_CONFIG = {
  reported: { label: "Reported", variant: "secondary" as const },
  under_investigation: { label: "Under Investigation", variant: "outline" as const },
  action_required: { label: "Action Required", variant: "default" as const },
  closed: { label: "Closed", variant: "secondary" as const },
  riddor_reportable: { label: "RIDDOR Reportable", variant: "destructive" as const },
};

const BODY_PARTS = [
  "Head",
  "Eye(s)",
  "Face",
  "Neck",
  "Shoulder",
  "Arm",
  "Elbow",
  "Wrist",
  "Hand",
  "Finger(s)",
  "Chest",
  "Back",
  "Abdomen",
  "Hip",
  "Leg",
  "Knee",
  "Ankle",
  "Foot",
  "Toe(s)",
  "Multiple",
  "Internal",
];

const RIDDOR_GUIDANCE = {
  major_injury: [
    "Fractures (other than fingers, thumbs, and toes)",
    "Amputation of arm, hand, finger, leg, foot, or toe",
    "Permanent loss or reduction of sight",
    "Crush injury leading to internal organ damage",
    "Serious burns covering more than 10% of the body",
    "Any burn affecting the eyes, respiratory system, or other vital organs",
    "Scalping requiring hospital treatment",
    "Loss of consciousness caused by head injury or asphyxia",
    "Any injury arising from working in an enclosed space",
  ],
  dangerous_occurrence: [
    "Collapse, overturning, or failure of load-bearing parts of lifts and lifting equipment",
    "Explosion, collapse, or bursting of any closed vessel or associated pipework",
    "Failure of any freight container in any of its load-bearing parts",
    "Plant or equipment coming into contact with overhead power lines",
    "Electrical short circuit or overload causing fire or explosion",
    "Unintended collapse of any building or structure under construction",
    "Collapse of any scaffold over five metres high",
    "Uncontrolled or accidental release of biological agent",
  ],
};

export default function Incidents() {
  const { user } = useAuth();
  const { canAccess } = useSubscription();
  const { toast } = useToast();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [organisationId, setOrganisationId] = useState<string | null>(null);
  const [showRiddorGuidance, setShowRiddorGuidance] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    project_id: "",
    severity: "near_miss",
    title: "",
    description: "",
    location: "",
    incident_date: format(new Date(), "yyyy-MM-dd"),
    incident_time: "",
    injured_person_name: "",
    injured_person_company: "",
    injured_person_occupation: "",
    injury_description: "",
    body_part_affected: "",
    immediate_actions: "",
  });

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      const { data: memberData } = await supabase
        .from("organisation_members")
        .select("organisation_id")
        .eq("profile_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (!memberData) return;
      setOrganisationId(memberData.organisation_id);

      const [incidentsRes, projectsRes] = await Promise.all([
        supabase
          .from("incidents")
          .select(`
            *,
            project:projects(name),
            reporter:profiles!incidents_reported_by_fkey(full_name)
          `)
          .eq("organisation_id", memberData.organisation_id)
          .order("incident_date", { ascending: false }),
        supabase
          .from("projects")
          .select("id, name")
          .eq("organisation_id", memberData.organisation_id)
          .eq("status", "active"),
      ]);

      if (incidentsRes.data) setIncidents(incidentsRes.data as Incident[]);
      if (projectsRes.data) setProjects(projectsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateIncidentNumber = () => {
    const date = new Date();
    const prefix = "INC";
    const timestamp = format(date, "yyyyMMdd");
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  };

  const handleCreateIncident = async () => {
    if (!organisationId || !user) return;

    if (!formData.title || !formData.description) {
      toast({
        title: "Missing required fields",
        description: "Please provide a title and description",
        variant: "destructive",
      });
      return;
    }

    try {
      // Determine if RIDDOR reportable based on severity
      const isRiddorReportable =
        formData.severity === "major_injury" ||
        formData.severity === "dangerous_occurrence" ||
        formData.severity === "fatality";

      const { error } = await supabase.from("incidents").insert({
        organisation_id: organisationId,
        project_id: formData.project_id || null,
        incident_number: generateIncidentNumber(),
        severity: formData.severity as any,
        status: isRiddorReportable ? "riddor_reportable" : "reported",
        title: formData.title,
        description: formData.description,
        location: formData.location || null,
        incident_date: formData.incident_date,
        incident_time: formData.incident_time || null,
        injured_person_name: formData.injured_person_name || null,
        injured_person_company: formData.injured_person_company || null,
        injured_person_occupation: formData.injured_person_occupation || null,
        injury_description: formData.injury_description || null,
        body_part_affected: formData.body_part_affected || null,
        immediate_actions: formData.immediate_actions || null,
        is_riddor_reportable: isRiddorReportable,
        reported_by: user.id,
      });

      if (error) throw error;

      // Log audit event for incident creation
      await supabase.from("activity_logs").insert({
        organisation_id: organisationId,
        actor_id: user.id,
        activity_type: "incident_reported" as any,
        entity_type: "incident",
        entity_name: formData.title,
        description: `Incident reported: ${formData.title}${isRiddorReportable ? ' (RIDDOR reportable)' : ''}`,
      });

      toast({
        title: "Incident reported",
        description: isRiddorReportable
          ? "This incident may be RIDDOR reportable. Please review and report within required timeframes."
          : "The incident has been recorded",
        variant: isRiddorReportable ? "destructive" : "default",
      });

      setDialogOpen(false);
      setFormData({
        project_id: "",
        severity: "near_miss",
        title: "",
        description: "",
        location: "",
        incident_date: format(new Date(), "yyyy-MM-dd"),
        incident_time: "",
        injured_person_name: "",
        injured_person_company: "",
        injured_person_occupation: "",
        injury_description: "",
        body_part_affected: "",
        immediate_actions: "",
      });
      fetchData();
    } catch (error) {
      console.error("Error creating incident:", error);
      toast({
        title: "Error",
        description: "Failed to report incident",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (incidentId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };

      if (newStatus === "closed") {
        updateData.closed_at = new Date().toISOString();
        updateData.closed_by = user?.id;
      }

      const { error } = await supabase
        .from("incidents")
        .update(updateData)
        .eq("id", incidentId);

      if (error) throw error;

      // Log audit event
      if (organisationId && user) {
        const incident = incidents.find(i => i.id === incidentId);
        const activityType = newStatus === "closed" ? "incident_closed" : "incident_updated";
        await supabase.from("activity_logs").insert({
          organisation_id: organisationId,
          actor_id: user.id,
          activity_type: activityType as any,
          entity_type: "incident",
          entity_id: incidentId,
          entity_name: incident?.title || "",
          description: `Incident status changed to ${newStatus}`,
        });
      }

      toast({
        title: "Status updated",
        description: `Incident status changed to ${STATUS_CONFIG[newStatus as keyof typeof STATUS_CONFIG]?.label || newStatus}`,
      });

      fetchData();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update incident status",
        variant: "destructive",
      });
    }
  };

  const handleRiddorConfirm = async (incidentId: string, riddorReference: string) => {
    if (!user || !organisationId) return;
    try {
      const { error } = await supabase
        .from("incidents")
        .update({
          riddor_reference: riddorReference,
          riddor_reported_at: new Date().toISOString(),
          riddor_submitted_by: user.id,
        })
        .eq("id", incidentId);

      if (error) throw error;

      // Log RIDDOR submission as audit event
      const incident = incidents.find(i => i.id === incidentId);
      await supabase.from("activity_logs").insert({
        organisation_id: organisationId,
        actor_id: user.id,
        activity_type: "riddor_reported" as any,
        entity_type: "incident",
        entity_id: incidentId,
        entity_name: incident?.title || "",
        description: `RIDDOR report submitted with reference ${riddorReference}`,
      });

      toast({ title: "RIDDOR submission recorded", description: `Reference: ${riddorReference}` });
      fetchData();
    } catch (error) {
      console.error("Error recording RIDDOR:", error);
      toast({ title: "Error", description: "Failed to record RIDDOR submission", variant: "destructive" });
    }
  };

  const filteredIncidents = incidents.filter((incident) => {
    const matchesSearch =
      incident.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      incident.incident_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      incident.location?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === "all" || incident.severity === severityFilter;
    const matchesStatus = statusFilter === "all" || incident.status === statusFilter;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  if (!canAccess("incident_reporting")) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Professional Plan Required</h2>
              <p className="text-muted-foreground text-center max-w-md">
                Incident Reporting is available on Professional and Enterprise plans.
                Upgrade to track incidents and ensure RIDDOR compliance.
              </p>
              <Button className="mt-4" onClick={() => window.location.href = "/#pricing"}>
                View Plans
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Incident Reporting</h1>
            <p className="text-muted-foreground">
              Report and investigate workplace incidents with RIDDOR guidance
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowRiddorGuidance(!showRiddorGuidance)}>
              <FileWarning className="h-4 w-4 mr-2" />
              RIDDOR Guide
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Report Incident
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Report Incident</DialogTitle>
                  <DialogDescription>
                    Record details of the incident for investigation
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Important</AlertTitle>
                    <AlertDescription>
                      Serious injuries, dangerous occurrences, and fatalities must be reported to the
                      HSE under RIDDOR regulations. Fatal and specified injuries must be reported
                      without delay.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Project</Label>
                      <Select
                        value={formData.project_id}
                        onValueChange={(v) => setFormData({ ...formData, project_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Severity *</Label>
                      <Select
                        value={formData.severity}
                        onValueChange={(v) => setFormData({ ...formData, severity: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(SEVERITY_CONFIG).map(([value, { label }]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {(formData.severity === "major_injury" ||
                    formData.severity === "dangerous_occurrence" ||
                    formData.severity === "fatality") && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>RIDDOR Reportable</AlertTitle>
                      <AlertDescription>
                        This type of incident is likely to be RIDDOR reportable. Fatal incidents and
                        specified injuries must be reported to the HSE immediately by the quickest
                        practical means.
                        <a
                          href="https://www.hse.gov.uk/riddor/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 mt-2 underline"
                        >
                          Report to HSE <ExternalLink className="h-3 w-3" />
                        </a>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Brief description of the incident"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Incident Date *</Label>
                      <Input
                        type="date"
                        value={formData.incident_date}
                        onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Incident Time</Label>
                      <Input
                        type="time"
                        value={formData.incident_time}
                        onChange={(e) => setFormData({ ...formData, incident_time: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Where did the incident occur?"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Description *</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe what happened in detail..."
                      rows={4}
                    />
                  </div>

                  {formData.severity !== "near_miss" && formData.severity !== "dangerous_occurrence" && (
                    <>
                      <div className="border-t pt-4">
                        <h3 className="font-semibold mb-3">Injured Person Details</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Name</Label>
                            <Input
                              value={formData.injured_person_name}
                              onChange={(e) =>
                                setFormData({ ...formData, injured_person_name: e.target.value })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Company</Label>
                            <Input
                              value={formData.injured_person_company}
                              onChange={(e) =>
                                setFormData({ ...formData, injured_person_company: e.target.value })
                              }
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div className="space-y-2">
                            <Label>Occupation</Label>
                            <Input
                              value={formData.injured_person_occupation}
                              onChange={(e) =>
                                setFormData({ ...formData, injured_person_occupation: e.target.value })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Body Part Affected</Label>
                            <Select
                              value={formData.body_part_affected}
                              onValueChange={(v) =>
                                setFormData({ ...formData, body_part_affected: v })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                {BODY_PARTS.map((part) => (
                                  <SelectItem key={part} value={part}>
                                    {part}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2 mt-4">
                          <Label>Injury Description</Label>
                          <Textarea
                            value={formData.injury_description}
                            onChange={(e) =>
                              setFormData({ ...formData, injury_description: e.target.value })
                            }
                            placeholder="Describe the nature of the injury..."
                            rows={2}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label>Immediate Actions Taken</Label>
                    <Textarea
                      value={formData.immediate_actions}
                      onChange={(e) =>
                        setFormData({ ...formData, immediate_actions: e.target.value })
                      }
                      placeholder="What actions were taken immediately after the incident?"
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateIncident}>Report Incident</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* RIDDOR Guidance */}
        {showRiddorGuidance && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileWarning className="h-5 w-5 text-destructive" />
                RIDDOR Reporting Guidance
              </CardTitle>
              <CardDescription>
                Reporting of Injuries, Diseases and Dangerous Occurrences Regulations 2013
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="injuries">
                <TabsList>
                  <TabsTrigger value="injuries">Specified Injuries</TabsTrigger>
                  <TabsTrigger value="occurrences">Dangerous Occurrences</TabsTrigger>
                  <TabsTrigger value="deadlines">Reporting Deadlines</TabsTrigger>
                </TabsList>
                <TabsContent value="injuries" className="mt-4">
                  <h4 className="font-semibold mb-2">Specified injuries that must be reported:</h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {RIDDOR_GUIDANCE.major_injury.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </TabsContent>
                <TabsContent value="occurrences" className="mt-4">
                  <h4 className="font-semibold mb-2">Dangerous occurrences that must be reported:</h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {RIDDOR_GUIDANCE.dangerous_occurrence.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </TabsContent>
                <TabsContent value="deadlines" className="mt-4 space-y-3">
                  <div className="p-3 bg-destructive/10 rounded-lg">
                    <h4 className="font-semibold text-destructive">Fatal & Specified Injuries</h4>
                    <p className="text-sm">Report immediately by quickest practical means (usually phone)</p>
                    <p className="text-sm font-medium mt-1">HSE Incident Contact Centre: 0345 300 9923</p>
                  </div>
                  <div className="p-3 bg-yellow-500/10 rounded-lg">
                    <h4 className="font-semibold text-yellow-700">Over 7-Day Incapacitation</h4>
                    <p className="text-sm">Report within 15 days of the incident</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <h4 className="font-semibold">Online Reporting</h4>
                    <a
                      href="https://www.hse.gov.uk/riddor/report.htm"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary flex items-center gap-1"
                    >
                      www.hse.gov.uk/riddor/report.htm <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search incidents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              {Object.entries(SEVERITY_CONFIG).map(([value, { label }]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([value, { label }]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{incidents.length}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {incidents.filter((i) => i.severity === "near_miss").length}
                  </p>
                  <p className="text-sm text-muted-foreground">Near Miss</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {incidents.filter((i) => i.severity === "minor_injury").length}
                  </p>
                  <p className="text-sm text-muted-foreground">Minor</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {incidents.filter((i) => i.severity === "major_injury").length}
                  </p>
                  <p className="text-sm text-muted-foreground">Major</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {incidents.filter((i) => i.is_riddor_reportable).length}
                  </p>
                  <p className="text-sm text-muted-foreground">RIDDOR</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Incidents List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filteredIncidents.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No incidents found</h3>
              <p className="text-muted-foreground">
                {searchQuery || severityFilter !== "all" || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "No incidents have been reported"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredIncidents.map((incident) => {
              const severityConfig = SEVERITY_CONFIG[incident.severity as keyof typeof SEVERITY_CONFIG];
              const statusConfig = STATUS_CONFIG[incident.status as keyof typeof STATUS_CONFIG];

              return (
                <Card key={incident.id} className={incident.is_riddor_reportable ? "border-destructive" : ""}>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex gap-4">
                        <div className={`p-3 rounded-lg bg-muted ${severityConfig?.color}`}>
                          <AlertTriangle className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold">{incident.title}</h3>
                            {severityConfig && (
                              <Badge variant={severityConfig.variant}>{severityConfig.label}</Badge>
                            )}
                            {statusConfig && (
                              <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                            )}
                        {incident.is_riddor_reportable && (
                              <Badge variant="destructive">
                                {(incident as any).riddor_reported_at ? 'RIDDOR ✓' : 'RIDDOR'}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{incident.incident_number}</p>
                          {incident.location && (
                            <p className="text-sm text-muted-foreground">📍 {incident.location}</p>
                          )}
                          {incident.project && (
                            <p className="text-sm text-muted-foreground">
                              <Building className="h-3 w-3 inline mr-1" />
                              {incident.project.name}
                            </p>
                          )}
                          <div className="flex gap-4 text-sm text-muted-foreground mt-2">
                            <span>
                              <Calendar className="h-3 w-3 inline mr-1" />
                              {format(new Date(incident.incident_date), "dd MMM yyyy")}
                              {incident.incident_time && ` at ${incident.incident_time}`}
                            </span>
                            {incident.reporter && (
                              <span>
                                <User className="h-3 w-3 inline mr-1" />
                                {incident.reporter.full_name}
                              </span>
                            )}
                          </div>
                          {incident.injured_person_name && (
                            <p className="text-sm text-muted-foreground">
                              Injured: {incident.injured_person_name}
                              {incident.body_part_affected && ` (${incident.body_part_affected})`}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {incident.status === "reported" && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(incident.id, "under_investigation")}
                          >
                            Start Investigation
                          </Button>
                        )}
                        {incident.status === "under_investigation" && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(incident.id, "action_required")}
                          >
                            Mark Actions Required
                          </Button>
                        )}
                        {(incident.status === "action_required" ||
                          incident.status === "under_investigation") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(incident.id, "closed")}
                          >
                            Close Incident
                          </Button>
                        )}
                        {incident.is_riddor_reportable && !(incident as any).riddor_reported_at && (
                          <>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => window.open("https://www.hse.gov.uk/riddor/report.htm", "_blank")}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Report to HSE
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const ref = prompt("Enter the RIDDOR reference number from HSE:");
                                if (ref?.trim()) handleRiddorConfirm(incident.id, ref.trim());
                              }}
                            >
                              Confirm RIDDOR Submitted
                            </Button>
                          </>
                        )}
                        {incident.is_riddor_reportable && (incident as any).riddor_reported_at && (
                          <span className="text-xs text-muted-foreground">
                            RIDDOR ref: {incident.riddor_reference} · Submitted {format(new Date((incident as any).riddor_reported_at), "dd MMM yyyy")}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground line-clamp-2">
                      {incident.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
