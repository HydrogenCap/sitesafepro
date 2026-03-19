import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const DOC_TYPES = [
  { id: "public_liability", label: "Public Liability Insurance" },
  { id: "employers_liability", label: "Employers Liability Insurance" },
  { id: "professional_indemnity", label: "Professional Indemnity Insurance" },
  { id: "cscs_card", label: "CSCS Card" },
  { id: "gas_safe", label: "Gas Safe Registration" },
  { id: "niceic", label: "NICEIC Certificate" },
  { id: "safe_contractor", label: "Safe Contractor Accreditation" },
  { id: "chas", label: "CHAS Accreditation" },
  { id: "construction_line", label: "Constructionline Membership" },
  { id: "iso_9001", label: "ISO 9001" },
  { id: "iso_14001", label: "ISO 14001" },
  { id: "iso_45001", label: "ISO 45001" },
];

interface RequestDocumentsDialogProps {
  contractorId: string;
  contractorName: string;
  contactEmail?: string;
  contactName?: string;
  onSuccess?: () => void;
}

export function RequestDocumentsDialog({
  contractorId,
  contractorName,
  contactEmail,
  contactName,
  onSuccess,
}: RequestDocumentsDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [email, setEmail] = useState(contactEmail || "");
  const [recipientName, setRecipientName] = useState(contactName || "");
  const [message, setMessage] = useState("");

  const handleToggleDoc = (docId: string) => {
    setSelectedDocs((prev) =>
      prev.includes(docId) ? prev.filter((d) => d !== docId) : [...prev, docId]
    );
  };

  const handleSend = async () => {
    if (!selectedDocs.length) {
      toast.error("Please select at least one document type");
      return;
    }
    if (!email) {
      toast.error("Please enter a recipient email");
      return;
    }

    setSending(true);

    try {
      // Get organisation name
      const { data: orgData } = await supabase
        .from("organisation_members")
        .select("organisations(name)")
        .eq("profile_id", user?.id)
        .eq("status", "active")
        .single();

      const { data, error } = await supabase.functions.invoke("contractor-document-request", {
        body: {
          contractor_id: contractorId,
          doc_types: selectedDocs,
          message,
          recipient_email: email,
          recipient_name: recipientName,
          organisation_name: (orgData as any)?.organisations?.name || "Site Safe",
        },
      });

      if (error) throw error;

      toast.success("Document request sent successfully!");
      setOpen(false);
      setSelectedDocs([]);
      setMessage("");
      onSuccess?.();
    } catch (err) {
      console.error("Error sending request:", err);
      toast.error("Failed to send document request");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Mail className="h-4 w-4 mr-2" />
          Request Documents
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Documents</DialogTitle>
          <DialogDescription>
            Send a document request email to {contractorName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Recipient Email *</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contractor@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label>Recipient Name</Label>
            <Input
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="Contact name"
            />
          </div>

          <div className="space-y-2">
            <Label>Select Documents to Request *</Label>
            <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
              {DOC_TYPES.map((doc) => (
                <div key={doc.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={doc.id}
                    checked={selectedDocs.includes(doc.id)}
                    onCheckedChange={() => handleToggleDoc(doc.id)}
                  />
                  <label
                    htmlFor={doc.id}
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    {doc.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Additional Message (optional)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add any additional instructions or notes..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending || !selectedDocs.length || !email}>
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Send Request
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
