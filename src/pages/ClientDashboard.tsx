import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ClientLayout } from "@/components/client/ClientLayout";
import { useClientPortal } from "@/contexts/ClientPortalContext";
import { useClientProjects } from "@/hooks/useClientProjects";
import { ComplianceScoreGauge } from "@/components/client/ComplianceScoreGauge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  AlertTriangle,
  Users,
  BookOpen,
  ArrowRight,
  MapPin,
  Building2,
} from "lucide-react";

const roleLabels: Record<string, string> = {
  client: "Client",
  principal_designer: "Principal Designer",
  cdm_advisor: "CDM Advisor",
  building_control: "Building Control",
};

const statusColors: Record<string, string> = {
  active: "bg-green-500/10 text-green-700 border-green-500/20",
  setup: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  completed: "bg-gray-500/10 text-gray-700 border-gray-500/20",
  on_hold: "bg-amber-500/10 text-amber-700 border-amber-500/20",
};

export default function ClientDashboard() {
  const navigate = useNavigate();
  const { clientUser, organisation, logActivity } = useClientPortal();
  const { data: projects, isLoading } = useClientProjects();

  useEffect(() => {
    logActivity("viewed_dashboard");
  }, [logActivity]);

  // If client has access to only one project, redirect directly
  useEffect(() => {
    if (!isLoading && projects?.length === 1) {
      navigate(`/client/project/${projects[0].id}`);
    }
  }, [isLoading, projects, navigate]);

  if (isLoading) {
    return (
      <ClientLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48 mb-8" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 rounded-lg" />
            ))}
          </div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">
            Welcome, {clientUser?.full_name}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-muted-foreground">{clientUser?.company_name}</span>
            <Badge variant="outline">
              {roleLabels[clientUser?.role || "client"]}
            </Badge>
          </div>
        </div>

        {/* Organisation Info */}
        {organisation && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold">{organisation.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    Viewing {projects?.length || 0} project{projects?.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Projects Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects?.map((project) => (
            <Card 
              key={project.id} 
              className="hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => navigate(`/client/project/${project.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">
                      {project.name}
                    </CardTitle>
                    {project.address && (
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{project.address}</span>
                      </CardDescription>
                    )}
                  </div>
                  <Badge 
                    variant="outline" 
                    className={statusColors[project.status || "active"]}
                  >
                    {project.status?.replace("_", " ") || "Active"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {/* Compliance Score */}
                <div className="flex justify-center py-4">
                  <ComplianceScoreGauge score={project.complianceScore} size="md" />
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>
                      <span className="font-medium">{project.stats.acknowledgedCount}</span>
                      <span className="text-muted-foreground">/{project.stats.documentCount} docs</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <AlertTriangle className={`h-4 w-4 ${
                      project.stats.overdueActions > 0 ? "text-red-500" : "text-muted-foreground"
                    }`} />
                    <span className={project.stats.overdueActions > 0 ? "text-red-600" : ""}>
                      {project.stats.openActions} open
                      {project.stats.overdueActions > 0 && `, ${project.stats.overdueActions} overdue`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {project.stats.lastWorkforceCount} on site
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <BookOpen className={`h-4 w-4 ${
                      project.stats.diaryMissingDays > 0 ? "text-amber-500" : "text-muted-foreground"
                    }`} />
                    <span className={project.stats.diaryMissingDays > 0 ? "text-amber-600" : ""}>
                      {project.stats.diaryMissingDays === 0 
                        ? "Up to date" 
                        : `${project.stats.diaryMissingDays} days missing`
                      }
                    </span>
                  </div>
                </div>

                {/* View Project Link */}
                <Button 
                  variant="ghost" 
                  className="w-full mt-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                >
                  View Project
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {projects?.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Projects Available</h3>
              <p className="text-muted-foreground">
                You don't have access to any projects yet. Contact your contractor for access.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </ClientLayout>
  );
}
