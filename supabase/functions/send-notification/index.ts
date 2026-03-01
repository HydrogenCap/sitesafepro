import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireString, requireUUID, requireEnum, optionalUUID, ValidationError, validationErrorResponse } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type NotificationType = 
  | "document_acknowledgement"
  | "action_assigned"
  | "action_overdue"
  | "rams_acknowledgement"
  | "permit_expiring"
  | "site_induction_reminder";

interface NotificationRequest {
  organisationId: string;
  recipientProfileId: string;
  type: NotificationType;
  data: Record<string, string>;
  link: string;
  triggerReferenceId?: string;
}

// Map notification types to template names and preference columns
const NOTIFICATION_CONFIG: Record<NotificationType, {
  templateName: string;
  emailPref: string;
  whatsappPref: string;
  pushPref?: string;
}> = {
  document_acknowledgement: {
    templateName: "document_acknowledgement",
    emailPref: "document_ack_email",
    whatsappPref: "document_ack_whatsapp",
    pushPref: "document_ack_push",
  },
  action_assigned: {
    templateName: "action_assigned",
    emailPref: "action_assigned_email",
    whatsappPref: "action_assigned_whatsapp",
    pushPref: "action_assigned_push",
  },
  action_overdue: {
    templateName: "action_overdue",
    emailPref: "action_overdue_email",
    whatsappPref: "action_overdue_whatsapp",
    pushPref: "action_overdue_push",
  },
  rams_acknowledgement: {
    templateName: "rams_acknowledgement",
    emailPref: "rams_issued_email",
    whatsappPref: "rams_issued_whatsapp",
  },
  permit_expiring: {
    templateName: "permit_expiring",
    emailPref: "permit_expiring_email",
    whatsappPref: "permit_expiring_whatsapp",
    pushPref: "permit_expiring_push",
  },
  site_induction_reminder: {
    templateName: "site_induction_reminder",
    emailPref: "induction_reminder_email",
    whatsappPref: "induction_reminder_whatsapp",
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Authentication check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("[SEND-NOTIFICATION] Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the caller's identity
    const authSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authError } = await authSupabase.auth.getClaims(token);
    if (authError || !claims?.claims) {
      console.error("[SEND-NOTIFICATION] Invalid token:", authError);
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerId = claims.claims.sub;

    const body = await req.json();
    const organisationId = requireUUID(body.organisationId, "organisationId");
    const recipientProfileId = requireUUID(body.recipientProfileId, "recipientProfileId");
    const type = requireEnum(body.type, "type", [
      "document_acknowledgement", "action_assigned", "action_overdue",
      "rams_acknowledgement", "permit_expiring", "site_induction_reminder",
    ] as const) as NotificationType;
    const data = body.data ?? {};
    const link = requireString(body.link, "link", { maxLength: 500 });
    const triggerReferenceId = body.triggerReferenceId;

    console.log(`[SEND-NOTIFICATION] Type: ${type}, Recipient: ${recipientProfileId}, Caller: ${callerId}`);

    // Use service role client for privileged operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify caller belongs to the organisation
    const { data: membership, error: memberError } = await supabase
      .from("organisation_members")
      .select("organisation_id")
      .eq("profile_id", callerId)
      .eq("organisation_id", organisationId)
      .eq("status", "active")
      .single();

    if (memberError || !membership) {
      console.error("[SEND-NOTIFICATION] Unauthorized access to organisation:", memberError);
      return new Response(
        JSON.stringify({ error: "Unauthorized access to organisation" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const config = NOTIFICATION_CONFIG[type];
    if (!config) {
      return new Response(
        JSON.stringify({ error: "Unknown notification type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get recipient profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, email, phone, whatsapp_number, whatsapp_opted_in")
      .eq("id", recipientProfileId)
      .single();

    if (profileError || !profile) {
      console.error("[SEND-NOTIFICATION] Recipient not found:", profileError);
      return new Response(
        JSON.stringify({ error: "Recipient not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get notification preferences (use defaults if not set)
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("profile_id", recipientProfileId)
      .eq("organisation_id", organisationId)
      .single();

    // Default all preferences to true if not set
    const emailEnabled = prefs?.[config.emailPref] ?? true;
    const whatsappEnabled = prefs?.[config.whatsappPref] ?? true;

    // Check if org has WhatsApp enabled
    const { data: org } = await supabase
      .from("organisations")
      .select("name, whatsapp_enabled")
      .eq("id", organisationId)
      .single();

    const results = {
      email: { sent: false, error: null as string | null },
      whatsapp: { sent: false, error: null as string | null },
    };

    // Send WhatsApp notification
    if (whatsappEnabled && org?.whatsapp_enabled && profile.whatsapp_opted_in && profile.whatsapp_number) {
      console.log("[SEND-NOTIFICATION] Sending WhatsApp notification");
      
      // Build template parameters based on notification type
      const templateParams = buildTemplateParams(type, data, profile.full_name, org?.name || "", link);
      
      try {
        const waResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            recipientNumber: profile.whatsapp_number,
            templateName: config.templateName,
            templateParams,
            organisationId,
            recipientProfileId,
            triggerType: type,
            triggerReferenceId,
          }),
        });

        const waResult = await waResponse.json();
        results.whatsapp.sent = waResult.success;
        if (!waResult.success) {
          results.whatsapp.error = waResult.error;
        }
      } catch (error) {
        console.error("[SEND-NOTIFICATION] WhatsApp error:", error);
        results.whatsapp.error = error.message;
      }
    } else {
      console.log("[SEND-NOTIFICATION] WhatsApp skipped:", {
        whatsappEnabled,
        orgEnabled: org?.whatsapp_enabled,
        optedIn: profile.whatsapp_opted_in,
        hasNumber: !!profile.whatsapp_number,
      });
    }

    // TODO: Send email notification (integrate with Resend when ready)
    if (emailEnabled) {
      console.log("[SEND-NOTIFICATION] Email notification would be sent here");
      // results.email.sent = true;
    }

    // Create in-app activity log
    await supabase.from("activity_logs").insert({
      organisation_id: organisationId,
      actor_id: null, // System notification
      activity_type: "notification",
      entity_type: "notification",
      entity_id: triggerReferenceId,
      entity_name: type,
      description: `Notification sent: ${type}`,
      metadata: {
        recipient_id: recipientProfileId,
        channels: results,
      },
    });

    console.log("[SEND-NOTIFICATION] Complete:", results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, corsHeaders);
    }
    console.error("[SEND-NOTIFICATION] Error:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred sending the notification" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildTemplateParams(
  type: NotificationType,
  data: Record<string, string>,
  recipientName: string,
  orgName: string,
  link: string
): Array<{ type: string; parameters: Array<{ type: string; text: string }> }> {
  // Meta WhatsApp templates use positional parameters: {{1}}, {{2}}, etc.
  // The components structure depends on how templates are registered in Meta Business Manager
  
  switch (type) {
    case "document_acknowledgement":
      // Template: Hi {{1}}, a new document requires your signature for {{2}}. Document: {{3}} Deadline: {{4}} Tap to sign: {{5}}
      return [{
        type: "body",
        parameters: [
          { type: "text", text: recipientName },
          { type: "text", text: data.projectName || orgName },
          { type: "text", text: data.documentName || "Document" },
          { type: "text", text: data.deadline || "As soon as possible" },
          { type: "text", text: link },
        ],
      }];

    case "action_assigned":
      // Template: Hi {{1}}, a corrective action has been assigned to you at {{2}}. {{3}} — Priority: {{4}} Due: {{5}} View: {{6}}
      return [{
        type: "body",
        parameters: [
          { type: "text", text: recipientName },
          { type: "text", text: data.projectName || orgName },
          { type: "text", text: data.actionTitle || "Action" },
          { type: "text", text: data.priority || "Medium" },
          { type: "text", text: data.dueDate || "Not set" },
          { type: "text", text: link },
        ],
      }];

    case "action_overdue":
      // Template: Hi {{1}}, your corrective action is overdue. {{2}} at {{3}} Was due: {{4}} ({{5}} days overdue) Please resolve urgently: {{6}}
      return [{
        type: "body",
        parameters: [
          { type: "text", text: recipientName },
          { type: "text", text: data.actionTitle || "Action" },
          { type: "text", text: data.projectName || orgName },
          { type: "text", text: data.dueDate || "Unknown" },
          { type: "text", text: data.daysOverdue || "1" },
          { type: "text", text: link },
        ],
      }];

    case "rams_acknowledgement":
      // Template: Hi {{1}}, new RAMS have been issued for {{2}} and require your signature. {{3}} Sign here: {{4}}
      return [{
        type: "body",
        parameters: [
          { type: "text", text: recipientName },
          { type: "text", text: data.projectName || orgName },
          { type: "text", text: data.ramsTitle || "RAMS" },
          { type: "text", text: link },
        ],
      }];

    case "permit_expiring":
      // Template: Reminder: Permit to Work "{{1}}" at {{2}} expires in {{3}}. Action required: {{4}}
      return [{
        type: "body",
        parameters: [
          { type: "text", text: data.permitTitle || "Permit" },
          { type: "text", text: data.projectName || orgName },
          { type: "text", text: data.expiresIn || "30 minutes" },
          { type: "text", text: link },
        ],
      }];

    case "site_induction_reminder":
      // Template: Hi {{1}}, you need to complete your site induction for {{2}} before starting work. Contact the site manager: {{3}}
      return [{
        type: "body",
        parameters: [
          { type: "text", text: recipientName },
          { type: "text", text: data.projectName || orgName },
          { type: "text", text: data.siteManagerContact || link },
        ],
      }];

    default:
      return [];
  }
}
