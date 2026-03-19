import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Camera, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useNotifications } from "@/hooks/useNotifications";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { addDays, format } from "date-fns";

interface Project {
  id: string;
  name: string;
}

interface TeamMember {
  id: string;
  full_name: string;
}

interface PendingPhoto {
  file: File;
  preview: string;
  caption: string;
}

const NewAction = () => {
  const { user } = useAuth();
  const { organisation } = useSubscription();
  const { notifyActionAssigned } = useNotifications();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedProjectId = searchParams.get("project");

  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [priority, setPriority] = useState<"critical" | "high" | "medium" | "low">("medium");
  const [source, setSource] = useState("observation");
  const [projectId, setProjectId] = useState(preselectedProjectId || "");
  const [assignedTo, setAssignedTo] = useState("");
  const [assignedToCompany, setAssignedToCompany] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);

  // Fetch projects and team members
  useEffect(() => {
    const fetchData = async () => {
      if (!organisation?.id) return;

      const { data: projectsData } = await supabase
        .from("projects")
        .select("id, name")
        .eq("organisation_id", organisation.id)
        .in("status", ["active", "setup"]);
      setProjects(projectsData || []);

      const { data: membersData } = await supabase
        .from("organisation_members")
        .select("profile_id, profiles:profile_id(id, full_name)")
        .eq("organisation_id", organisation.id)
        .eq("status", "active");

      const members = membersData
        ?.map((m: any) => m.profiles)
        .filter(Boolean) as TeamMember[];
      setTeamMembers(members || []);
    };

    fetchData();
  }, [organisation?.id]);

  // Auto-suggest due date based on priority
  useEffect(() => {
    const today = new Date();
    let suggestedDate: Date;

    switch (priority) {
      case "critical":
        suggestedDate = today;
        break;
      case "high":
        suggestedDate = addDays(today, 1);
        break;
      case "medium":
        suggestedDate = addDays(today, 7);
        break;
      case "low":
        suggestedDate = addDays(today, 14);
        break;
      default:
        suggestedDate = addDays(today, 7);
    }

    setDueDate(format(suggestedDate, "yyyy-MM-dd"));
  }, [priority]);

  // Handle photo upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos: PendingPhoto[] = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      caption: "",
    }));

    setPhotos((prev) => [...prev, ...newPhotos]);
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const newPhotos = [...prev];
      URL.revokeObjectURL(newPhotos[index].preview);
      newPhotos.splice(index, 1);
      return newPhotos;
    });
  };

  const updatePhotoCaption = (index: number, caption: string) => {
    setPhotos((prev) => {
      const newPhotos = [...prev];
      newPhotos[index] = { ...newPhotos[index], caption };
      return newPhotos;
    });
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim() || !projectId || !dueDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!organisation?.id || !user?.id) {
      toast.error("Session error. Please refresh and try again.");
      return;
    }

    setLoading(true);

    try {
      // Create the action
      const { data: action, error: actionError } = await supabase
        .from("corrective_actions")
        .insert({
          organisation_id: organisation.id,
          project_id: projectId,
          title: title.trim(),
          description: description.trim(),
          location_on_site: location.trim() || null,
          priority,
          source: source as any,
          status: "open",
          raised_by: user.id,
          assigned_to: assignedTo || null,
          assigned_to_company: assignedToCompany.trim() || null,
          due_date: dueDate,
        })
        .select()
        .single();

      if (actionError) throw actionError;

      // Upload photos if any
      if (photos.length > 0 && action) {
        for (const photo of photos) {
          const filePath = `${organisation.id}/${action.id}/${Date.now()}_${photo.file.name}`;

          const { error: uploadError } = await supabase.storage
            .from("action-evidence")
            .upload(filePath, photo.file);

          if (uploadError) {
            console.error("Photo upload error:", uploadError);
            continue;
          }

          await supabase.from("action_evidence").insert({
            action_id: action.id,
            organisation_id: organisation.id,
            file_path: filePath,
            file_size: photo.file.size,
            mime_type: photo.file.type,
            evidence_type: "before",
            caption: photo.caption || null,
            uploaded_by: user.id,
          });
        }
      }

      // Add initial comment for audit trail
      if (action) {
        await supabase.from("action_comments").insert({
          action_id: action.id,
          organisation_id: organisation.id,
          author_id: user.id,
          content: "Action raised",
          is_status_change: true,
          old_status: null,
          new_status: "open",
        });

        // Send notification to assignee (if assigned to a team member)
        if (assignedTo && action) {
          const projectName = projects.find((p) => p.id === projectId)?.name || "Project";
          notifyActionAssigned(
            assignedTo,
            action.id,
            title,
            projectName,
            priority,
            dueDate
          ).catch((err) => console.error("Failed to send action notification:", err));
        }
      }

      toast.success("Action raised successfully");
      navigate(`/actions/${action.id}`);
    } catch (error) {
      console.error("Error creating action:", error);
      toast.error("Failed to raise action");
    } finally {
      setLoading(false);
    }
  };

  const priorityOptions = [
    {
      value: "critical",
      label: "Critical",
      description: "Immediate danger. Stop work in affected area.",
      color: "text-red-500",
      dot: "bg-red-500",
    },
    {
      value: "high",
      label: "High",
      description: "Serious risk. Must be addressed within 24 hours.",
      color: "text-orange-500",
      dot: "bg-orange-500",
    },
    {
      value: "medium",
      label: "Medium",
      description: "Moderate risk. Address within the week.",
      color: "text-amber-500",
      dot: "bg-amber-500",
    },
    {
      value: "low",
      label: "Low",
      description: "Minor issue. Address when practical.",
      color: "text-gray-500",
      dot: "bg-gray-400",
    },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 max-w-2xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/actions")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Actions
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl p-6 shadow-sm border border-border"
        >
          <h1 className="text-2xl font-bold text-foreground mb-2">Raise Action</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Report a safety issue that needs to be addressed
          </p>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Section 1: What's the problem? */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                What's the problem?
              </h2>

              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Missing edge protection on 2nd floor opening"
                  maxLength={100}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the hazard, its location, and the risk if not addressed"
                  rows={4}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="location">Location on site</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. 2nd floor, east elevation, near stairwell opening"
                  className="mt-1.5"
                />
              </div>

              {/* Photo evidence */}
              <div>
                <Label>Photo evidence</Label>
                <div className="mt-1.5">
                  <label className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:border-primary/50 transition-colors">
                    <Camera className="h-6 w-6 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Tap to take photo or upload
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {photos.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                    {photos.map((photo, index) => (
                      <div key={index} className="relative">
                        <img
                          src={photo.preview}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute -top-2 -right-2 h-6 w-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <Input
                          placeholder="Caption (optional)"
                          value={photo.caption}
                          onChange={(e) => updatePhotoCaption(index, e.target.value)}
                          className="mt-2 text-xs h-8"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Section 2: Classification */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Classification</h2>

              <div>
                <Label>Priority *</Label>
                <RadioGroup
                  value={priority}
                  onValueChange={(v) => setPriority(v as any)}
                  className="mt-2 space-y-2"
                >
                  {priorityOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        priority === option.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                      }`}
                    >
                      <RadioGroupItem value={option.value} className="mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`h-3 w-3 rounded-full ${option.dot}`} />
                          <span className={`font-medium ${option.color}`}>
                            {option.label}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {option.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="source">Source</Label>
                  <Select value={source} onValueChange={setSource}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inspection">Inspection</SelectItem>
                      <SelectItem value="incident">Incident</SelectItem>
                      <SelectItem value="audit">Audit</SelectItem>
                      <SelectItem value="toolbox_talk">Toolbox Talk</SelectItem>
                      <SelectItem value="observation">Observation</SelectItem>
                      <SelectItem value="near_miss">Near Miss</SelectItem>
                      <SelectItem value="client_request">Client Request</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="project">Project *</Label>
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Section 3: Assignment & Deadline */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                Assignment & Deadline
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="assignedTo">Assign to</Label>
                  <Select 
                    value={assignedTo || "unassigned"} 
                    onValueChange={(v) => setAssignedTo(v === "unassigned" ? "" : v)}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="assignedToCompany">Or assign to company</Label>
                  <Input
                    id="assignedToCompany"
                    value={assignedToCompany}
                    onChange={(e) => setAssignedToCompany(e.target.value)}
                    placeholder="Company name"
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="dueDate">Due date *</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Auto-suggested based on priority. You can override.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/actions")}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Raise Action
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default NewAction;
