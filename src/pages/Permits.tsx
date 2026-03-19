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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Plus, FileWarning, Clock, CheckCircle, XCircle, AlertTriangle, Search, Filter, Flame, Construction, Zap, Mountain, HardHat, CalendarDays, ChevronLeft, ChevronRight, AlertOctagon } from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, isWithinInterval, parseISO, differenceInDays, isBefore, isAfter } from "date-fns";

interface Permit {
  id: string;
  permit_number: string;
  permit_type: string;
  status: string;
  title: string;
  description: string | null;
  location: string | null;
  work_to_be_done: string;
  hazards_identified: string | null;
  control_measures: string | null;
  ppe_required: string[] | null;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string;
  project: { name: string } | null;
  requester: { full_name: string } | null;
  approver: { full_name: string } | null;
}

interface Project {
  id: string;
  name: string;
}

const PERMIT_TYPES = [
  { value: "hot_work", label: "Hot Work", icon: Flame, color: "text-orange-500" },
  { value: "confined_space", label: "Confined Space", icon: Mountain, color: "text-purple-500" },
  { value: "excavation", label: "Excavation", icon: Construction, color: "text-amber-500" },
  { value: "electrical_isolation", label: "Electrical Isolation", icon: Zap, color: "text-yellow-500" },
  { value: "working_at_height", label: "Working at Height", icon: HardHat, color: "text-blue-500" },
  { value: "roof_work", label: "Roof Work", icon: HardHat, color: "text-cyan-500" },
  { value: "demolition", label: "Demolition", icon: Construction, color: "text-red-500" },
  { value: "lifting_operations", label: "Lifting Operations", icon: Construction, color: "text-green-500" },
  { value: "general", label: "General", icon: FileWarning, color: "text-gray-500" },
];

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Draft", variant: "secondary" },
  pending_approval: { label: "Pending Approval", variant: "outline" },
  approved: { label: "Approved", variant: "default" },
  active: { label: "Active", variant: "default" },
  completed: { label: "Completed", variant: "secondary" },
  cancelled: { label: "Cancelled", variant: "destructive" },
  expired: { label: "Expired", variant: "destructive" },
};

const PPE_OPTIONS = [
  "Hard Hat",
  "Safety Glasses",
  "High-Vis Vest",
  "Safety Boots",
  "Gloves",
  "Hearing Protection",
  "Respiratory Protection",
  "Fall Arrest Harness",
  "Face Shield",
  "Fire-Resistant Clothing",
];

