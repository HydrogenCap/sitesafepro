import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, CheckCircle2, AlertCircle, FileText, Loader2, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/landing/Logo";
import { COMPLIANCE_DOC_LABELS } from "@/types/contractor";

const DOC_TYPE_OPTIONS = [
  { value: "public_liability", label: "Public Liability Insurance" },
  { value: "employers_liability", label: "Employers Liability Insurance" },
  { value: "professional_indemnity", label: "Professional Indemnity Insurance" },
  { value: "cscs_card", label: "CSCS Card" },
  { value: "gas_safe", label: "Gas Safe Registration" },
  { value: "niceic", label: "NICEIC Certificate" },
  { value: "safe_contractor", label: "Safe Contractor Accreditation" },
  { value: "chas", label: "CHAS Accreditation" },
  { value: "construction_line", label: "Constructionline Membership" },
  { value: "iso_9001", label: "ISO 9001 Certificate" },
  { value: "iso_14001", label: "ISO 14001 Certificate" },
  { value: "iso_45001", label: "ISO 45001 Certificate" },
  { value: "other", label: "Other Documentation" },
];

interface ContractorInfo {
  contractor_id: string;
  company_name: string;
  organisation_id: string;
  organisation_name: string | null;
  required_doc_types: string[];
  uploaded_docs: UploadedDoc[];
}

interface UploadedDoc {
  id: string;
  doc_type: string;
  status: string;
  expiry_date: string | null;
  created_at: string;
}

export default function ContractorUpload() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [contractor, setContractor] = useState<ContractorInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [expiryDate, setExpiryDate] = useState<string>("");

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

  const fetchContractorInfo = useCallback(async () => {
    if (!token) {
      setError("Invalid upload link");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/contractor-upload?token=${encodeURIComponent(token)}`
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid or expired upload link. Please contact your site contact for a new link.");
        setLoading(false);
        return;
      }

      setContractor(data);
    } catch (err) {
      console.error("Error validating token:", err);
      setError("An error occurred. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [token, projectId]);

  useEffect(() => {
    fetchContractorInfo();
  }, [fetchContractorInfo]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !contractor || !selectedDocType) {
      toast.error("Please select a document type first");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only PDF and image files are allowed");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("token", token!);
      formData.append("doc_type", selectedDocType);
      formData.append("file", file);
      if (expiryDate) formData.append("expiry_date", expiryDate);

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/contractor-upload`,
        { method: "POST", body: formData }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      toast.success("Document uploaded successfully!");
      setSelectedDocType("");
      setExpiryDate("");
      event.target.value = "";

      // Refresh contractor info to update checklist
      await fetchContractorInfo();
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.message || "Failed to upload document. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Link Invalid</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const requiredTypes = contractor?.required_doc_types || [];
  const uploadedTypes = new Set((contractor?.uploaded_docs || []).map((d) => d.doc_type));
  const completedCount = requiredTypes.filter((dt) => uploadedTypes.has(dt)).length;
  const progressPercent = requiredTypes.length > 0 ? Math.round((completedCount / requiredTypes.length) * 100) : 0;
  const allComplete = requiredTypes.length > 0 && completedCount === requiredTypes.length;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Logo />
          <span className="text-sm text-muted-foreground">Document Upload Portal</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Upload Compliance Documents</CardTitle>
            <CardDescription>
              {contractor?.organisation_name ? (
                <>
                  Uploading for <strong>{contractor.company_name}</strong> to{" "}
                  <strong>{contractor.organisation_name}</strong>
                </>
              ) : (
                <>Uploading for <strong>{contractor?.company_name}</strong></>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Progress Tracker */}
            {requiredTypes.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {completedCount} of {requiredTypes.length} required documents uploaded
                  </span>
                  <span className={`font-semibold ${allComplete ? "text-green-600" : "text-foreground"}`}>
                    {progressPercent}%
                  </span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>
            )}

            {/* Required Docs Checklist */}
            {requiredTypes.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Required Documents</Label>
                <div className="grid gap-2">
                  {requiredTypes.map((dt) => {
                    const uploaded = uploadedTypes.has(dt);
                    const docLabel =
                      DOC_TYPE_OPTIONS.find((o) => o.value === dt)?.label ||
                      (COMPLIANCE_DOC_LABELS as any)[dt]?.label ||
                      dt.replace(/_/g, " ");
                    const uploadedDoc = contractor?.uploaded_docs.find((d) => d.doc_type === dt);

                    return (
                      <div
                        key={dt}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          uploaded ? "border-green-500/30 bg-green-500/5" : "border-border"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {uploaded ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                          ) : (
                            <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                          )}
                          <span className="text-sm font-medium">{docLabel}</span>
                        </div>
                        {uploaded && uploadedDoc && (
                          <Badge variant="outline" className="text-xs capitalize">
                            {uploadedDoc.status.replace(/_/g, " ")}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* All Complete Banner */}
            {allComplete && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                <ShieldCheck className="h-6 w-6 text-green-600 shrink-0" />
                <div>
                  <p className="font-semibold text-sm text-green-700">All required documents uploaded!</p>
                  <p className="text-xs text-green-600/80">Your documents are being reviewed.</p>
                </div>
              </div>
            )}

            {/* Upload Form */}
            <div className="space-y-4 pt-2 border-t border-border">
              <div className="space-y-2">
                <Label htmlFor="doc-type">Document Type *</Label>
                <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiry-date">Expiry Date (optional)</Label>
                <Input
                  id="expiry-date"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Upload File *</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={handleFileUpload}
                    disabled={!selectedDocType || uploading}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className={`cursor-pointer flex flex-col items-center gap-2 ${
                      !selectedDocType ? "opacity-50" : ""
                    }`}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
                        <span className="text-sm text-muted-foreground">Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-10 w-10 text-muted-foreground" />
                        <span className="text-sm font-medium">Click to upload</span>
                        <span className="text-xs text-muted-foreground">
                          PDF, JPG, PNG up to 10MB
                        </span>
                      </>
                    )}
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Previously Uploaded Documents */}
        {(contractor?.uploaded_docs || []).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                Uploaded Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {contractor!.uploaded_docs.map((doc) => {
                  const docLabel =
                    DOC_TYPE_OPTIONS.find((o) => o.value === doc.doc_type)?.label ||
                    doc.doc_type.replace(/_/g, " ");
                  return (
                    <li key={doc.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium text-sm">{docLabel}</p>
                          {doc.expiry_date && (
                            <p className="text-xs text-muted-foreground">
                              Expires: {new Date(doc.expiry_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs capitalize">
                        {doc.status.replace(/_/g, " ")}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}

        <div className="text-center text-sm text-muted-foreground">
          <p>Need help? Contact your site contact for assistance.</p>
        </div>
      </main>
    </div>
  );
}
