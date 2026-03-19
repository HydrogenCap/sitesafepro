import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { RamsFormData } from "../types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Building2, MapPin, User } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Step1Props {
  formData: RamsFormData;
  updateFormData: (updates: Partial<RamsFormData>) => void;
}

export function Step1ProjectDetails({ formData, updateFormData }: Step1Props) {
  const { user } = useAuth();

  // Fetch projects
  const { data: projects } = useQuery({
    queryKey: ["projects-for-rams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, address, client_name, principal_designer")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch current user profile
  const { data: profile } = useQuery({
    queryKey: ["current-user-profile"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Generate RAMS reference on mount if not set
  useEffect(() => {
    if (!formData.ramsReference) {
      const generateReference = async () => {
        const { count } = await supabase
          .from("rams_records")
          .select("*", { count: "exact", head: true });
        const nextNumber = (count || 0) + 1;
        updateFormData({
          ramsReference: `RAMS-${String(nextNumber).padStart(3, "0")}`,
        });
      };
      generateReference();
    }
  }, []);

  // Auto-fill project details when project is selected
  const handleProjectChange = (projectId: string) => {
    const project = projects?.find((p) => p.id === projectId);
    if (project) {
      updateFormData({
        projectId,
        siteName: project.name,
        siteAddress: project.address || "",
        clientName: project.client_name || "",
        principalContractor: project.principal_designer || "",
        title: formData.title || `RAMS — ${project.name}`,
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Project & Site Details
          </CardTitle>
          <CardDescription>
            Select the project and provide work details for this RAMS
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Project Selection */}
          <div className="space-y-2">
            <Label htmlFor="project">Project *</Label>
            <Select
              value={formData.projectId}
              onValueChange={handleProjectChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects?.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Auto-filled fields (read-only) */}
          {formData.projectId && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Site Name</Label>
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {formData.siteName || "—"}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Site Address</Label>
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {formData.siteAddress || "—"}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Client</Label>
                <div className="p-2 bg-muted rounded-md text-sm">
                  {formData.clientName || "—"}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Principal Designer</Label>
                <div className="p-2 bg-muted rounded-md text-sm">
                  {formData.principalContractor || "—"}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>RAMS Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">RAMS Title *</Label>
            <Input
              id="title"
              placeholder="e.g. RAMS — Scaffolding Works — Ivy House"
              value={formData.title}
              onChange={(e) => updateFormData({ title: e.target.value })}
            />
          </div>

          {/* Reference (read-only) */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">RAMS Reference</Label>
            <div className="p-2 bg-muted rounded-md text-sm font-mono">
              {formData.ramsReference}
            </div>
          </div>

          {/* Work Description */}
          <div className="space-y-2">
            <Label htmlFor="workDescription">Work Description *</Label>
            <Textarea
              id="workDescription"
              placeholder="Describe the work to be carried out in detail. Include scope, location, duration, and any specific considerations."
              value={formData.workDescription}
              onChange={(e) => updateFormData({ workDescription: e.target.value })}
              rows={4}
            />
          </div>

          {/* Work Location & Duration */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="workLocation">Work Location</Label>
              <Input
                id="workLocation"
                placeholder="e.g. External elevations, ground to 2nd floor level"
                value={formData.workLocation}
                onChange={(e) => updateFormData({ workLocation: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workDuration">Estimated Duration</Label>
              <Input
                id="workDuration"
                placeholder="e.g. 3 weeks"
                value={formData.workDuration}
                onChange={(e) => updateFormData({ workDuration: e.target.value })}
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Assessment Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.assessmentDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.assessmentDate ? (
                      format(formData.assessmentDate, "PPP")
                    ) : (
                      "Select date"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.assessmentDate}
                    onSelect={(date) => date && updateFormData({ assessmentDate: date })}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Review Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.reviewDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.reviewDate ? (
                      format(formData.reviewDate, "PPP")
                    ) : (
                      "Select date"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.reviewDate || undefined}
                    onSelect={(date) => updateFormData({ reviewDate: date || null })}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Prepared By (read-only) */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Prepared By</Label>
            <div className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              {profile?.full_name || user?.email || "Current User"}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
