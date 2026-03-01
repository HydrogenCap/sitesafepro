import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Cloud,
  Users,
  CheckCircle,
  Download,
  FileText,
  User
} from "lucide-react";
import { format } from "date-fns";

interface TalkDetail {
  id: string;
  title: string;
  category: string;
  content: string;
  delivered_at: string;
  completed_at: string | null;
  status: string;
  location: string | null;
  weather_conditions: string | null;
  notes: string | null;
  deliverer?: { full_name: string; email: string } | null;
  project?: { name: string; address: string } | null;
}

interface Attendee {
  id: string;
  attendee_name: string;
  attendee_company: string | null;
  attendee_trade: string | null;
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

export default function TalkDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [talk, setTalk] = useState<TalkDetail | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTalk();
  }, [id]);

  const fetchTalk = async () => {
    if (!id) return;

    setLoading(true);
    try {
      // Fetch talk details
      const { data: talkData, error: talkError } = await supabase
        .from("toolbox_talks")
        .select(`
          *,
          deliverer:profiles!toolbox_talks_delivered_by_fkey(full_name, email),
          project:projects(name, address)
        `)
        .eq("id", id)
        .single();

      if (talkError) throw talkError;
      setTalk(talkData as unknown as TalkDetail);

      // Fetch attendees
      const { data: attendeesData, error: attendeesError } = await supabase
        .from("toolbox_talk_attendees")
        .select("*")
        .eq("toolbox_talk_id", id)
        .order("attendee_name");

      if (attendeesError) throw attendeesError;
      setAttendees(attendeesData || []);
    } catch (error: any) {
      console.error("Error fetching talk:", error);
      toast.error("Failed to load talk details");
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    if (!talk) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - 40;
    let yPos = 20;

    const addWrappedText = (text: string, x: number, maxWidth: number, fontSize = 10) => {
      doc.setFontSize(fontSize);
      const lines: string[] = doc.splitTextToSize(text, maxWidth);
      lines.forEach((line: string) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(line, x, yPos);
        yPos += fontSize * 0.5 + 1;
      });
    };

    // Title
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    const titleLines: string[] = doc.splitTextToSize("Toolbox Talk Record", contentWidth);
    titleLines.forEach((line: string) => {
      doc.text(line, pageWidth / 2, yPos, { align: "center" });
      yPos += 10;
    });
    yPos += 5;

    // Talk title
    doc.setFontSize(16);
    const talkTitleLines: string[] = doc.splitTextToSize(talk.title, contentWidth);
    talkTitleLines.forEach((line: string) => {
      doc.text(line, pageWidth / 2, yPos, { align: "center" });
      yPos += 8;
    });
    yPos += 2;

    // Category badge
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Category: ${CATEGORY_LABELS[talk.category] || talk.category}`, pageWidth / 2, yPos, { align: "center" });
    yPos += 15;

    // Details section
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Talk Details", 20, yPos);
    yPos += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    
    const details = [
      `Date: ${format(new Date(talk.delivered_at), "dd MMMM yyyy HH:mm")}`,
      talk.deliverer ? `Delivered by: ${talk.deliverer.full_name}` : null,
      talk.project ? `Project: ${talk.project.name}` : null,
      talk.location ? `Location: ${talk.location}` : null,
      talk.weather_conditions ? `Weather: ${talk.weather_conditions}` : null,
      `Status: ${talk.status === "completed" ? "Completed" : "In Progress"}`,
    ].filter(Boolean) as string[];

    details.forEach(detail => {
      addWrappedText(detail, 20, contentWidth);
      yPos += 1;
    });

    yPos += 10;

    // Attendees section
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`Attendance Register (${attendees.length} attendees)`, 20, yPos);
    yPos += 10;

    // Table headers
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Name", 20, yPos);
    doc.text("Company", 70, yPos);
    doc.text("Trade", 110, yPos);
    doc.text("Signed", 150, yPos);
    yPos += 2;
    doc.line(20, yPos, 190, yPos);
    yPos += 6;

    // Table rows
    doc.setFont("helvetica", "normal");
    attendees.forEach(attendee => {
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }

      doc.text(attendee.attendee_name.substring(0, 25), 20, yPos);
      doc.text((attendee.attendee_company || "-").substring(0, 20), 70, yPos);
      doc.text((attendee.attendee_trade || "-").substring(0, 20), 110, yPos);
      doc.text(attendee.signed_at ? format(new Date(attendee.signed_at), "HH:mm") : "-", 150, yPos);
      
      // Add signature image if available
      if (attendee.signature_data) {
        try {
          doc.addImage(attendee.signature_data, "PNG", 165, yPos - 4, 20, 8);
        } catch (e) {
          // Ignore image errors
        }
      }
      
      yPos += 8;
    });

    // Footer
    yPos = doc.internal.pageSize.getHeight() - 20;
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(`Generated on ${format(new Date(), "dd/MM/yyyy HH:mm")} - Site Safe`, pageWidth / 2, yPos, { align: "center" });

    // Save
    doc.save(`toolbox-talk-${talk.title.replace(/\s+/g, "-").toLowerCase()}-${format(new Date(talk.delivered_at), "yyyy-MM-dd")}.pdf`);
    toast.success("PDF downloaded");
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Skeleton className="h-[400px] rounded-xl" />
            </div>
            <div>
              <Skeleton className="h-[300px] rounded-xl" />
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!talk) {
    return (
      <DashboardLayout>
        <div className="p-6 text-center">
          <h1 className="text-xl font-semibold">Talk not found</h1>
          <Button variant="link" onClick={() => navigate("/toolbox-talks")}>
            Back to Toolbox Talks
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/toolbox-talks")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={talk.status === "completed" ? "default" : "secondary"}>
              {talk.status === "completed" ? (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Completed
                </>
              ) : (
                <>
                  <Clock className="h-3 w-3 mr-1" />
                  In Progress
                </>
              )}
            </Badge>
            <Button variant="outline" size="sm" onClick={generatePDF}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            {talk.title}
          </h1>
          <Badge variant="outline" className="mt-2">
            {CATEGORY_LABELS[talk.category] || talk.category}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Talk Content */}
            <Card>
              <CardHeader>
                <CardTitle>Talk Content</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                  {talk.content}
                </div>
              </CardContent>
            </Card>

            {/* Attendance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Attendance ({attendees.length})
                </CardTitle>
                <CardDescription>
                  All attendees who participated in this talk
                </CardDescription>
              </CardHeader>
              <CardContent>
                {attendees.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No attendees recorded
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Trade</TableHead>
                        <TableHead>Signed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendees.map(attendee => (
                        <TableRow key={attendee.id}>
                          <TableCell className="font-medium">
                            {attendee.attendee_name}
                          </TableCell>
                          <TableCell>{attendee.attendee_company || "-"}</TableCell>
                          <TableCell>{attendee.attendee_trade || "-"}</TableCell>
                          <TableCell>
                            {attendee.signature_data ? (
                              <div className="flex items-center gap-2">
                                <img
                                  src={attendee.signature_data}
                                  alt="Signature"
                                  className="h-8 w-20 object-contain border rounded"
                                />
                                {attendee.signed_at && (
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(attendee.signed_at), "HH:mm")}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Details Card */}
            <Card>
              <CardHeader>
                <CardTitle>Talk Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date & Time</p>
                    <p className="font-medium">
                      {format(new Date(talk.delivered_at), "dd MMM yyyy HH:mm")}
                    </p>
                  </div>
                </div>

                {talk.deliverer && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Delivered By</p>
                      <p className="font-medium">{talk.deliverer.full_name}</p>
                    </div>
                  </div>
                )}

                {talk.project && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Project</p>
                      <p className="font-medium">{talk.project.name}</p>
                    </div>
                  </div>
                )}

                {talk.location && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="font-medium">{talk.location}</p>
                    </div>
                  </div>
                )}

                {talk.weather_conditions && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <Cloud className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Weather</p>
                      <p className="font-medium">{talk.weather_conditions}</p>
                    </div>
                  </div>
                )}

                {talk.completed_at && (
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-success/10 rounded-lg">
                      <CheckCircle className="h-4 w-4 text-success" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Completed</p>
                      <p className="font-medium">
                        {format(new Date(talk.completed_at), "dd MMM yyyy HH:mm")}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes Card */}
            {talk.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {talk.notes}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}