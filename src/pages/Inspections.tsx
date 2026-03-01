import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { BulkPhotoUpload } from "@/components/inspections/BulkPhotoUpload";
import { Plus, ClipboardCheck, Search, Filter, CheckCircle, XCircle, AlertTriangle, Calendar, Building, ImageIcon } from "lucide-react";
import { format } from "date-fns";

interface Inspection {
  id: string;
  inspection_number: string;
  inspection_type: string;
  title: string;
  description: string | null;
  location: string | null;
  inspection_date: string;
  next_inspection_date: string | null;
  overall_result: string | null;
  notes: string | null;
  corrective_actions: string | null;
  completed_at: string | null;
  created_at: string;
  project: { name: string } | null;
  inspector: { full_name: string } | null;
}

interface Project {
  id: string;
  name: string;
}

const INSPECTION_TYPES = [
  { value: "scaffold", label: "Scaffold Inspection", defaultIntervalDays: 7 },
  { value: "excavation", label: "Excavation Inspection", defaultIntervalDays: 7 },
  { value: "lifting_equipment", label: "Lifting Equipment", defaultIntervalDays: 7 },
  { value: "electrical", label: "Electrical Inspection", defaultIntervalDays: 90 },
  { value: "fire_safety", label: "Fire Safety", defaultIntervalDays: 30 },
  { value: "housekeeping", label: "Housekeeping", defaultIntervalDays: 7 },
  { value: "ppe_compliance", label: "PPE Compliance", defaultIntervalDays: 30 },
  { value: "general_site", label: "General Site", defaultIntervalDays: 14 },
];

const SCAFFOLD_CHECKLIST = [
  "Base plates and sole boards in place and adequate",
  "Standards plumb and properly braced",
  "Ledgers and transoms level and properly secured",
  "Guard rails at correct height (950mm min)",
  "Toe boards in place (150mm min)",
  "Boards in good condition, no damaged or missing boards",
  "All couplers tight and in good condition",
  "Ties adequate and properly positioned",
  "Access ladder properly secured and extends 1m above platform",
  "Scaffold tag displayed and current",
  "No overloading of the scaffold",
  "Proper gap between scaffold and building (max 300mm)",
];

const RESULT_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pass: { label: "Pass", variant: "default" },
  fail: { label: "Fail", variant: "destructive" },
  requires_action: { label: "Requires Action", variant: "outline" },
  not_applicable: { label: "N/A", variant: "secondary" },
};

