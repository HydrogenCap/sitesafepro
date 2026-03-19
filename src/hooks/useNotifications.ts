import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";

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

interface SendNotificationParams {
  recipientProfileId: string;
  type: NotificationType;
  data: NotificationData;
  link: string;
  triggerReferenceId?: string;
}

export function useNotifications() {
  const { organisation } = useSubscription();

  const sendNotification = useCallback(
    async (params: SendNotificationParams) => {
      if (!organisation?.id) {
        console.warn("No organisation ID - skipping notification");
        return { success: false, error: "No organisation" };
      }

      try {
        const { data, error } = await supabase.functions.invoke("send-notification", {
          body: {
            organisationId: organisation.id,
            recipientProfileId: params.recipientProfileId,
            type: params.type,
            data: params.data,
            link: params.link,
            triggerReferenceId: params.triggerReferenceId,
          },
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
    },
    [organisation?.id]
  );

  /**
   * Notify a user when an action is assigned to them
   */
  const notifyActionAssigned = useCallback(
    async (
      assigneeProfileId: string,
      actionId: string,
      actionTitle: string,
      projectName: string,
      priority: string,
      dueDate: string
    ) => {
      return sendNotification({
        recipientProfileId: assigneeProfileId,
        type: "action_assigned",
        data: {
          actionTitle,
          projectName,
          priority,
          dueDate,
        },
        link: `/actions/${actionId}`,
        triggerReferenceId: actionId,
      });
    },
    [sendNotification]
  );

  /**
   * Notify users when a document requires acknowledgement
   */
  const notifyDocumentAcknowledgement = useCallback(
    async (
      recipientProfileIds: string[],
      documentId: string,
      documentName: string,
      projectName: string,
      deadline?: string
    ) => {
      const results = await Promise.all(
        recipientProfileIds.map((profileId) =>
          sendNotification({
            recipientProfileId: profileId,
            type: "document_acknowledgement",
            data: {
              documentName,
              projectName,
              deadline,
            },
            link: `/documents/${documentId}`,
            triggerReferenceId: documentId,
          })
        )
      );

      return {
        success: results.every((r) => r.success),
        results,
      };
    },
    [sendNotification]
  );

  /**
   * Notify workers when RAMS are issued
   */
  const notifyRamsIssued = useCallback(
    async (
      recipientProfileIds: string[],
      ramsId: string,
      ramsTitle: string,
      projectName: string
    ) => {
      const results = await Promise.all(
        recipientProfileIds.map((profileId) =>
          sendNotification({
            recipientProfileId: profileId,
            type: "rams_acknowledgement",
            data: {
              ramsTitle,
              projectName,
            },
            link: `/rams/${ramsId}`,
            triggerReferenceId: ramsId,
          })
        )
      );

      return {
        success: results.every((r) => r.success),
        results,
      };
    },
    [sendNotification]
  );

  /**
   * Notify permit holder when permit is expiring
   */
  const notifyPermitExpiring = useCallback(
    async (
      recipientProfileId: string,
      permitId: string,
      permitTitle: string,
      projectName: string,
      expiresIn: string
    ) => {
      return sendNotification({
        recipientProfileId,
        type: "permit_expiring",
        data: {
          permitTitle,
          projectName,
          expiresIn,
        },
        link: `/permits/${permitId}`,
        triggerReferenceId: permitId,
      });
    },
    [sendNotification]
  );

  return {
    sendNotification,
    notifyActionAssigned,
    notifyDocumentAcknowledgement,
    notifyRamsIssued,
    notifyPermitExpiring,
  };
}
