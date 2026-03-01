import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Building2, CheckCircle, AlertTriangle, Loader2, PenLine, X, Users,
} from "lucide-react";
import { format } from "date-fns";

interface TalkInfo {
  id: string;
  title: string;
  category: string;
  delivered_at: string;
  location: string | null;
  status: string;
  project: { name: string } | null;
  organisation: { name: string; logo_url: string | null } | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  working_at_height: "Working at Height", manual_handling: "Manual Handling",
  fire_safety: "Fire Safety", electrical_safety: "Electrical Safety",
  ppe: "PPE", scaffolding: "Scaffolding", asbestos: "Asbestos",
  hazardous_substances: "COSHH", general_safety: "General Safety", other: "Other",
};

const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/toolbox-attendance`;
const API_KEY  = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export default function ToolboxAttendance() {
  const { token } = useParams<{ token: string }>();
  const sigRef = useRef<SignatureCanvas>(null);

  const [loading, setLoading]   = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [talk, setTalk]         = useState<TalkInfo | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [done, setDone]         = useState(false);

  const [name, setName]         = useState("");
  const [company, setCompany]   = useState("");
  const [trade, setTrade]       = useState("");

  useEffect(() => {
    if (!token) { setError("Invalid QR code link"); setLoading(false); return; }
    fetch(`${API_BASE}?token=${encodeURIComponent(token)}`, {
      headers: { apikey: API_KEY },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); }
        else { setTalk(d.talk); }
      })
      .catch(() => setError("Failed to load talk details"))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Please enter your name"); return; }
    if (!sigRef.current || sigRef.current.isEmpty()) {
      toast.error("Please sign the attendance register"); return;
    }

    setSubmitting(true);
    try {
      const signature_data = sigRef.current.toDataURL();
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: API_KEY },
        body: JSON.stringify({ token, attendee_name: name, attendee_company: company, attendee_trade: trade, signature_data }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");
      setDone(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit attendance");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-3">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-lg font-semibold">Invalid QR Code</h2>
            <p className="text-muted-foreground text-sm">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-xl font-bold">Attendance Recorded</h2>
            <p className="text-muted-foreground">
              Thank you, <strong>{name}</strong>. Your attendance at<br />
              <strong>{talk?.title}</strong> has been saved.
            </p>
            <p className="text-sm text-muted-foreground">You can now close this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted py-8 px-4">
      <div className="max-w-lg mx-auto space-y-4">

        {/* Header */}
        <div className="text-center space-y-2">
          {talk?.organisation?.logo_url ? (
            <img src={talk.organisation.logo_url} alt={talk.organisation.name} className="h-10 mx-auto mb-2" />
          ) : (
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
          )}
          <h1 className="text-lg font-bold">{talk?.organisation?.name}</h1>
          {talk?.project && <p className="text-sm text-muted-foreground">{talk.project.name}</p>}
        </div>

        {/* Talk info banner */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm leading-tight">{talk?.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {CATEGORY_LABELS[talk?.category ?? ""] || talk?.category}
                  {talk?.delivered_at && <> · {format(new Date(talk.delivered_at), "dd MMM yyyy, HH:mm")}</>}
                  {talk?.location && <> · {talk.location}</>}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance form */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Sign Attendance Register</CardTitle>
            <CardDescription>
              Enter your details and sign below to confirm you attended this toolbox talk.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Your employer"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trade">Trade</Label>
                  <Input
                    id="trade"
                    value={trade}
                    onChange={(e) => setTrade(e.target.value)}
                    placeholder="e.g. Electrician"
                  />
                </div>
              </div>

              {/* Signature */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5">
                    <PenLine className="h-4 w-4" />
                    Signature <span className="text-destructive">*</span>
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 text-muted-foreground"
                    onClick={() => sigRef.current?.clear()}
                  >
                    <X className="h-3 w-3" />Clear
                  </Button>
                </div>
                <div className="border-2 border-dashed rounded-xl bg-white touch-none">
                  <SignatureCanvas
                    ref={sigRef}
                    canvasProps={{
                      className: "w-full rounded-xl",
                      style: { width: "100%", height: "160px", display: "block" },
                    }}
                    backgroundColor="white"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  By signing you confirm you attended and understood this toolbox talk.
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Submitting…</>
                ) : (
                  <><CheckCircle className="h-4 w-4 mr-2" />Sign Attendance Register</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground pb-4">
          Powered by SiteSafe Cloud
        </p>
      </div>
    </div>
  );
}
