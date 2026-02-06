import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, CheckCircle, LogOut, AlertTriangle, Loader2 } from "lucide-react";

interface AccessCodeInfo {
  id: string;
  name: string;
  is_active: boolean;
  project: {
    id: string;
    name: string;
    address: string;
    organisation_id: string;
  };
  organisation: {
    id: string;
    name: string;
    logo_url: string | null;
  };
}

export default function CheckIn() {
  const { code } = useParams<{ code: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [accessCodeInfo, setAccessCodeInfo] = useState<AccessCodeInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"check-in" | "check-out" | "success">("check-in");

  // Form state
  const [visitorName, setVisitorName] = useState("");
  const [visitorCompany, setVisitorCompany] = useState("");
  const [visitorEmail, setVisitorEmail] = useState("");
  const [visitorPhone, setVisitorPhone] = useState("");
  const [purpose, setPurpose] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [hasSignedInduction, setHasSignedInduction] = useState(false);

  useEffect(() => {
    fetchAccessCodeInfo();
  }, [code]);

  const fetchAccessCodeInfo = async () => {
    if (!code) {
      setError("Invalid access code");
      setLoading(false);
      return;
    }

    try {
      // Use edge function to get access code info (bypasses RLS for public access)
      const { data, error: fetchError } = await supabase.functions.invoke("site-access", {
        body: null,
        method: "GET",
      });

      // Edge function doesn't support GET with body, so we need to use query params via URL
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/site-access?action=get-code-info&code=${encodeURIComponent(code)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      const result = await response.json();

      if (!response.ok || result.error) {
        setError(result.error || "Invalid access code. Please check the QR code and try again.");
        return;
      }

      setAccessCodeInfo(result.accessCode as AccessCodeInfo);
    } catch (err) {
      console.error("Error fetching access code:", err);
      setError("Failed to load access code information");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!visitorName.trim()) {
      toast.error("Please enter your name");
      return;
    }

    if (!code) return;

    setSubmitting(true);
    try {
      // Use edge function for check-in (bypasses RLS)
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/site-access?action=check-in`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            code,
            visitor_name: visitorName.trim(),
            visitor_company: visitorCompany.trim() || null,
            visitor_email: visitorEmail.trim() || null,
            visitor_phone: visitorPhone.trim() || null,
            purpose: purpose.trim() || null,
            emergency_contact_name: emergencyContactName.trim() || null,
            emergency_contact_phone: emergencyContactPhone.trim() || null,
            has_signed_induction: hasSignedInduction,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || "Failed to check in");
      }

      setMode("success");
      toast.success("Successfully checked in!");
    } catch (err: any) {
      console.error("Check-in error:", err);
      toast.error(err.message || "Failed to check in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = async () => {
    if (!visitorEmail.trim()) {
      toast.error("Please enter the email you used to check in");
      return;
    }

    if (!code) return;

    setSubmitting(true);
    try {
      // Use edge function for check-out (bypasses RLS)
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/site-access?action=check-out`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            code,
            visitor_email: visitorEmail.trim(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || result.error) {
        if (result.error === "No active visit found") {
          toast.error("No active check-in found with this email");
          return;
        }
        throw new Error(result.error || "Failed to check out");
      }

      toast.success("Successfully checked out!");
      setMode("success");
    } catch (err: any) {
      console.error("Check-out error:", err);
      toast.error(err.message || "Failed to check out. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Error</h2>
              <p className="text-muted-foreground">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (mode === "success") {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2">
                You're all set!
              </h2>
              <p className="text-muted-foreground mb-6">
                Thank you for visiting {accessCodeInfo?.project.name}
              </p>
              <div className="bg-muted rounded-lg p-4 text-left mb-6">
                <p className="text-sm text-muted-foreground mb-1">Site Address:</p>
                <p className="font-medium">{accessCodeInfo?.project.address || "Address not provided"}</p>
              </div>
              <Button onClick={() => window.close()} className="w-full">
                Close This Page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          {accessCodeInfo?.organisation.logo_url ? (
            <img
              src={accessCodeInfo.organisation.logo_url}
              alt={accessCodeInfo.organisation.name}
              className="h-12 mx-auto mb-4"
            />
          ) : (
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
          )}
          <h1 className="text-xl font-bold">{accessCodeInfo?.organisation.name}</h1>
          <p className="text-muted-foreground">{accessCodeInfo?.project.name}</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={mode === "check-in" ? "default" : "outline"}
            className="flex-1"
            onClick={() => setMode("check-in")}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Check In
          </Button>
          <Button
            variant={mode === "check-out" ? "default" : "outline"}
            className="flex-1"
            onClick={() => setMode("check-out")}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Check Out
          </Button>
        </div>

        {mode === "check-in" ? (
          <Card>
            <CardHeader>
              <CardTitle>Site Check-In</CardTitle>
              <CardDescription>
                Please complete this form before entering the site
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCheckIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={visitorCompany}
                    onChange={(e) => setVisitorCompany(e.target.value)}
                    placeholder="Your company name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={visitorEmail}
                      onChange={(e) => setVisitorEmail(e.target.value)}
                      placeholder="your@email.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={visitorPhone}
                      onChange={(e) => setVisitorPhone(e.target.value)}
                      placeholder="Your phone number"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purpose">Purpose of Visit</Label>
                  <Textarea
                    id="purpose"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="Briefly describe the reason for your visit"
                    rows={2}
                  />
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-3">Emergency Contact</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="emergency-name">Name</Label>
                      <Input
                        id="emergency-name"
                        value={emergencyContactName}
                        onChange={(e) => setEmergencyContactName(e.target.value)}
                        placeholder="Contact name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergency-phone">Phone</Label>
                      <Input
                        id="emergency-phone"
                        type="tel"
                        value={emergencyContactPhone}
                        onChange={(e) => setEmergencyContactPhone(e.target.value)}
                        placeholder="Contact phone"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                  <Checkbox
                    id="induction"
                    checked={hasSignedInduction}
                    onCheckedChange={(checked) => setHasSignedInduction(checked as boolean)}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="induction" className="font-medium cursor-pointer">
                      Site Induction
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      I confirm that I have completed the site safety induction
                    </p>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Checking In...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Check In to Site
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Site Check-Out</CardTitle>
              <CardDescription>
                Enter the email you used when checking in
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="checkout-email">Email Address</Label>
                  <Input
                    id="checkout-email"
                    type="email"
                    value={visitorEmail}
                    onChange={(e) => setVisitorEmail(e.target.value)}
                    placeholder="Enter the email you used to check in"
                  />
                </div>

                <Button
                  onClick={handleCheckOut}
                  className="w-full"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Checking Out...
                    </>
                  ) : (
                    <>
                      <LogOut className="h-4 w-4 mr-2" />
                      Check Out
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Access Point: {accessCodeInfo?.name}
        </p>
      </div>
    </div>
  );
}