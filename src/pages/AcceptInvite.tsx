import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, Building2, Shield, HardHat, FileCheck } from "lucide-react";
import { Logo } from "@/components/landing/Logo";
import { COMPLIANCE_DOC_LABELS } from "@/types/contractor";

type InviteType = "team" | "contractor";

interface InviteInfo {
  type: InviteType;
  organisationName: string;
  inviterName?: string;
  role: string;
  email: string;
  companyName?: string;
  requiredDocs?: string[];
}

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Invalid invitation link");
      setLoading(false);
      return;
    }
    validateInvite();
  }, [token]);

  const validateInvite = async () => {
    try {
      // Try contractor-invite first
      const { data: contractorData, error: contractorErr } = await supabase.functions.invoke(
        "contractor-invite",
        { body: { action: "validate", token } }
      );

      if (!contractorErr && contractorData?.valid) {
        setInviteInfo({
          type: "contractor",
          organisationName: contractorData.invite.organisationName,
          role: contractorData.invite.role || "contractor",
          email: contractorData.invite.email,
          companyName: contractorData.invite.companyName,
          requiredDocs: contractorData.invite.requiredDocs,
        });
        setLoading(false);
        return;
      }

      // Fall back to team-invite
      const { data: teamData, error: teamErr } = await supabase.functions.invoke(
        "team-invite",
        { body: { action: "validate", token } }
      );

      if (!teamErr && teamData?.valid) {
        setInviteInfo({
          type: "team",
          organisationName: teamData.invite.organisationName,
          inviterName: teamData.invite.inviterName,
          role: teamData.invite.role,
          email: teamData.invite.email,
        });
        setLoading(false);
        return;
      }

      // Both failed
      const msg =
        contractorData?.message || teamData?.message || "This invitation is no longer valid";
      setError(msg);
    } catch (err: any) {
      console.error("Error validating invite:", err);
      setError("Failed to validate invitation");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (password.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    try {
      const functionName =
        inviteInfo?.type === "contractor" ? "contractor-invite" : "team-invite";

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { action: "accept", token, password, fullName: fullName || undefined },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setSuccess(true);
      toast({ title: "Account created!", description: "You can now sign in." });
    } catch (err: any) {
      console.error("Error accepting invite:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to accept invitation",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const roleLabels: Record<string, string> = {
    owner: "Owner",
    admin: "Admin",
    site_manager: "Site Manager",
    contractor: "Contractor",
    client_viewer: "Client Viewer",
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Validating invitation...</p>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Invitation</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => navigate("/")} variant="outline">
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Success ──
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
            <h2 className="text-xl font-semibold">Account Created!</h2>
            <p className="text-muted-foreground">
              {inviteInfo?.type === "contractor"
                ? "Your contractor account is ready. Sign in to upload your compliance documents and view your projects."
                : "Your account has been created. You can now sign in."}
            </p>
            <Button className="w-full" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Accept Form ──
  const isContractor = inviteInfo?.type === "contractor";

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Logo />
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            {isContractor ? (
              <HardHat className="h-5 w-5 text-primary" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
            {isContractor ? "Contractor Invitation" : "You're Invited!"}
          </CardTitle>
          <CardDescription>
            {isContractor
              ? `Set up your account to manage compliance for ${inviteInfo?.companyName}`
              : "You've been invited to join an organisation"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Invite Details */}
          <div className="bg-muted rounded-lg p-4 mb-6 space-y-3">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm text-muted-foreground">Organisation</p>
                <p className="font-medium">{inviteInfo?.organisationName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm text-muted-foreground">Your Role</p>
                <p className="font-medium">
                  {roleLabels[inviteInfo?.role || ""] || inviteInfo?.role}
                </p>
              </div>
            </div>
            {isContractor && inviteInfo?.companyName && (
              <div className="flex items-center gap-3">
                <HardHat className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Company</p>
                  <p className="font-medium">{inviteInfo.companyName}</p>
                </div>
              </div>
            )}
          </div>

          {/* Required docs preview for contractors */}
          {isContractor && inviteInfo?.requiredDocs && inviteInfo.requiredDocs.length > 0 && (
            <div className="border border-border rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <FileCheck className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">Documents you'll need to upload:</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {inviteInfo.requiredDocs.map((doc) => (
                  <Badge key={doc} variant="secondary" className="text-xs">
                    {(COMPLIANCE_DOC_LABELS as any)[doc]?.label || doc}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleAccept} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={inviteInfo?.email || ""}
                disabled
                className="bg-muted"
              />
            </div>

            {isContractor && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Your Full Name</Label>
                <Input
                  id="fullName"
                  placeholder="John Smith"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Create Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Accept & Create Account"
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Already have an account?{" "}
            <a href="/auth" className="text-primary hover:underline">
              Sign in
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
