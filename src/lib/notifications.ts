import { supabase } from "@/integrations/supabase/client";

export type NotificationType = 
  | "document_acknowledgement"
  | "action_assigned"
  | "action_overdue"
  | "rams_acknowledgement"
  | "permit_expiring"
  | "site_induction_reminder";

export interface NotificationData {
  projectName?: string;
  documentName?: string;
  actionTitle?: string;
  ramsTitle?: string;
  permitTitle?: string;
  deadline?: string;
  dueDate?: string;
  daysOverdue?: string;
  priority?: string;
  expiresIn?: string;
  siteManagerContact?: string;
}

export interface SendNotificationParams {
  organisationId: string;
  recipientProfileId: string;
  type: NotificationType;
  data: NotificationData;
  link: string;
  triggerReferenceId?: string;
}

export async function sendNotification(params: SendNotificationParams) {
  try {
    const { data, error } = await supabase.functions.invoke("send-notification", {
      body: params,
    });

    if (error) {
      console.error("Error sending notification:", error);
      return { success: false, error: error.message };
    }

    return { success: true, results: data?.results };
  } catch (error: any) {
    console.error("Error sending notification:", error);
    return { success: false, error: error.message };
  }
}

export async function sendWhatsAppReminder(
  organisationId: string,
  recipientProfileId: string,
  recipientNumber: string,
  templateName: string,
  templateParams: Array<{ type: string; parameters: Array<{ type: string; text: string }> }>,
  triggerType: string,
  triggerReferenceId?: string
) {
  try {
    const { data, error } = await supabase.functions.invoke("send-whatsapp", {
      body: {
        recipientNumber,
        templateName,
        templateParams,
        organisationId,
        recipientProfileId,
        triggerType,
        triggerReferenceId,
      },
    });

    if (error) {
      console.error("Error sending WhatsApp:", error);
      return { success: false, error: error.message };
    }

    return { success: data?.success ?? false, messageId: data?.messageId, error: data?.error };
  } catch (error: any) {
    console.error("Error sending WhatsApp:", error);
    return { success: false, error: error.message };
  }
}
