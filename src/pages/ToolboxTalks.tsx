import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";
import { 
  MessageSquare, 
  Play, 
  Plus, 
  Search, 
  Clock, 
  Users, 
  Calendar,
  FileText,
  Lock,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";

interface Template {
  id: string;
  title: string;
  category: string;
  description: string | null;
  content: string;
  duration_minutes: number;
  is_system_template: boolean;
  created_at: string;
}

interface DeliveredTalk {
  id: string;
  title: string;
  category: string;
  delivered_at: string;
  status: string;
  location: string | null;
  delivered_by: string;
  deliverer?: { full_name: string } | null;
  project?: { name: string } | null;
  attendee_count?: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  working_at_height: "Working at Height",
  manual_handling: "Manual Handling",
  fire_safety: "Fire Safety",
  electrical_safety: "Electrical Safety",
  excavations: "Excavations",
  confined_spaces: "Confined Spaces",
  ppe: "PPE",
  housekeeping: "Housekeeping",
  hand_tools: "Hand Tools",
  power_tools: "Power Tools",
  scaffolding: "Scaffolding",
  lifting_operations: "Lifting Operations",
  hazardous_substances: "COSHH",
  noise: "Noise",
  dust: "Dust",
  asbestos: "Asbestos",
  slips_trips_falls: "Slips, Trips & Falls",
  vehicle_safety: "Vehicle Safety",
  environmental: "Environmental",
  emergency_procedures: "Emergency Procedures",
  mental_health: "Mental Health",
  general_safety: "General Safety",
  other: "Other",
};

const CATEGORY_COLORS: Record<string, string> = {
  working_at_height: "bg-red-100 text-red-700 border-red-200",
  manual_handling: "bg-blue-100 text-blue-700 border-blue-200",
  fire_safety: "bg-orange-100 text-orange-700 border-orange-200",
  electrical_safety: "bg-yellow-100 text-yellow-700 border-yellow-200",
  ppe: "bg-purple-100 text-purple-700 border-purple-200",
  scaffolding: "bg-cyan-100 text-cyan-700 border-cyan-200",
  asbestos: "bg-pink-100 text-pink-700 border-pink-200",
  mental_health: "bg-teal-100 text-teal-700 border-teal-200",
  default: "bg-gray-100 text-gray-700 border-gray-200",
};

export default function ToolboxTalks() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canAccess, isTrialing } = useSubscription();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [deliveredTalks, setDeliveredTalks] = useState<DeliveredTalk[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  // New template form
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<string>("general_safety");
  const [newDescription, setNewDescription] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newDuration, setNewDuration] = useState(15);

  const hasAccess = canAccess("toolbox_talks");

  useEffect(() => {
    if (hasAccess) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [hasAccess]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch templates
      const { data: templatesData, error: templatesError } = await supabase
        .from("toolbox_talk_templates")
        .select("*")
        .eq("is_active", true)
        .order("title");

      if (templatesError) throw templatesError;
      setTemplates(templatesData || []);

      // Fetch delivered talks with attendee count
      const { data: talksData, error: talksError } = await supabase
        .from("toolbox_talks")
        .select(`
          *,
          deliverer:profiles!toolbox_talks_delivered_by_fkey(full_name),
          project:projects(name)
        `)
        .order("delivered_at", { ascending: false })
        .limit(50);

      if (talksError) throw talksError;

      // Get attendee counts
      const talkIds = talksData?.map(t => t.id) || [];
      if (talkIds.length > 0) {
        const { data: attendeeCounts } = await supabase
          .from("toolbox_talk_attendees")
          .select("toolbox_talk_id")
          .in("toolbox_talk_id", talkIds);

        const countMap = (attendeeCounts || []).reduce((acc: Record<string, number>, curr) => {
          acc[curr.toolbox_talk_id] = (acc[curr.toolbox_talk_id] || 0) + 1;
          return acc;
        }, {});

        setDeliveredTalks(
          (talksData || []).map(talk => ({
            ...talk,
            attendee_count: countMap[talk.id] || 0,
          }))
        );
      } else {
        setDeliveredTalks([]);
      }
    } catch (error: any) {
      console.error("Error fetching toolbox talks:", error);
      toast.error("Failed to load toolbox talks");
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error("Please enter a title and content");
      return;
    }

    try {
      const { data: orgData } = await supabase
        .from("organisation_members")
        .select("organisation_id")
        .eq("profile_id", user?.id)
        .eq("status", "active")
        .maybeSingle();

      if (!orgData) {
        toast.error("Could not find your organisation");
        return;
      }

      const { error } = await supabase
        .from("toolbox_talk_templates")
        .insert({
          organisation_id: orgData.organisation_id,
          title: newTitle.trim(),
          category: newCategory as any,
          description: newDescription.trim() || null,
          content: newContent.trim(),
          duration_minutes: newDuration,
          created_by: user?.id,
          is_system_template: false,
        });

      if (error) throw error;

      toast.success("Template created successfully");
      setCreateDialogOpen(false);
      setNewTitle("");
      setNewDescription("");
      setNewContent("");
      setNewDuration(15);
      fetchData();
    } catch (error: any) {
      console.error("Error creating template:", error);
      toast.error("Failed to create template");
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = 
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || template.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const systemTemplates = filteredTemplates.filter(t => t.is_system_template);
  const customTemplates = filteredTemplates.filter(t => !t.is_system_template);

  const getCategoryBadgeClass = (category: string) => {
    return CATEGORY_COLORS[category] || CATEGORY_COLORS.default;
  };

  // Stats
  const totalDelivered = deliveredTalks.length;
  const completedTalks = deliveredTalks.filter(t => t.status === "completed").length;
  const totalAttendees = deliveredTalks.reduce((sum, t) => sum + (t.attendee_count || 0), 0);
  const thisMonthTalks = deliveredTalks.filter(t => {
    const date = new Date(t.delivered_at);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  if (!hasAccess && !isTrialing) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="max-w-2xl mx-auto text-center py-16">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-4">Toolbox Talks</h1>
            <p className="text-muted-foreground mb-8">
              Access a library of 35+ pre-loaded UK construction safety talks. 
              Deliver talks to your team and capture attendance with digital signatures.
            </p>
            <Card className="text-left">
              <CardHeader>
                <CardTitle className="text-lg">Available on Professional Plan</CardTitle>
                <CardDescription>Upgrade to unlock toolbox talks</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span>35+ pre-loaded UK safety talks</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span>Create custom templates</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span>Digital attendance with signatures</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span>PDF export for audits</span>
                  </li>
                </ul>
                <Button onClick={() => navigate("/settings")} className="w-full">
                  Upgrade to Professional
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    );
  }

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Toolbox Talks</h1>
            <p className="text-muted-foreground">
              Deliver safety talks and track attendance
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Custom Template</DialogTitle>
                  <DialogDescription>
                    Create your own toolbox talk template
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="e.g., Hot Works Safety"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select value={newCategory} onValueChange={setNewCategory}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Brief description of the talk"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content">Content * (Markdown supported)</Label>
                    <Textarea
                      id="content"
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder="## Key Points&#10;&#10;1. First point&#10;2. Second point"
                      rows={10}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={newDuration}
                      onChange={(e) => setNewDuration(parseInt(e.target.value) || 15)}
                      min={5}
                      max={60}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createTemplate}>Create Template</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{templates.length}</p>
                  <p className="text-sm text-muted-foreground">Templates</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-success/10 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{completedTalks}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Users className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalAttendees}</p>
                  <p className="text-sm text-muted-foreground">Attendees</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-accent/10 rounded-lg">
                  <Calendar className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{thisMonthTalks}</p>
                  <p className="text-sm text-muted-foreground">This Month</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="library" className="space-y-4">
          <TabsList>
            <TabsTrigger value="library">Talk Library</TabsTrigger>
            <TabsTrigger value="delivered">Delivered ({totalDelivered})</TabsTrigger>
          </TabsList>

          {/* Library Tab */}
          <TabsContent value="library" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All categories" />
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
            </div>

            {/* System Templates */}
            {systemTemplates.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Safety Talk Library</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {systemTemplates.map(template => (
                    <Card key={template.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base line-clamp-2">{template.title}</CardTitle>
                          <Badge variant="outline" className={getCategoryBadgeClass(template.category)}>
                            {CATEGORY_LABELS[template.category] || template.category}
                          </Badge>
                        </div>
                        {template.description && (
                          <CardDescription className="line-clamp-2">
                            {template.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {template.duration_minutes} mins
                          </div>
                          <Button 
                            size="sm"
                            onClick={() => navigate(`/toolbox-talks/deliver/${template.id}`)}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Deliver
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Templates */}
            {customTemplates.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Custom Templates</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {customTemplates.map(template => (
                    <Card key={template.id} className="hover:shadow-md transition-shadow border-dashed">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base line-clamp-2">{template.title}</CardTitle>
                          <Badge variant="outline" className={getCategoryBadgeClass(template.category)}>
                            {CATEGORY_LABELS[template.category] || template.category}
                          </Badge>
                        </div>
                        {template.description && (
                          <CardDescription className="line-clamp-2">
                            {template.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {template.duration_minutes} mins
                          </div>
                          <Button 
                            size="sm"
                            onClick={() => navigate(`/toolbox-talks/deliver/${template.id}`)}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Deliver
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {filteredTemplates.length === 0 && (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No templates found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or filter
                </p>
              </div>
            )}
          </TabsContent>

          {/* Delivered Tab */}
          <TabsContent value="delivered">
            <Card>
              <CardHeader>
                <CardTitle>Delivered Talks</CardTitle>
                <CardDescription>
                  History of all toolbox talks delivered to your team
                </CardDescription>
              </CardHeader>
              <CardContent>
                {deliveredTalks.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No talks delivered yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start delivering safety talks to your team
                    </p>
                    <Button onClick={() => document.querySelector('[value="library"]')?.dispatchEvent(new Event('click'))}>
                      Browse Talk Library
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {deliveredTalks.map(talk => (
                      <div
                        key={talk.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/toolbox-talks/${talk.id}`)}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${
                            talk.status === "completed" ? "bg-success/10" : "bg-accent/10"
                          }`}>
                            {talk.status === "completed" ? (
                              <CheckCircle className="h-5 w-5 text-success" />
                            ) : (
                              <AlertTriangle className="h-5 w-5 text-accent" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium">{talk.title}</h4>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span>
                                {format(new Date(talk.delivered_at), "dd MMM yyyy HH:mm")}
                              </span>
                              {talk.deliverer && (
                                <span>by {talk.deliverer.full_name}</span>
                              )}
                              {talk.project && (
                                <Badge variant="secondary" className="text-xs">
                                  {talk.project.name}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-medium">{talk.attendee_count || 0}</p>
                            <p className="text-xs text-muted-foreground">attendees</p>
                          </div>
                          <Badge variant={talk.status === "completed" ? "default" : "secondary"}>
                            {talk.status === "completed" ? "Completed" : "In Progress"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}