import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MessageSquare, Loader2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { sendWhatsAppReminder } from "@/lib/notifications";

interface SendWhatsAppButtonProps {
  organisationId: string;
  recipientProfileId: string;
  recipientNumber: string;
  recipientName: string;
  templateName: string;
  templateData: Record<string, string>;
  link: string;
  triggerType: string;
  triggerReferenceId?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  disabled?: boolean;
}

export function SendWhatsAppButton({
  organisationId,
  recipientProfileId,
  recipientNumber,
  recipientName,
  templateName,
  templateData,
  link,
  triggerType,
  triggerReferenceId,
  variant = "outline",
  size = "sm",
  disabled = false,
}: SendWhatsAppButtonProps) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);

  const buildTemplateParams = () => {
    // Build template params based on template type
    const params: Array<{ type: string; text: string }> = [];
    
    switch (templateName) {
      case "document_acknowledgement":
        params.push(
          { type: "text", text: recipientName },
          { type: "text", text: templateData.projectName || "Project" },
          { type: "text", text: templateData.documentName || "Document" },
          { type: "text", text: templateData.deadline || "As soon as possible" },
          { type: "text", text: link }
        );
        break;
      case "action_assigned":
      case "action_overdue":
        params.push(
          { type: "text", text: recipientName },
          { type: "text", text: templateData.projectName || "Project" },
          { type: "text", text: templateData.actionTitle || "Action" },
          { type: "text", text: templateData.priority || "Medium" },
          { type: "text", text: templateData.dueDate || "Not set" },
          { type: "text", text: link }
        );
        break;
      default:
        params.push({ type: "text", text: recipientName });
        params.push({ type: "text", text: link });
    }

    return [{
      type: "body",
      parameters: params,
    }];
  };

  const handleSend = async () => {
    if (!recipientNumber) {
      toast.error("Recipient has no WhatsApp number");
      return;
    }

    setSending(true);
    setFailed(false);

    const result = await sendWhatsAppReminder(
      organisationId,
      recipientProfileId,
      recipientNumber,
      templateName,
      buildTemplateParams(),
      triggerType,
      triggerReferenceId
    );

    setSending(false);

    if (result.success) {
      setSent(true);
      toast.success(`WhatsApp sent to ${recipientName}`);
    } else {
      setFailed(true);
      if (result.error === "Recipient has not opted in to WhatsApp notifications") {
        toast.error(`${recipientName} hasn't opted in to WhatsApp notifications`);
      } else if (result.error === "Rate limit exceeded") {
        toast.error("Rate limit exceeded. Try again later.");
      } else {
        toast.error(result.error || "Failed to send WhatsApp");
      }
    }
  };

  if (sent) {
    return (
      <Button variant="ghost" size={size} disabled className="text-green-600">
        <CheckCircle className="h-4 w-4 mr-1" />
        Sent
      </Button>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={failed ? "destructive" : variant}
          size={size}
          onClick={handleSend}
          disabled={disabled || sending || !recipientNumber}
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : failed ? (
            <XCircle className="h-4 w-4" />
          ) : (
            <MessageSquare className="h-4 w-4 text-green-600" />
          )}
          {size !== "icon" && <span className="ml-1">WhatsApp</span>}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {!recipientNumber 
          ? "No WhatsApp number" 
          : `Send WhatsApp reminder to ${recipientName}`
        }
      </TooltipContent>
    </Tooltip>
  );
}