export default function Inspections() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { canAccess } = useSubscription();
  const { toast } = useToast();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [resultFilter, setResultFilter] = useState<string>("all");
  const [organisationId, setOrganisationId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    project_id: "",
    inspection_type: "general_site",
    title: "",
    description: "",
    location: "",
    inspection_date: format(new Date(), "yyyy-MM-dd"),
    next_inspection_date: "",
    notes: "",
  });
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);

  const [checklistItems, setChecklistItems] = useState<{ question: string; result: string; notes: string }[]>([]);

  useEffect(() => {
    fetchData();
  }, [user]);

  useEffect(() => {
    // Initialize checklist based on inspection type
    if (formData.inspection_type === "scaffold") {
      setChecklistItems(
        SCAFFOLD_CHECKLIST.map((q) => ({ question: q, result: "", notes: "" }))
      );
    } else {
      setChecklistItems([]);
    }

    // Auto-suggest next inspection date based on type
    const typeConfig = INSPECTION_TYPES.find(t => t.value === formData.inspection_type);
    if (typeConfig && formData.inspection_date) {
      const inspDate = new Date(formData.inspection_date);
      inspDate.setDate(inspDate.getDate() + typeConfig.defaultIntervalDays);
      setFormData(prev => ({ ...prev, next_inspection_date: format(inspDate, "yyyy-MM-dd") }));
    }
  }, [formData.inspection_type, formData.inspection_date]);

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

      const [inspectionsRes, projectsRes] = await Promise.all([
        supabase
          .from("inspections")
          .select(`
            *,
            project:projects(name),
            inspector:profiles!inspections_inspector_id_fkey(full_name)
          `)
          .eq("organisation_id", memberData.organisation_id)
          .order("inspection_date", { ascending: false }),
        supabase
          .from("projects")
          .select("id, name")
          .eq("organisation_id", memberData.organisation_id)
          .eq("status", "active"),
      ]);

      if (inspectionsRes.data) setInspections(inspectionsRes.data as Inspection[]);
      if (projectsRes.data) setProjects(projectsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateInspectionNumber = () => {
    const date = new Date();
    const prefix = "INS";
    const timestamp = format(date, "yyyyMMdd");
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  };

  const handleCreateInspection = async () => {
    if (!organisationId || !user) return;

    if (!formData.title || !formData.project_id) {
      toast({
        title: "Missing required fields",
        description: "Please provide a project and inspection title",
        variant: "destructive",
      });
      return;
    }

    try {
      // Calculate overall result from checklist
      let overallResult = null;
      if (checklistItems.length > 0) {
        const results = checklistItems.map((i) => i.result).filter((r) => r);
        if (results.includes("fail")) {
          overallResult = "fail";
        } else if (results.includes("requires_action")) {
          overallResult = "requires_action";
        } else if (results.every((r) => r === "pass" || r === "not_applicable")) {
          overallResult = "pass";
        }
      }

      const { data: inspection, error } = await supabase
        .from("inspections")
        .insert({
          organisation_id: organisationId,
          project_id: formData.project_id || null,
          inspection_number: generateInspectionNumber(),
          inspection_type: formData.inspection_type as any,
          title: formData.title,
          description: formData.description || null,
          location: formData.location || null,
          inspection_date: formData.inspection_date,
          next_inspection_date: formData.next_inspection_date || null,
          overall_result: overallResult as any,
          notes: formData.notes || null,
          inspector_id: user.id,
          completed_at: overallResult ? new Date().toISOString() : null,
          photos: uploadedPhotos.length > 0 ? uploadedPhotos : null,
        })
        .select()
        .single();

      if (error) throw error;

      // Insert checklist items
      if (checklistItems.length > 0 && inspection) {
        const itemsToInsert = checklistItems.map((item, index) => ({
          organisation_id: organisationId,
          inspection_id: inspection.id,
          item_number: index + 1,
          question: item.question,
          result: item.result ? (item.result as any) : null,
          notes: item.notes || null,
        }));

        await supabase.from("inspection_items").insert(itemsToInsert);
      }

      toast({
        title: "Inspection created",
        description: "The inspection has been recorded",
      });

      setDialogOpen(false);
      setFormData({
        project_id: "",
        inspection_type: "general_site",
        title: "",
        description: "",
        location: "",
        inspection_date: format(new Date(), "yyyy-MM-dd"),
        next_inspection_date: "",
        notes: "",
      });
      setChecklistItems([]);
      setUploadedPhotos([]);
      fetchData();
    } catch (error) {
      console.error("Error creating inspection:", error);
      toast({
        title: "Error",
        description: "Failed to create inspection",
        variant: "destructive",
      });
    }
  };

  const filteredInspections = inspections.filter((inspection) => {
    const matchesSearch =
      inspection.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inspection.inspection_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inspection.location?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || inspection.inspection_type === typeFilter;
    const matchesResult = resultFilter === "all" || inspection.overall_result === resultFilter;
    return matchesSearch && matchesType && matchesResult;
  });

  if (!canAccess("inspections")) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ClipboardCheck className="h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Professional Plan Required</h2>
              <p className="text-muted-foreground text-center max-w-md">
                Site Inspections is available on Professional and Enterprise plans.
                Upgrade to conduct and track inspections.
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
            <h1 className="text-2xl font-bold">Site Inspections</h1>
            <p className="text-muted-foreground">
              Conduct and track scaffold, equipment, and site inspections
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Inspection
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Inspection</DialogTitle>
                <DialogDescription>
                  Record a new site or equipment inspection
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                    <Label>Project *</Label>
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
                    <Label>Inspection Type *</Label>
                    <Select
                      value={formData.inspection_type}
                      onValueChange={(v) => setFormData({ ...formData, inspection_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INSPECTION_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
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
                    placeholder="e.g., Weekly Scaffold Inspection - Tower 1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g., North Elevation, Levels 1-3"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Inspection Date *</Label>
                    <Input
                      type="date"
                      value={formData.inspection_date}
                      onChange={(e) => setFormData({ ...formData, inspection_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Next Inspection Due</Label>
                  <Input
                    type="date"
                    value={formData.next_inspection_date}
                    onChange={(e) => setFormData({ ...formData, next_inspection_date: e.target.value })}
                  />
                  {formData.next_inspection_date && (
                    <p className="text-xs text-muted-foreground">
                      Auto-suggested based on {INSPECTION_TYPES.find(t => t.value === formData.inspection_type)?.label} interval. Adjust if needed.
                    </p>
                  )}
                </div>

                {/* Checklist for scaffold inspections */}
                {checklistItems.length > 0 && (
                  <div className="space-y-4 border rounded-lg p-4">
                    <h3 className="font-semibold">Inspection Checklist</h3>
                    {checklistItems.map((item, index) => (
                      <div key={index} className="space-y-2 pb-3 border-b last:border-0">
                        <p className="text-sm font-medium">
                          {index + 1}. {item.question}
                        </p>
                        <div className="flex gap-2">
                          {["pass", "fail", "requires_action", "not_applicable"].map((result) => (
                            <Button
                              key={result}
                              type="button"
                              size="sm"
                              variant={item.result === result ? "default" : "outline"}
                              onClick={() => {
                                const updated = [...checklistItems];
                                updated[index].result = result;
                                setChecklistItems(updated);
                              }}
                              className={
                                item.result === result
                                  ? result === "pass"
                                    ? "bg-green-600 hover:bg-green-700"
                                    : result === "fail"
                                    ? "bg-red-600 hover:bg-red-700"
                                    : result === "requires_action"
                                    ? "bg-yellow-600 hover:bg-yellow-700"
                                    : ""
                                  : ""
                              }
                            >
                              {RESULT_BADGES[result]?.label}
                            </Button>
                          ))}
                        </div>
                        {(item.result === "fail" || item.result === "requires_action") && (
                          <Input
                            placeholder="Add notes for this item..."
                            value={item.notes}
                            onChange={(e) => {
                              const updated = [...checklistItems];
                              updated[index].notes = e.target.value;
                              setChecklistItems(updated);
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Bulk Photo Upload */}
                {organisationId && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Inspection Photos
                    </Label>
                    <BulkPhotoUpload
                      organisationId={organisationId}
                      onPhotosUploaded={setUploadedPhotos}
                      existingPhotos={uploadedPhotos}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Additional Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any additional observations or notes..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateInspection}>Save Inspection</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search inspections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {INSPECTION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={resultFilter} onValueChange={setResultFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Result" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Results</SelectItem>
              {Object.entries(RESULT_BADGES).map(([value, { label }]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Overdue Inspections Alert */}
        {(() => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const overdueInspections = inspections.filter(
            (i) => i.next_inspection_date && new Date(i.next_inspection_date) < today
          );
          if (overdueInspections.length === 0) return null;
          return (
            <Card className="border-destructive">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-destructive">
                      {overdueInspections.length} Overdue Inspection{overdueInspections.length > 1 ? 's' : ''}
                    </h3>
                    <ul className="mt-1 space-y-1">
                      {overdueInspections.slice(0, 5).map((ins) => (
                        <li key={ins.id} className="text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">{ins.title}</span>
                          {' — due '}
                          {format(new Date(ins.next_inspection_date!), "dd MMM yyyy")}
                          {ins.inspection_type === 'scaffold' && (
                            <span className="text-destructive text-xs ml-1">(7-day legal requirement)</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{inspections.length}</p>
                  <p className="text-sm text-muted-foreground">Total Inspections</p>
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
                    {inspections.filter((i) => i.overall_result === "pass").length}
                  </p>
                  <p className="text-sm text-muted-foreground">Passed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="text-2xl font-bold">
                    {inspections.filter((i) => i.overall_result === "fail").length}
                  </p>
                  <p className="text-sm text-muted-foreground">Failed</p>
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
                    {inspections.filter((i) => {
                      if (!i.next_inspection_date) return false;
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return new Date(i.next_inspection_date) < today;
                    }).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Overdue</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Inspections List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filteredInspections.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ClipboardCheck className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No inspections found</h3>
              <p className="text-muted-foreground">
                {searchQuery || typeFilter !== "all" || resultFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Create your first inspection"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredInspections.map((inspection) => {
              const typeConfig = INSPECTION_TYPES.find((t) => t.value === inspection.inspection_type);
              const resultConfig = inspection.overall_result
                ? RESULT_BADGES[inspection.overall_result]
                : null;

              return (
                <Card
                  key={inspection.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/inspections/${inspection.id}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex gap-4">
                        <div className="p-3 rounded-lg bg-muted">
                          <ClipboardCheck className="h-6 w-6 text-primary" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold">{inspection.title}</h3>
                            {resultConfig && (
                              <Badge variant={resultConfig.variant}>{resultConfig.label}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {inspection.inspection_number} • {typeConfig?.label}
                          </p>
                          {inspection.location && (
                            <p className="text-sm text-muted-foreground">
                              📍 {inspection.location}
                            </p>
                          )}
                          {inspection.project && (
                            <p className="text-sm text-muted-foreground">
                              <Building className="h-3 w-3 inline mr-1" />
                              {inspection.project.name}
                            </p>
                          )}
                          <div className="flex gap-4 text-sm text-muted-foreground mt-2">
                            <span>
                              <Calendar className="h-3 w-3 inline mr-1" />
                              Inspected: {format(new Date(inspection.inspection_date), "dd MMM yyyy")}
                            </span>
                            {inspection.next_inspection_date && (() => {
                              const dueDate = new Date(inspection.next_inspection_date);
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              const isOverdue = dueDate < today;
                              return (
                                <span className={isOverdue ? 'text-destructive font-semibold' : ''}>
                                  {isOverdue ? '⚠ OVERDUE — ' : 'Next: '}
                                  {format(dueDate, "dd MMM yyyy")}
                                </span>
                              );
                            })()}
                          </div>
                          {inspection.inspector && (
                            <p className="text-sm text-muted-foreground">
                              Inspector: {inspection.inspector.full_name}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    {inspection.notes && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm text-muted-foreground">{inspection.notes}</p>
                      </div>
                    )}
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
