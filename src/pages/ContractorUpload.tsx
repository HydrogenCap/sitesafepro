import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, CheckCircle2, AlertCircle, FileText, Loader2 } from "lucide-react";
import { Logo } from "@/components/landing/Logo";

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
  id: string;
  company_name: string;
  organisation_id: string;
  organisation_name?: string;
}

interface UploadedDoc {
  doc_type: string;
  file_name: string;
}

export default function ContractorUpload() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contractor, setContractor] = useState<ContractorInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [expiryDate, setExpiryDate] = useState<string>("");

  useEffect(() => {
    validateToken();
  }, [token]);

  const validateToken = async () => {
    if (!token) {
      setError("Invalid upload link");
      setLoading(false);
      return;
    }

    try {
      // Fetch contractor by upload token
      const { data: contractorData, error: fetchError } = await supabase
        .from("contractor_companies")
        .select("id, company_name, organisation_id, upload_token_expires_at")
        .eq("upload_token", token)
        .single();

      if (fetchError || !contractorData) {
        setError("Invalid or expired upload link. Please contact your site contact for a new link.");
        setLoading(false);
        return;
      }

      // Check if token has expired
      if (contractorData.upload_token_expires_at) {
        const expiresAt = new Date(contractorData.upload_token_expires_at);
        if (expiresAt < new Date()) {
          setError("This upload link has expired. Please contact your site contact for a new link.");
          setLoading(false);
          return;
        }
      }

      // Fetch organisation name
      const { data: orgData } = await supabase
        .from("organisations")
        .select("name")
        .eq("id", contractorData.organisation_id)
        .single();

      setContractor({
        id: contractorData.id,
        company_name: contractorData.company_name,
        organisation_id: contractorData.organisation_id,
        organisation_name: orgData?.name,
      });
    } catch (err) {
      console.error("Error validating token:", err);
      setError("An error occurred. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !contractor || !selectedDocType) {
      toast.error("Please select a document type first");
      return;
    }

    // Validate file
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
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
      // Upload to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${contractor.id}/${selectedDocType}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Note: We skip creating the compliance doc record here since the contractor
      // doesn't have an authenticated user ID. The document is uploaded and can be 
      // linked by an admin later, or we could use a service function.
      // For now, just track the upload was successful.

      setUploadedDocs((prev) => [...prev, { doc_type: selectedDocType, file_name: file.name }]);
      toast.success("Document uploaded successfully!");
      setSelectedDocType("");
      setExpiryDate("");
      
      // Reset file input
      event.target.value = "";
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to upload document. Please try again.");
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
            <div className="space-y-4">
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

        {uploadedDocs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Uploaded Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {uploadedDocs.map((doc, index) => (
                  <li key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{doc.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {DOC_TYPE_OPTIONS.find((o) => o.value === doc.doc_type)?.label || doc.doc_type}
                      </p>
                    </div>
                  </li>
                ))}
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
