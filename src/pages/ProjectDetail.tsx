import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { EditProjectDialog } from "@/components/projects/EditProjectDialog";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Calendar,
  Users,
  FileText,
  QrCode,
  ClipboardList,
  HardHat,
  Edit,
  MoreVertical,
  Plus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface Project {
  id: string;
  name: string;
  address: string | null;
  client_name: string | null;
  principal_designer: string | null;
  status: "active" | "completed" | "archived";
  start_date: string | null;
  estimated_end_date: string | null;
  created_at: string;
  image_url: string | null;
}

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    const fetchProject = async () => {
      if (!id) return;

      try {
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        setProject(data);
      } catch (error) {
        console.error("Error fetching project:", error);
        toast.error("Failed to load project");
        navigate("/projects");
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [id, navigate]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-success/10 text-success";
      case "completed":
        return "bg-primary/10 text-primary";
      case "archived":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!project) return null;

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "Upload Document":
        navigate(`/documents?project=${project.id}`);
        break;
      case "Generate QR":
        navigate("/site-access");
        break;
      case "Add Contractor":
        navigate("/team");
        break;
      case "New Permit":
        toast.info("Permits module coming soon", {
          description: "This feature is available in the Professional tier.",
        });
        break;
    }
  };

  const quickActions = [
    { icon: FileText, label: "Upload Document", description: "Add RAMS or safety docs" },
    { icon: QrCode, label: "Generate QR", description: "Create site access code" },
    { icon: Users, label: "Add Contractor", description: "Invite to this project" },
    { icon: ClipboardList, label: "New Permit", description: "Create permit to work" },
  ];

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/projects")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>

          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              {project.image_url ? (
                <img
                  src={project.image_url}
                  alt={project.name}
                  className="h-16 w-16 rounded-xl object-cover"
                />
              ) : (
                <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-foreground">
                    {project.name}
                  </h1>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusColor(
                      project.status
                    )}`}
                  >
                    {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                  </span>
                </div>
                {project.address && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {project.address}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Project
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Mark as Completed</DropdownMenuItem>
                  <DropdownMenuItem>Archive Project</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">
                    Delete Project
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Project details card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl p-6 shadow-sm border border-border mb-8"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Project Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Client</p>
              <p className="font-medium text-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                {project.client_name || "Not specified"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Principal Designer</p>
              <p className="font-medium text-foreground flex items-center gap-2">
                <HardHat className="h-4 w-4 text-muted-foreground" />
                {project.principal_designer || "Not specified"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Start Date</p>
              <p className="font-medium text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {formatDate(project.start_date)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Estimated End Date</p>
              <p className="font-medium text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {formatDate(project.estimated_end_date)}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Quick actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleQuickAction(action.label)}
                className="bg-card p-4 rounded-xl border border-border hover:border-primary/30 hover:shadow-md transition-all text-left group"
              >
                <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center mb-3 group-hover:bg-primary transition-colors">
                  <action.icon className="h-5 w-5 text-primary group-hover:text-primary-foreground transition-colors" />
                </div>
                <h4 className="font-semibold text-foreground text-sm mb-1">
                  {action.label}
                </h4>
                <p className="text-xs text-muted-foreground">{action.description}</p>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Tabs for different sections */}
        <Tabs defaultValue="documents" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="contractors">Contractors</TabsTrigger>
            <TabsTrigger value="permits">Permits</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="documents">
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
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </motion.div>
          </TabsContent>

          <TabsContent value="contractors">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-xl border-2 border-dashed border-border p-12 text-center"
            >
              <div className="h-16 w-16 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No contractors assigned
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Add contractors to this project so they can access documents and sign inductions.
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Contractor
              </Button>
            </motion.div>
          </TabsContent>

          <TabsContent value="permits">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-xl border-2 border-dashed border-border p-12 text-center"
            >
              <div className="h-16 w-16 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
                <ClipboardList className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No permits to work
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Create permits for high-risk activities like hot works, confined spaces, or working at height.
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Permit
              </Button>
            </motion.div>
          </TabsContent>

          <TabsContent value="activity">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-xl p-6 border border-border"
            >
              <p className="text-muted-foreground text-center py-8">
                Project activity will appear here once you start adding documents, contractors, and permits.
              </p>
            </motion.div>
          </TabsContent>
        </Tabs>

        {/* Edit Project Dialog */}
        {project && (
          <EditProjectDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            project={project}
            onProjectUpdated={(updatedProject) => setProject(updatedProject as Project)}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default ProjectDetail;
