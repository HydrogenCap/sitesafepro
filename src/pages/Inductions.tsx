import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { 
  ClipboardCheck, 
  Plus, 
  Edit, 
  Trash2, 
  GripVertical, 
  Video, 
  Users, 
  CheckCircle,
  FileText,
  Settings,
  Eye
} from "lucide-react";
import { format } from "date-fns";

interface Project {
  id: string;
  name: string;
}

interface InductionItem {
  id: string;
  question: string;
  description: string | null;
  is_required: boolean;
  sort_order: number;
}

interface InductionTemplate {
  id: string;
  name: string;
  description: string | null;
  video_url: string | null;
  is_active: boolean;
  created_at: string;
  project: Project;
  items?: InductionItem[];
}

interface InductionCompletion {
  id: string;
  visitor_name: string;
  visitor_email: string | null;
  visitor_company: string | null;
  completed_at: string;
  project: Project;
  template: { name: string };
}

export default function Inductions() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<InductionTemplate[]>([]);
  const [completions, setCompletions] = useState<InductionCompletion[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<InductionTemplate | null>(null);
  const [itemsDialogOpen, setItemsDialogOpen] = useState(false);
  
  // Form states
  const [newTemplateName, setNewTemplateName] = useState("Site Safety Induction");
  const [newTemplateDescription, setNewTemplateDescription] = useState("");
  const [newTemplateVideoUrl, setNewTemplateVideoUrl] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [templateItems, setTemplateItems] = useState<InductionItem[]>([]);
  const [newItemQuestion, setNewItemQuestion] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch projects
      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("id, name")
        .eq("status", "active");

      if (projectsError) throw projectsError;
      setProjects(projectsData || []);

      // Fetch templates with items
      const { data: templatesData, error: templatesError } = await supabase
        .from("site_induction_templates")
        .select(`
          id,
          name,
          description,
          video_url,
          is_active,
          created_at,
          project:projects(id, name)
        `)
        .order("created_at", { ascending: false });

      if (templatesError) throw templatesError;
      setTemplates(templatesData as InductionTemplate[] || []);

      // Fetch completions
      const { data: completionsData, error: completionsError } = await supabase
        .from("site_induction_completions")
        .select(`
          id,
          visitor_name,
          visitor_email,
          visitor_company,
          completed_at,
          project:projects(id, name),
          template:site_induction_templates(name)
        `)
        .order("completed_at", { ascending: false })
        .limit(100);

      if (completionsError) throw completionsError;
      setCompletions(completionsData as InductionCompletion[] || []);
    } catch (error: any) {
      toast.error("Failed to load induction data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async () => {
    if (!selectedProjectId) {
      toast.error("Please select a project");
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

      const { data, error } = await supabase
        .from("site_induction_templates")
        .insert({
          project_id: selectedProjectId,
          organisation_id: orgData.organisation_id,
          name: newTemplateName,
          description: newTemplateDescription || null,
          video_url: newTemplateVideoUrl || null,
          created_by: user?.id,
        })
        .select(`
          id,
          name,
          description,
          video_url,
          is_active,
          created_at,
          project:projects(id, name)
        `)
        .single();

      if (error) throw error;

      // Add default checklist items
      const defaultItems = [
        { question: "I understand the site emergency procedures and muster points", is_required: true, sort_order: 0 },
        { question: "I have been made aware of all site hazards and risks", is_required: true, sort_order: 1 },
        { question: "I understand the PPE requirements for this site", is_required: true, sort_order: 2 },
        { question: "I know who to report accidents and near-misses to", is_required: true, sort_order: 3 },
        { question: "I have read and understood the site rules", is_required: true, sort_order: 4 },
      ];

      await supabase
        .from("site_induction_items")
        .insert(defaultItems.map(item => ({
          ...item,
          template_id: data.id,
          organisation_id: orgData.organisation_id,
        })));

      setTemplates([data as InductionTemplate, ...templates]);
      setCreateDialogOpen(false);
      resetForm();
      toast.success("Induction template created with default questions");
    } catch (error: any) {
      toast.error("Failed to create template");
      console.error(error);
    }
  };

  const updateTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      const { error } = await supabase
        .from("site_induction_templates")
        .update({
          name: newTemplateName,
          description: newTemplateDescription || null,
          video_url: newTemplateVideoUrl || null,
        })
        .eq("id", selectedTemplate.id);

      if (error) throw error;

      setTemplates(templates.map(t => 
        t.id === selectedTemplate.id 
          ? { ...t, name: newTemplateName, description: newTemplateDescription, video_url: newTemplateVideoUrl }
          : t
      ));
      setEditDialogOpen(false);
      resetForm();
      toast.success("Template updated");
    } catch (error: any) {
      toast.error("Failed to update template");
      console.error(error);
    }
  };

  const toggleTemplateStatus = async (templateId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("site_induction_templates")
        .update({ is_active: !isActive })
        .eq("id", templateId);

      if (error) throw error;

      setTemplates(templates.map(t => 
        t.id === templateId ? { ...t, is_active: !isActive } : t
      ));
      toast.success(`Template ${!isActive ? "activated" : "deactivated"}`);
    } catch (error: any) {
      toast.error("Failed to update template");
      console.error(error);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this induction template?")) return;

    try {
      const { error } = await supabase
        .from("site_induction_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;

      setTemplates(templates.filter(t => t.id !== templateId));
      toast.success("Template deleted");
    } catch (error: any) {
      toast.error("Failed to delete template");
      console.error(error);
    }
  };

  const openEditDialog = (template: InductionTemplate) => {
    setSelectedTemplate(template);
    setNewTemplateName(template.name);
    setNewTemplateDescription(template.description || "");
    setNewTemplateVideoUrl(template.video_url || "");
    setEditDialogOpen(true);
  };

  const openItemsDialog = async (template: InductionTemplate) => {
    setSelectedTemplate(template);
    
    // Fetch items for this template
    const { data, error } = await supabase
      .from("site_induction_items")
      .select("*")
      .eq("template_id", template.id)
      .order("sort_order");

    if (error) {
      toast.error("Failed to load checklist items");
      return;
    }

    setTemplateItems(data || []);
    setItemsDialogOpen(true);
  };

  const addItem = async () => {
    if (!selectedTemplate || !newItemQuestion.trim()) return;

    try {
      const { data: orgData } = await supabase
        .from("organisation_members")
        .select("organisation_id")
        .eq("profile_id", user?.id)
        .eq("status", "active")
        .maybeSingle();

      if (!orgData) return;

      const maxOrder = Math.max(0, ...templateItems.map(i => i.sort_order));

      const { data, error } = await supabase
        .from("site_induction_items")
        .insert({
          template_id: selectedTemplate.id,
          organisation_id: orgData.organisation_id,
          question: newItemQuestion.trim(),
          description: newItemDescription.trim() || null,
          is_required: true,
          sort_order: maxOrder + 1,
        })
        .select()
        .single();

      if (error) throw error;

      setTemplateItems([...templateItems, data]);
      setNewItemQuestion("");
      setNewItemDescription("");
      toast.success("Question added");
    } catch (error: any) {
      toast.error("Failed to add question");
      console.error(error);
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from("site_induction_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      setTemplateItems(templateItems.filter(i => i.id !== itemId));
      toast.success("Question removed");
    } catch (error: any) {
      toast.error("Failed to remove question");
      console.error(error);
    }
  };

  const resetForm = () => {
    setNewTemplateName("Site Safety Induction");
    setNewTemplateDescription("");
    setNewTemplateVideoUrl("");
    setSelectedProjectId("");
    setSelectedTemplate(null);
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Site Inductions</h1>
            <p className="text-muted-foreground">
              Manage digital site inductions for contractors
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Induction
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Induction Template</DialogTitle>
                <DialogDescription>
                  Set up a site induction with safety information and checklist
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Induction Name</Label>
                  <Input
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="e.g., Site Safety Induction"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description (Optional)</Label>
                  <Textarea
                    value={newTemplateDescription}
                    onChange={(e) => setNewTemplateDescription(e.target.value)}
                    placeholder="Brief description of this induction..."
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Video URL (Optional)</Label>
                  <Input
                    value={newTemplateVideoUrl}
                    onChange={(e) => setNewTemplateVideoUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                  />
                  <p className="text-sm text-muted-foreground">
                    YouTube or Vimeo URL for a safety induction video
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setCreateDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button onClick={createTemplate}>Create Template</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <ClipboardCheck className="h-6 w-6 text-primary" />
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
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{templates.filter(t => t.is_active).length}</p>
                  <p className="text-sm text-muted-foreground">Active</p>
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
                  <p className="text-2xl font-bold">{completions.length}</p>
                  <p className="text-sm text-muted-foreground">Completions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-accent/10 rounded-lg">
                  <Video className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{templates.filter(t => t.video_url).length}</p>
                  <p className="text-sm text-muted-foreground">With Video</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="templates" className="space-y-4">
          <TabsList>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="completions">Completions ({completions.length})</TabsTrigger>
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates">
            <Card>
              <CardHeader>
                <CardTitle>Induction Templates</CardTitle>
                <CardDescription>
                  Configure site inductions for each project
                </CardDescription>
              </CardHeader>
              <CardContent>
                {templates.length === 0 ? (
                  <div className="text-center py-12">
                    <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No induction templates yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Create your first site induction template
                    </p>
                    <Button onClick={() => setCreateDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      New Induction
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {templates.map(template => (
                      <Card key={template.id} className="relative">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold">{template.name}</h3>
                                <Badge variant={template.is_active ? "default" : "secondary"}>
                                  {template.is_active ? "Active" : "Inactive"}
                                </Badge>
                                {template.video_url && (
                                  <Badge variant="outline">
                                    <Video className="h-3 w-3 mr-1" />
                                    Video
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {template.project.name}
                              </p>
                              {template.description && (
                                <p className="text-sm text-muted-foreground">
                                  {template.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openItemsDialog(template)}
                              >
                                <FileText className="h-4 w-4 mr-1" />
                                Questions
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(template)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleTemplateStatus(template.id, template.is_active)}
                              >
                                {template.is_active ? "Deactivate" : "Activate"}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteTemplate(template.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Completions Tab */}
          <TabsContent value="completions">
            <Card>
              <CardHeader>
                <CardTitle>Induction Completions</CardTitle>
                <CardDescription>
                  Records of contractors who have completed site inductions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {completions.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No completions yet</h3>
                    <p className="text-muted-foreground">
                      Induction completions will appear here when contractors complete them during check-in
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Induction</TableHead>
                        <TableHead>Completed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {completions.map(completion => (
                        <TableRow key={completion.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{completion.visitor_name}</p>
                              {completion.visitor_email && (
                                <p className="text-sm text-muted-foreground">{completion.visitor_email}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{completion.visitor_company || "—"}</TableCell>
                          <TableCell>{completion.project.name}</TableCell>
                          <TableCell>{completion.template.name}</TableCell>
                          <TableCell>
                            {format(new Date(completion.completed_at), "dd MMM yyyy, HH:mm")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Template Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Induction Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Induction Name</Label>
                <Input
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newTemplateDescription}
                  onChange={(e) => setNewTemplateDescription(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Video URL</Label>
                <Input
                  value={newTemplateVideoUrl}
                  onChange={(e) => setNewTemplateVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setEditDialogOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={updateTemplate}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Items Management Dialog */}
        <Dialog open={itemsDialogOpen} onOpenChange={setItemsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Manage Checklist Questions</DialogTitle>
              <DialogDescription>
                {selectedTemplate?.name} - Questions contractors must acknowledge
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
              {templateItems.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No questions yet. Add your first question below.
                </p>
              ) : (
                <div className="space-y-2">
                  {templateItems.map((item, index) => (
                    <div key={item.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <span className="text-muted-foreground font-mono text-sm mt-1">
                        {index + 1}.
                      </span>
                      <div className="flex-1">
                        <p className="font-medium">{item.question}</p>
                        {item.description && (
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t pt-4 space-y-3">
                <Label>Add New Question</Label>
                <Input
                  value={newItemQuestion}
                  onChange={(e) => setNewItemQuestion(e.target.value)}
                  placeholder="Enter the question or statement..."
                />
                <Input
                  value={newItemDescription}
                  onChange={(e) => setNewItemDescription(e.target.value)}
                  placeholder="Optional: Additional description or guidance"
                />
                <Button onClick={addItem} disabled={!newItemQuestion.trim()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setItemsDialogOpen(false)}>
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}