export default function Permits() {
  const { user } = useAuth();
  const { canAccess } = useSubscription();
  const { toast } = useToast();
  const [permits, setPermits] = useState<Permit[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [calendarWeekStart, setCalendarWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [activeTab, setActiveTab] = useState<string>("list");
  const [organisationId, setOrganisationId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    project_id: "",
    permit_type: "general",
    title: "",
    description: "",
    location: "",
    work_to_be_done: "",
    hazards_identified: "",
    control_measures: "",
    ppe_required: [] as string[],
    valid_from: "",
    valid_until: "",
  });

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Get organisation ID
      const { data: memberData } = await supabase
        .from("organisation_members")
        .select("organisation_id")
        .eq("profile_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (!memberData) return;
      setOrganisationId(memberData.organisation_id);

      // Fetch permits and projects in parallel
      const [permitsRes, projectsRes] = await Promise.all([
        supabase
          .from("permits_to_work")
          .select(`
            *,
            project:projects(name),
            requester:profiles!permits_to_work_requested_by_fkey(full_name),
            approver:profiles!permits_to_work_approved_by_fkey(full_name)
          `)
          .eq("organisation_id", memberData.organisation_id)
          .order("created_at", { ascending: false }),
        supabase
          .from("projects")
          .select("id, name")
          .eq("organisation_id", memberData.organisation_id)
          .eq("status", "active"),
      ]);

      if (permitsRes.data) setPermits(permitsRes.data as Permit[]);
      if (projectsRes.data) setProjects(projectsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generatePermitNumber = () => {
    const date = new Date();
    const prefix = "PTW";
    const timestamp = format(date, "yyyyMMdd");
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  };

  const handleCreatePermit = async () => {
    if (!organisationId || !user) return;

    if (!formData.title || !formData.work_to_be_done) {
      toast({
        title: "Missing required fields",
        description: "Please fill in the title and work description",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("permits_to_work").insert({
        organisation_id: organisationId,
        project_id: formData.project_id || null,
        permit_number: generatePermitNumber(),
        permit_type: formData.permit_type as any,
        status: "draft",
        title: formData.title,
        description: formData.description || null,
        location: formData.location || null,
        work_to_be_done: formData.work_to_be_done,
        hazards_identified: formData.hazards_identified || null,
        control_measures: formData.control_measures || null,
        ppe_required: formData.ppe_required.length > 0 ? formData.ppe_required : null,
        valid_from: formData.valid_from || null,
        valid_until: formData.valid_until || null,
        requested_by: user.id,
      });

      if (error) throw error;

      toast({
        title: "Permit created",
        description: "The permit to work has been created as a draft",
      });

      setDialogOpen(false);
      setFormData({
        project_id: "",
        permit_type: "general",
        title: "",
        description: "",
        location: "",
        work_to_be_done: "",
        hazards_identified: "",
        control_measures: "",
        ppe_required: [],
        valid_from: "",
        valid_until: "",
      });
      fetchData();
    } catch (error) {
      console.error("Error creating permit:", error);
      toast({
        title: "Error",
        description: "Failed to create permit",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (permitId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === "approved") {
        updateData.approved_by = user?.id;
      } else if (newStatus === "completed") {
        updateData.completed_at = new Date().toISOString();
        updateData.completed_by = user?.id;
      } else if (newStatus === "cancelled") {
        updateData.cancelled_at = new Date().toISOString();
        updateData.cancelled_by = user?.id;
      }

      const { error } = await supabase
        .from("permits_to_work")
        .update(updateData)
        .eq("id", permitId);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: `Permit status changed to ${STATUS_BADGES[newStatus]?.label || newStatus}`,
      });

      fetchData();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update permit status",
        variant: "destructive",
      });
    }
  };

  const filteredPermits = permits.filter((permit) => {
    const matchesSearch =
      permit.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      permit.permit_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      permit.location?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || permit.status === statusFilter;
    const matchesType = typeFilter === "all" || permit.permit_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  if (!canAccess("permits_to_work")) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileWarning className="h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Professional Plan Required</h2>
              <p className="text-muted-foreground text-center max-w-md">
                Permits to Work is available on Professional and Enterprise plans.
                Upgrade to manage work permits and ensure compliance.
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
            <h1 className="text-2xl font-bold">Permits to Work</h1>
            <p className="text-muted-foreground">
              Manage work permits for high-risk activities
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Permit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Permit to Work</DialogTitle>
                <DialogDescription>
                  Fill in the details for the new work permit
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
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
                    <Label>Permit Type *</Label>
                    <Select
                      value={formData.permit_type}
                      onValueChange={(v) => setFormData({ ...formData, permit_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PERMIT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className={`h-4 w-4 ${type.color}`} />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Hot Work - Welding in Plant Room"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Building A, Level 2, Plant Room"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Work to be Done *</Label>
                  <Textarea
                    value={formData.work_to_be_done}
                    onChange={(e) => setFormData({ ...formData, work_to_be_done: e.target.value })}
                    placeholder="Describe the work in detail..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Hazards Identified</Label>
                  <Textarea
                    value={formData.hazards_identified}
                    onChange={(e) => setFormData({ ...formData, hazards_identified: e.target.value })}
                    placeholder="List all identified hazards..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Control Measures</Label>
                  <Textarea
                    value={formData.control_measures}
                    onChange={(e) => setFormData({ ...formData, control_measures: e.target.value })}
                    placeholder="Describe control measures to mitigate hazards..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>PPE Required</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {PPE_OPTIONS.map((ppe) => (
                      <label key={ppe} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={formData.ppe_required.includes(ppe)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                ppe_required: [...formData.ppe_required, ppe],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                ppe_required: formData.ppe_required.filter((p) => p !== ppe),
                              });
                            }
                          }}
                          className="rounded"
                        />
                        {ppe}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valid From</Label>
                    <Input
                      type="datetime-local"
                      value={formData.valid_from}
                      onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valid Until</Label>
                    <Input
                      type="datetime-local"
                      value={formData.valid_until}
                      onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreatePermit}>Create Permit</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* View tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="list" className="gap-1.5">
              <FileWarning className="h-4 w-4" />Permit List
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-1.5">
              <CalendarDays className="h-4 w-4" />Calendar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search permits..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(STATUS_BADGES).map(([value, { label }]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {PERMIT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {permits.filter((p) => p.status === "pending_approval").length}
                  </p>
                  <p className="text-sm text-muted-foreground">Pending Approval</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {permits.filter((p) => p.status === "active").length}
                  </p>
                  <p className="text-sm text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">
                    {permits.filter((p) => p.status === "completed").length}
                  </p>
                  <p className="text-sm text-muted-foreground">Completed</p>
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
                    {permits.filter((p) => p.status === "expired").length}
                  </p>
                  <p className="text-sm text-muted-foreground">Expired</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Permits List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filteredPermits.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileWarning className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No permits found</h3>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== "all" || typeFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Create your first permit to work"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredPermits.map((permit) => {
              const typeConfig = PERMIT_TYPES.find((t) => t.value === permit.permit_type);
              const TypeIcon = typeConfig?.icon || FileWarning;
              const statusConfig = STATUS_BADGES[permit.status] || { label: permit.status, variant: "secondary" as const };

              return (
                <Card key={permit.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex gap-4">
                        <div className={`p-3 rounded-lg bg-muted ${typeConfig?.color}`}>
                          <TypeIcon className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold">{permit.title}</h3>
                            <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {permit.permit_number} • {typeConfig?.label}
                          </p>
                          {permit.location && (
                            <p className="text-sm text-muted-foreground">
                              📍 {permit.location}
                            </p>
                          )}
                          {permit.project && (
                            <p className="text-sm text-muted-foreground">
                              Project: {permit.project.name}
                            </p>
                          )}
                          <div className="flex gap-4 text-sm text-muted-foreground mt-2">
                            {permit.valid_from && (
                              <span>From: {format(new Date(permit.valid_from), "dd MMM yyyy HH:mm")}</span>
                            )}
                            {permit.valid_until && (
                              <span>Until: {format(new Date(permit.valid_until), "dd MMM yyyy HH:mm")}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {permit.status === "draft" && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(permit.id, "pending_approval")}
                          >
                            Submit for Approval
                          </Button>
                        )}
                        {permit.status === "pending_approval" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleStatusChange(permit.id, "approved")}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleStatusChange(permit.id, "cancelled")}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {permit.status === "approved" && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(permit.id, "active")}
                          >
                            Activate
                          </Button>
                        )}
                        {permit.status === "active" && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(permit.id, "completed")}
                          >
                            Complete
                          </Button>
                        )}
                      </div>
                    </div>
                    {permit.ppe_required && permit.ppe_required.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm font-medium mb-2">PPE Required:</p>
                        <div className="flex flex-wrap gap-2">
                          {permit.ppe_required.map((ppe) => (
                            <Badge key={ppe} variant="outline">
                              {ppe}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
          </TabsContent>

          {/* ── CALENDAR TAB ── */}
          <TabsContent value="calendar">
            <div className="space-y-4">
              {/* Week navigation */}
              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" className="gap-1" onClick={() => setCalendarWeekStart(d => addDays(d, -7))}>
                  <ChevronLeft className="h-4 w-4" />Previous Week
                </Button>
                <p className="text-sm font-medium">
                  {format(calendarWeekStart, "d MMM")} – {format(addDays(calendarWeekStart, 6), "d MMM yyyy")}
                </p>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => setCalendarWeekStart(d => addDays(d, 7))}>
                  Next Week<ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Clash detection */}
              {(() => {
                const weekEnd = addDays(calendarWeekStart, 6);
                const CLASHING_TYPES = new Set([["hot_work", "confined_space"], ["hot_work", "working_at_height"]].flat());
                const activeThisWeek = permits.filter(p => {
                  if (!["active", "approved"].includes(p.status)) return false;
                  if (!p.valid_from && !p.valid_until) return true; // no dates = always show
                  const from = p.valid_from ? parseISO(p.valid_from) : calendarWeekStart;
                  const until = p.valid_until ? parseISO(p.valid_until) : weekEnd;
                  return !(isAfter(from, weekEnd) || isBefore(until, calendarWeekStart));
                });
                const typeGroups: Record<string, typeof activeThisWeek> = {};
                activeThisWeek.forEach(p => { if (!typeGroups[p.permit_type]) typeGroups[p.permit_type] = []; typeGroups[p.permit_type].push(p); });
                const clashTypes = Object.keys(typeGroups).filter(t => CLASHING_TYPES.has(t));
                const hasClash = clashTypes.length > 1;
                if (hasClash) return (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <AlertOctagon className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive">
                      <strong>Potential clash this week:</strong> Active permits include {clashTypes.map(t => PERMIT_TYPES.find(pt => pt.value === t)?.label || t).join(" and ")}. Ensure safe working arrangements are in place.
                    </p>
                  </div>
                );
                return null;
              })()}

              {/* 7-day grid */}
              <div className="overflow-x-auto">
                <div className="grid grid-cols-7 gap-1 min-w-[600px]">
                  {Array.from({ length: 7 }, (_, i) => {
                    const day = addDays(calendarWeekStart, i);
                    const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                    const dayPermits = permits.filter(p => {
                      if (!["active", "approved", "draft"].includes(p.status)) return false;
                      const from = p.valid_from ? parseISO(p.valid_from) : null;
                      const until = p.valid_until ? parseISO(p.valid_until) : null;
                      if (!from && !until) return false;
                      const dayStart = day;
                      const dayEnd = addDays(day, 1);
                      if (from && until) return !(isAfter(from, dayEnd) || isBefore(until, dayStart));
                      if (from) return !isAfter(from, dayEnd);
                      if (until) return !isBefore(until, dayStart);
                      return false;
                    });
                    return (
                      <div key={i} className={`rounded-lg p-2 min-h-[120px] border ${isToday ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
                        <p className={`text-xs font-medium mb-2 ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                          <span className="block">{format(day, "EEE")}</span>
                          <span className={`text-sm font-bold ${isToday ? "text-primary" : "text-foreground"}`}>{format(day, "d")}</span>
                        </p>
                        <div className="space-y-1">
                          {dayPermits.map(p => {
                            const typeConfig = PERMIT_TYPES.find(t => t.value === p.permit_type);
                            const isExpiring = p.valid_until && differenceInDays(parseISO(p.valid_until), day) === 0;
                            return (
                              <div
                                key={p.id}
                                title={`${p.title} (${p.permit_number})`}
                                className={`text-xs px-1.5 py-1 rounded truncate cursor-default border ${
                                  isExpiring ? "bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-950/30 dark:border-amber-700 dark:text-amber-300" :
                                  p.permit_type === "hot_work" ? "bg-orange-100 border-orange-200 text-orange-800 dark:bg-orange-950/30 dark:border-orange-700 dark:text-orange-300" :
                                  p.permit_type === "confined_space" ? "bg-purple-100 border-purple-200 text-purple-800 dark:bg-purple-950/30 dark:border-purple-700 dark:text-purple-300" :
                                  p.permit_type === "working_at_height" ? "bg-blue-100 border-blue-200 text-blue-800 dark:bg-blue-950/30 dark:border-blue-700 dark:text-blue-300" :
                                  "bg-muted border-border text-foreground"
                                }`}
                              >
                                {isExpiring && "⚠ "}
                                {typeConfig ? typeConfig.label.split(" ").slice(0,2).join(" ") : p.permit_type.replace(/_/g, " ")}
                              </div>
                            );
                          })}
                          {dayPermits.length === 0 && <p className="text-xs text-muted-foreground/50">—</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Expiring soon */}
              {(() => {
                const expiringSoon = permits.filter(p => {
                  if (!["active", "approved"].includes(p.status) || !p.valid_until) return false;
                  const daysLeft = differenceInDays(parseISO(p.valid_until), new Date());
                  return daysLeft >= 0 && daysLeft <= 2;
                });
                if (expiringSoon.length === 0) return null;
                return (
                  <Card className="border-amber-200 dark:border-amber-800">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
                        <Clock className="h-4 w-4" />Expiring Soon
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {expiringSoon.map(p => (
                        <div key={p.id} className="flex items-center justify-between text-sm">
                          <span className="font-medium">{p.title}</span>
                          <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                            Expires {format(parseISO(p.valid_until!), "dd MMM HH:mm")}
                          </Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Legend */}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {PERMIT_TYPES.filter(t => ["hot_work","confined_space","working_at_height","general"].includes(t.value)).map(t => (
                  <span key={t.value} className="flex items-center gap-1">
                    <span className={`w-3 h-3 rounded-sm inline-block ${
                      t.value === "hot_work" ? "bg-orange-300" :
                      t.value === "confined_space" ? "bg-purple-300" :
                      t.value === "working_at_height" ? "bg-blue-300" : "bg-muted-foreground/30"
                    }`} />
                    {t.label}
                  </span>
                ))}
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm inline-block bg-amber-300" />Expiring today
                </span>
              </div>
            </div>
          </TabsContent>
        </Tabs>

      </div>
    </DashboardLayout>
  );
}
