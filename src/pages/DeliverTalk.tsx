import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import SignatureCanvas from "react-signature-canvas";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { 
  ArrowLeft,
  ArrowRight,
  Play,
  Users,
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  MapPin,
  Cloud,
  PenLine,
  Loader2
} from "lucide-react";

interface Template {
  id: string;
  title: string;
  category: string;
  description: string | null;
  content: string;
  duration_minutes: number;
}

interface Project {
  id: string;
  name: string;
}

interface Attendee {
  id?: string;
  attendee_name: string;
  attendee_company: string;
  attendee_trade: string;
  signature_data: string | null;
  signed_at: string | null;
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

export default function DeliverTalk() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const signatureRef = useRef<SignatureCanvas>(null);

  const [template, setTemplate] = useState<Template | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"setup" | "deliver" | "attendance">("setup");
  const [submitting, setSubmitting] = useState(false);
  const [isFetchingWeather, setIsFetchingWeather] = useState(false);

  // Talk setup
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [location, setLocation] = useState("");
  const [weatherConditions, setWeatherConditions] = useState("");
  const [notes, setNotes] = useState("");
  const [talkId, setTalkId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

  // Attendees
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [signingIndex, setSigningIndex] = useState<number | null>(null);
  const [newAttendee, setNewAttendee] = useState<Attendee>({
    attendee_name: "",
    attendee_company: "",
    attendee_trade: "",
    signature_data: null,
    signed_at: null,
  });

  useEffect(() => {
    fetchData();
  }, [templateId]);

  const fetchData = async () => {
    if (!templateId) return;

    setLoading(true);
    try {
      // Fetch template
      const { data: templateData, error: templateError } = await supabase
        .from("toolbox_talk_templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (templateError) throw templateError;
      setTemplate(templateData);

      // Fetch projects
      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("id, name")
        .eq("status", "active")
        .order("name");

      if (projectsError) throw projectsError;
      setProjects(projectsData || []);

      // Get organisation ID
      const { data: orgData } = await supabase
        .from("organisation_members")
        .select("organisation_id")
        .eq("profile_id", user?.id)
        .eq("status", "active")
        .maybeSingle();

      if (orgData) {
        setOrgId(orgData.organisation_id);
      }
    } catch (error: any) {
      console.error("Error fetching template:", error);
      toast.error("Failed to load template");
      navigate("/toolbox-talks");
    } finally {
      setLoading(false);
    }
  };

  const fetchWeatherWithAI = async () => {
    // Use project address/name or the location field
    const project = projects.find(p => p.id === selectedProjectId);
    const loc = location || (project as any)?.name;
    if (!loc) {
      toast.error("Please enter a location or select a project first");
      return;
    }

    setIsFetchingWeather(true);
    try {
      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const time = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
      const { data, error } = await supabase.functions.invoke("get-weather", {
        body: { location: loc, date: today },
      });

      if (error) throw error;

      const summary = [
        `${now.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })} ${time}`,
        data.conditions?.join(", "),
        data.temperature_high != null ? `${data.temperature_low}–${data.temperature_high}°C` : null,
        data.weather_impact && data.weather_impact !== "No significant impact expected" ? data.weather_impact : null,
      ].filter(Boolean).join(". ");

      setWeatherConditions(summary || `${data.weather_morning} / ${data.weather_afternoon}`);
      toast.success("Weather auto-filled");
    } catch (error: any) {
      console.error("Error fetching weather:", error);
      toast.error("Failed to fetch weather. Enter manually.");
    } finally {
      setIsFetchingWeather(false);
    }
  };

  const startTalk = async () => {
    if (!template || !orgId || !user) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("toolbox_talks")
        .insert({
          organisation_id: orgId,
          project_id: selectedProjectId || null,
          template_id: template.id,
          title: template.title,
          category: template.category as any,
          content: template.content,
          delivered_by: user.id,
          location: location || null,
          weather_conditions: weatherConditions || null,
          notes: notes || null,
          status: "in_progress",
        })
        .select()
        .single();

      if (error) throw error;

      setTalkId(data.id);
      setStep("deliver");
      toast.success("Talk started");
    } catch (error: any) {
      console.error("Error starting talk:", error);
      toast.error("Failed to start talk");
    } finally {
      setSubmitting(false);
    }
  };

  const addAttendee = () => {
    if (!newAttendee.attendee_name.trim()) {
      toast.error("Please enter attendee name");
      return;
    }

    setAttendees([...attendees, { ...newAttendee }]);
    setNewAttendee({
      attendee_name: "",
      attendee_company: "",
      attendee_trade: "",
      signature_data: null,
      signed_at: null,
    });
  };

  const removeAttendee = (index: number) => {
    setAttendees(attendees.filter((_, i) => i !== index));
  };

  const openSignDialog = (index: number) => {
    setSigningIndex(index);
    setSignDialogOpen(true);
  };

  const saveSignature = () => {
    if (signingIndex === null || !signatureRef.current) return;

    if (signatureRef.current.isEmpty()) {
      toast.error("Please provide a signature");
      return;
    }

    const signatureData = signatureRef.current.toDataURL();
    const updatedAttendees = [...attendees];
    updatedAttendees[signingIndex] = {
      ...updatedAttendees[signingIndex],
      signature_data: signatureData,
      signed_at: new Date().toISOString(),
    };
    setAttendees(updatedAttendees);
    setSignDialogOpen(false);
    setSigningIndex(null);
    toast.success("Signature captured");
  };

  const clearSignature = () => {
    signatureRef.current?.clear();
  };

  const completeTalk = async () => {
    if (!talkId || !orgId) return;

    if (attendees.length === 0) {
      toast.error("Please add at least one attendee");
      return;
    }

    const unsignedAttendees = attendees.filter(a => !a.signature_data);
    if (unsignedAttendees.length > 0) {
      toast.error("All attendees must sign before completing");
      return;
    }

    setSubmitting(true);
    try {
      // Insert attendees
      const attendeesToInsert = attendees.map(a => ({
        toolbox_talk_id: talkId,
        organisation_id: orgId,
        attendee_name: a.attendee_name,
        attendee_company: a.attendee_company || null,
        attendee_trade: a.attendee_trade || null,
        signature_data: a.signature_data,
        signed_at: a.signed_at,
      }));

      const { error: attendeesError } = await supabase
        .from("toolbox_talk_attendees")
        .insert(attendeesToInsert);

      if (attendeesError) throw attendeesError;

      // Update talk status
      const { error: talkError } = await supabase
        .from("toolbox_talks")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", talkId);

      if (talkError) throw talkError;

      toast.success("Toolbox talk completed!");
      navigate(`/toolbox-talks/${talkId}`);
    } catch (error: any) {
      console.error("Error completing talk:", error);
      toast.error("Failed to complete talk");
    } finally {
      setSubmitting(false);
    }
  };

  // Parse markdown content for display
  const renderContent = (content: string) => {
    // Simple markdown rendering
    const lines = content.split("\n");
    return lines.map((line, i) => {
      if (line.startsWith("## ")) {
        return <h2 key={i} className="text-xl font-bold mt-6 mb-3">{line.slice(3)}</h2>;
      }
      if (line.startsWith("### ")) {
        return <h3 key={i} className="text-lg font-semibold mt-4 mb-2">{line.slice(4)}</h3>;
      }
      if (line.startsWith("**") && line.endsWith("**")) {
        return <p key={i} className="font-semibold my-1">{line.slice(2, -2)}</p>;
      }
      if (line.startsWith("- ") || line.startsWith("* ")) {
        return <li key={i} className="ml-4 my-1">{line.slice(2)}</li>;
      }
      if (line.match(/^\d+\./)) {
        return <li key={i} className="ml-4 my-1 list-decimal">{line.replace(/^\d+\.\s*/, "")}</li>;
      }
      if (line.startsWith("✓ ") || line.startsWith("✔ ")) {
        return <li key={i} className="ml-4 my-1 text-success flex items-center gap-2"><CheckCircle className="h-4 w-4" />{line.slice(2)}</li>;
      }
      if (line.startsWith("❌ ")) {
        return <li key={i} className="ml-4 my-1 text-destructive">{line}</li>;
      }
      if (line.trim() === "") {
        return <div key={i} className="h-2" />;
      }
      return <p key={i} className="my-1">{line}</p>;
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (!template) {
    return (
      <DashboardLayout>
        <div className="p-6 text-center">
          <h1 className="text-xl font-semibold">Template not found</h1>
          <Button variant="link" onClick={() => navigate("/toolbox-talks")}>
            Back to Toolbox Talks
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/toolbox-talks")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {CATEGORY_LABELS[template.category] || template.category}
              </Badge>
              <Badge variant="secondary">
                <Clock className="h-3 w-3 mr-1" />
                {template.duration_minutes} mins
              </Badge>
            </div>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {["setup", "deliver", "attendance"].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s ? "bg-primary text-primary-foreground" :
                ["setup", "deliver", "attendance"].indexOf(step) > i ? "bg-success text-success-foreground" :
                "bg-muted text-muted-foreground"
              }`}>
                {["setup", "deliver", "attendance"].indexOf(step) > i ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>
              {i < 2 && <div className="w-12 h-0.5 bg-muted" />}
            </div>
          ))}
        </div>

        {/* Setup Step */}
        {step === "setup" && (
          <Card>
            <CardHeader>
              <CardTitle>{template.title}</CardTitle>
              <CardDescription>
                {template.description || "Configure the talk settings before starting"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="project">Project (optional)</Label>
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
                  <Label htmlFor="location">
                    <MapPin className="h-4 w-4 inline mr-1" />
                    Location
                  </Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g., Site office, Gate 2"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="weather">
                  <Cloud className="h-4 w-4 inline mr-1" />
                  Weather Conditions
                </Label>
                <Input
                  id="weather"
                  value={weatherConditions}
                  onChange={(e) => setWeatherConditions(e.target.value)}
                  placeholder="e.g., Clear, 15°C, light breeze"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchWeatherWithAI}
                  disabled={isFetchingWeather}
                  className="w-full"
                >
                  {isFetchingWeather ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Cloud className="h-4 w-4 mr-2" />
                  )}
                  {isFetchingWeather ? "Fetching weather..." : "Auto-fill with AI"}
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any specific points to cover today..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={startTalk} disabled={submitting}>
                  <Play className="h-4 w-4 mr-2" />
                  Start Talk
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Deliver Step */}
        {step === "deliver" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5 text-primary" />
                {template.title}
              </CardTitle>
              <CardDescription>
                Deliver this talk to your team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none dark:prose-invert mb-8">
                {renderContent(template.content)}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setStep("setup")}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button onClick={() => setStep("attendance")}>
                  Record Attendance
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Attendance Step */}
        {step === "attendance" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Record Attendance
                </CardTitle>
                <CardDescription>
                  Add all attendees and collect their signatures
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add attendee form */}
                <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input
                        value={newAttendee.attendee_name}
                        onChange={(e) => setNewAttendee({ ...newAttendee, attendee_name: e.target.value })}
                        placeholder="Full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Company</Label>
                      <Input
                        value={newAttendee.attendee_company}
                        onChange={(e) => setNewAttendee({ ...newAttendee, attendee_company: e.target.value })}
                        placeholder="Company name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Trade</Label>
                      <Input
                        value={newAttendee.attendee_trade}
                        onChange={(e) => setNewAttendee({ ...newAttendee, attendee_trade: e.target.value })}
                        placeholder="e.g., Electrician"
                      />
                    </div>
                  </div>
                  <Button onClick={addAttendee} variant="secondary">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Attendee
                  </Button>
                </div>

                {/* Attendees list */}
                {attendees.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No attendees added yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {attendees.map((attendee, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            attendee.signature_data ? "bg-success/10" : "bg-muted"
                          }`}>
                            {attendee.signature_data ? (
                              <CheckCircle className="h-5 w-5 text-success" />
                            ) : (
                              <PenLine className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{attendee.attendee_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {[attendee.attendee_company, attendee.attendee_trade]
                                .filter(Boolean)
                                .join(" • ") || "No details"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {attendee.signature_data ? (
                            <Badge variant="default" className="bg-success">Signed</Badge>
                          ) : (
                            <Button size="sm" onClick={() => openSignDialog(index)}>
                              <PenLine className="h-4 w-4 mr-1" />
                              Sign
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeAttendee(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-between pt-4 border-t">
                  <Button variant="outline" onClick={() => setStep("deliver")}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Talk
                  </Button>
                  <Button 
                    onClick={completeTalk} 
                    disabled={submitting || attendees.length === 0 || attendees.some(a => !a.signature_data)}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete Talk
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Signature Dialog */}
            <Dialog open={signDialogOpen} onOpenChange={setSignDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Sign Attendance</DialogTitle>
                  <DialogDescription>
                    {signingIndex !== null && attendees[signingIndex]?.attendee_name}, please sign below to confirm attendance
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <div className="border-2 border-dashed rounded-lg bg-white">
                    <SignatureCanvas
                      ref={signatureRef}
                      canvasProps={{
                        className: "w-full h-48",
                        style: { width: "100%", height: "192px" },
                      }}
                      backgroundColor="white"
                    />
                  </div>
                  <Button variant="ghost" size="sm" onClick={clearSignature} className="mt-2">
                    Clear Signature
                  </Button>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSignDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={saveSignature}>
                    Save Signature
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}