import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { toast } from "sonner";
import {
  Plus,
  Search,
  FolderOpen,
  MapPin,
  Calendar,
  Users,
  MoreVertical,
  Building2,
  AlertCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Project {
  id: string;
  name: string;
  address: string | null;
  client_name: string | null;
  status: "active" | "completed" | "archived";
  start_date: string | null;
  estimated_end_date: string | null;
  created_at: string;
}

const Projects = () => {
  const { user, loading: authLoading } = useAuth();
  const { projectLimit, loading: subLoading } = useSubscription();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchProjects = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setProjects(data || []);
      } catch (error) {
        console.error("Error fetching projects:", error);
        toast.error("Failed to load projects");
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [user]);

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.client_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeProjects = projects.filter((p) => p.status === "active");
  const canCreateProject = activeProjects.length < projectLimit;

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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (authLoading || subLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Projects</h1>
            <p className="text-sm text-muted-foreground">
              {activeProjects.length} of {projectLimit === 999 ? "∞" : projectLimit} active projects
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {canCreateProject ? (
              <Button asChild>
                <Link to="/projects/new">
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Link>
              </Button>
            ) : (
              <Button disabled title="Project limit reached">
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            )}
          </div>
        </div>

        {/* Limit warning */}
        {!canCreateProject && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-accent/10 border border-accent/20 rounded-lg p-4 mb-6 flex items-center gap-3"
          >
            <AlertCircle className="h-5 w-5 text-accent" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                Project limit reached
              </p>
              <p className="text-sm text-muted-foreground">
                Upgrade your plan to create more projects.
              </p>
            </div>
            <Link to="/#pricing">
              <Button variant="outline" size="sm">
                Upgrade Plan
              </Button>
            </Link>
          </motion.div>
        )}

        {/* Projects grid */}
        {filteredProjects.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link to={`/projects/${project.id}`}>
                  <div className="bg-card rounded-xl p-6 border border-border hover:border-primary/30 hover:shadow-md transition-all group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center group-hover:bg-primary transition-colors">
                        <Building2 className="h-6 w-6 text-primary group-hover:text-primary-foreground transition-colors" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusColor(
                            project.status
                          )}`}
                        >
                          {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="p-1 rounded hover:bg-muted"
                              onClick={(e) => e.preventDefault()}
                            >
                              <MoreVertical className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Edit Project</DropdownMenuItem>
                            <DropdownMenuItem>Archive</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    <h3 className="font-semibold text-foreground mb-2 line-clamp-1">
                      {project.name}
                    </h3>

                    {project.address && (
                      <div className="flex items-start gap-2 text-sm text-muted-foreground mb-3">
                        <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{project.address}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-3 border-t border-border">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{formatDate(project.start_date)}</span>
                      </div>
                      {project.client_name && (
                        <div className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          <span className="truncate max-w-[100px]">{project.client_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl border-2 border-dashed border-border p-12 text-center"
          >
            <div className="h-16 w-16 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
              <FolderOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {searchQuery ? "No projects found" : "No projects yet"}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {searchQuery
                ? "Try adjusting your search query"
                : "Create your first project to start managing site safety compliance."}
            </p>
            {!searchQuery && canCreateProject && (
              <Button asChild>
                <Link to="/projects/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Project
                </Link>
              </Button>
            )}
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Projects;
