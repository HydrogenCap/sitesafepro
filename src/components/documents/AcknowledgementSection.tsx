import { useState, useEffect, useRef, useCallback } from "react";
import SignatureCanvas from "react-signature-canvas";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import jsPDF from "jspdf";
import {
  PenTool,
  CheckCircle,
  Eraser,
  Download,
  Loader2,
  Users,
} from "lucide-react";

interface AcknowledgementSectionProps {
  documentId: string;
  organisationId: string;
  isAdmin: boolean;
  hasAcknowledged: boolean;
  onAcknowledged: () => void;
}

interface Acknowledgement {
  id: string;
  profile_id: string;
  full_name: string;
  company_name: string | null;
  signature_data: string;
  acknowledged_at: string;
}

interface TeamMember {
  profile_id: string;
  full_name: string;
  email: string;
  role: string;
}

export const AcknowledgementSection = ({
  documentId,
  organisationId,
  isAdmin,
  hasAcknowledged,
  onAcknowledged,
}: AcknowledgementSectionProps) => {
  const { user } = useAuth();
  const sigCanvasRef = useRef<SignatureCanvas>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [acknowledgements, setAcknowledgements] = useState<Acknowledgement[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [userProfile, setUserProfile] = useState<{ full_name: string; organisation_name: string } | null>(null);

  // Form state
  const [confirmed, setConfirmed] = useState(false);
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [hasSigned, setHasSigned] = useState(false);

  // Fetch acknowledgements and team members
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        // Fetch existing acknowledgements
        const { data: ackData } = await supabase
          .from("document_acknowledgements")
          .select("*")
          .eq("document_id", documentId)
          .order("acknowledged_at", { ascending: false });

        setAcknowledgements((ackData as Acknowledgement[]) || []);

        // Fetch team members for progress tracking (admin only)
        if (isAdmin) {
          const { data: members } = await supabase
            .from("organisation_members")
            .select(`
              profile_id,
              role,
              profiles:profiles!organisation_members_profile_id_fkey(full_name, email)
            `)
            .eq("organisation_id", organisationId)
            .eq("status", "active")
            .in("role", ["contractor", "site_manager"]);

          if (members) {
            setTeamMembers(
              members.map((m: any) => ({
                profile_id: m.profile_id,
                full_name: m.profiles?.full_name || "Unknown",
                email: m.profiles?.email || "",
                role: m.role,
              }))
            );
          }
        }

        // Fetch user profile for pre-filling form
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();

        const { data: org } = await supabase
          .from("organisations")
          .select("name")
          .eq("id", organisationId)
          .single();

        if (profile && org) {
          setUserProfile({
            full_name: profile.full_name,
            organisation_name: org.name,
          });
          setFullName(profile.full_name);
          setCompanyName(org.name);
        }
      } catch (error) {
        console.error("Error fetching acknowledgement data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [documentId, organisationId, user, isAdmin]);

  const handleClearSignature = () => {
    sigCanvasRef.current?.clear();
    setHasSigned(false);
  };

  const handleSignatureEnd = () => {
    setHasSigned(!sigCanvasRef.current?.isEmpty());
  };

  const handleSubmit = async () => {
    if (!user || !confirmed || !hasSigned || !fullName.trim()) {
      toast.error("Please complete all required fields");
      return;
    }

    setSubmitting(true);

    try {
      const signatureData = sigCanvasRef.current?.toDataURL("image/png") || "";

      // Get IP address
      let ipAddress = null;
      try {
        const ipResponse = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipResponse.json();
        ipAddress = ipData.ip;
      } catch {
        // IP fetch failed, continue without it
      }

      const { error } = await supabase.from("document_acknowledgements").insert({
        document_id: documentId,
        profile_id: user.id,
        organisation_id: organisationId,
        full_name: fullName.trim(),
        company_name: companyName.trim() || null,
        signature_data: signatureData,
        ip_address: ipAddress,
        user_agent: navigator.userAgent,
      });

      if (error) throw error;

      toast.success("Document acknowledged successfully!");
      onAcknowledged();
    } catch (error) {
      console.error("Error submitting acknowledgement:", error);
      toast.error("Failed to submit acknowledgement");
    } finally {
      setSubmitting(false);
    }
  };

  const generatePdfReport = useCallback(async () => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();

    // Header
    pdf.setFontSize(18);
    pdf.text("Document Acknowledgement Report", pageWidth / 2, 20, { align: "center" });

    pdf.setFontSize(10);
    pdf.text(`Generated on ${format(new Date(), "d MMMM yyyy, HH:mm")}`, pageWidth / 2, 28, { align: "center" });

    // Summary
    pdf.setFontSize(12);
    pdf.text(`Total Acknowledgements: ${acknowledgements.length}`, 20, 45);

    // Table header
    let y = 60;
    pdf.setFillColor(240, 240, 240);
    pdf.rect(15, y - 5, pageWidth - 30, 10, "F");
    pdf.setFontSize(10);
    pdf.text("Name", 20, y);
    pdf.text("Company", 70, y);
    pdf.text("Date", 130, y);
    pdf.text("Signature", 160, y);

    y += 12;

    // Table rows
    for (const ack of acknowledgements) {
      if (y > 270) {
        pdf.addPage();
        y = 20;
      }

      pdf.text(ack.full_name.substring(0, 25), 20, y);
      pdf.text((ack.company_name || "—").substring(0, 25), 70, y);
      pdf.text(format(new Date(ack.acknowledged_at), "d MMM yyyy"), 130, y);

      // Add signature image
      if (ack.signature_data) {
        try {
          pdf.addImage(ack.signature_data, "PNG", 160, y - 5, 30, 10);
        } catch {
          pdf.text("[Signature]", 160, y);
        }
      }

      y += 15;
    }

    // Footer
    pdf.setFontSize(8);
    pdf.text("Generated by Site Safe", pageWidth / 2, 290, { align: "center" });

    pdf.save("acknowledgement-report.pdf");
  }, [acknowledgements]);

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Admin view - show progress
  if (isAdmin) {
    const acknowledgedIds = new Set(acknowledgements.map((a) => a.profile_id));
    const pendingMembers = teamMembers.filter((m) => !acknowledgedIds.has(m.profile_id));
    const progress = teamMembers.length > 0
      ? Math.round((acknowledgements.length / teamMembers.length) * 100)
      : 0;

    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Acknowledgement Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {acknowledgements.length} of {teamMembers.length} signed
              </span>
              <span className="font-medium text-primary">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Signed list */}
          {acknowledgements.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Signed</p>
              {acknowledgements.map((ack) => (
                <div
                  key={ack.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-success/5 border border-success/20"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{ack.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {ack.company_name} • {format(new Date(ack.acknowledged_at), "d MMM yyyy")}
                    </p>
                  </div>
                  {ack.signature_data && (
                    <img
                      src={ack.signature_data}
                      alt="Signature"
                      className="h-8 w-auto opacity-80"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pending list */}
          {pendingMembers.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Pending</p>
              {pendingMembers.map((member) => (
                <div
                  key={member.profile_id}
                  className="flex items-center justify-between p-2 rounded-lg bg-accent/5 border border-accent/20"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{member.full_name}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                  <span className="text-xs text-accent font-medium">Pending</span>
                </div>
              ))}
            </div>
          )}

          {/* Export button */}
          {acknowledgements.length > 0 && (
            <Button variant="outline" className="w-full" onClick={generatePdfReport}>
              <Download className="h-4 w-4 mr-2" />
              Export Acknowledgement Report
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // User has already acknowledged
  if (hasAcknowledged) {
    const userAck = acknowledgements.find((a) => a.profile_id === user?.id);

    return (
      <Card className="bg-card border-border border-success/30">
        <CardContent className="p-6 text-center">
          <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Document Acknowledged
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            You acknowledged this document on{" "}
            {userAck && format(new Date(userAck.acknowledged_at), "d MMMM yyyy 'at' HH:mm")}
          </p>
          {userAck?.signature_data && (
            <div className="bg-muted/30 rounded-lg p-4">
              <img
                src={userAck.signature_data}
                alt="Your signature"
                className="h-16 mx-auto opacity-80"
              />
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-4">
            This acknowledgement is permanently recorded
          </p>
        </CardContent>
      </Card>
    );
  }

  // Signature form for contractors
  return (
    <Card className="bg-card border-border border-accent/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-accent">
          <PenTool className="h-4 w-4" />
          Document Acknowledgement Required
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Confirmation checkbox */}
        <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
          <Checkbox
            id="confirm"
            checked={confirmed}
            onCheckedChange={(checked) => setConfirmed(checked as boolean)}
          />
          <label htmlFor="confirm" className="text-sm text-foreground leading-relaxed cursor-pointer">
            I confirm that I have read and understood this document and will comply with its contents.
          </label>
        </div>

        {/* Name fields */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Company name"
            />
          </div>
        </div>

        {/* Signature pad */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Signature *</Label>
            <Button variant="ghost" size="sm" onClick={handleClearSignature}>
              <Eraser className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>
          <div className="border-2 border-dashed border-border rounded-lg overflow-hidden bg-white">
            <SignatureCanvas
              ref={sigCanvasRef}
              penColor="black"
              canvasProps={{
                width: 400,
                height: 150,
                className: "w-full",
              }}
              onEnd={handleSignatureEnd}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Draw your signature in the box above
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed mt-1">
            By signing you confirm intent to be legally bound by this acknowledgement in accordance with the Electronic Communications Act 2000 and eIDAS Regulation (EU) No 910/2014, as retained in UK law.
          </p>
        </div>

        {/* Date */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <span className="text-sm text-muted-foreground">Date & Time</span>
          <span className="text-sm font-medium text-foreground">
            {format(new Date(), "d MMMM yyyy, HH:mm")}
          </span>
        </div>

        {/* Submit button */}
        <Button
          className="w-full"
          disabled={!confirmed || !hasSigned || !fullName.trim() || submitting}
          onClick={handleSubmit}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <PenTool className="h-4 w-4 mr-2" />
              Submit Acknowledgement
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
