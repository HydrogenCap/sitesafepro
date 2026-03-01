import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  requireString,
  requireUUID,
  optionalString,
  optionalUUID,
  ValidationError,
  validationErrorResponse,
} from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Validate phone number: digits only, 7-15 chars (E.164 without +)
function requirePhoneNumber(value: unknown, field: string): string {
  const s = requireString(value, field, { maxLength: 20 });
  // Strip common formatting
  const cleaned = s.replace(/[\s\-\(\)\+]/g, "");
  if (!/^\d{7,15}$/.test(cleaned)) {
    throw new ValidationError(field, `${field} must be a valid phone number (7-15 digits)`);
  }
  return cleaned;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Check if WhatsApp is configured
    if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
      console.log("[SEND-WHATSAPP] WhatsApp not configured - missing credentials");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "WhatsApp not configured",
          code: "NOT_CONFIGURED" 
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();

    // Validate all inputs
    const recipientNumber = requirePhoneNumber(body.recipientNumber, "recipientNumber");
    const templateName = requireString(body.templateName, "templateName", { maxLength: 100 });
    const organisationId = requireUUID(body.organisationId, "organisationId");
    const recipientProfileId = optionalUUID(body.recipientProfileId, "recipientProfileId");
    const triggerType = optionalString(body.triggerType, "triggerType", { maxLength: 100 });
    const triggerReferenceId = optionalUUID(body.triggerReferenceId, "triggerReferenceId");

    // Validate templateParams structure if provided
    let templateParams = body.templateParams;
    if (templateParams !== undefined && templateParams !== null) {
      if (!Array.isArray(templateParams)) {
        throw new ValidationError("templateParams", "templateParams must be an array");
      }
      // Validate each component has type and parameters
      for (let i = 0; i < templateParams.length; i++) {
        const comp = templateParams[i];
        if (!comp || typeof comp.type !== "string") {
          throw new ValidationError(`templateParams[${i}].type`, "Each template component must have a type");
        }
        if (!Array.isArray(comp.parameters)) {
          throw new ValidationError(`templateParams[${i}].parameters`, "Each template component must have parameters array");
        }
      }
    }

    console.log(`[SEND-WHATSAPP] Sending ${templateName} to ${recipientNumber}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if organisation has WhatsApp enabled
    const { data: org } = await supabase
      .from("organisations")
      .select("whatsapp_enabled, whatsapp_daily_limit")
      .eq("id", organisationId)
      .single();

    if (!org?.whatsapp_enabled) {
      console.log("[SEND-WHATSAPP] WhatsApp not enabled for organisation");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "WhatsApp not enabled for organisation",
          code: "ORG_DISABLED" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format the number: ensure it starts with country code, no spaces/dashes
    const cleanNumber = recipientNumber
      .replace(/^0/, "44"); // UK: replace leading 0 with 44

    // Check rate limits
    const { data: canSend } = await supabase.rpc("check_whatsapp_rate_limit", {
      p_org_id: organisationId,
      p_recipient_number: cleanNumber,
      p_daily_org_limit: org.whatsapp_daily_limit || 50,
    });

    if (!canSend) {
      console.log("[SEND-WHATSAPP] Rate limit exceeded");
      await supabase.from("whatsapp_messages").insert({
        organisation_id: organisationId,
        recipient_profile_id: recipientProfileId,
        recipient_number: cleanNumber,
        template_name: templateName,
        template_params: templateParams,
        status: "rate_limited",
        error_message: "Rate limit exceeded",
        trigger_type: triggerType,
        trigger_reference_id: triggerReferenceId,
      });

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Rate limit exceeded",
          code: "RATE_LIMITED" 
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for duplicates
    if (triggerReferenceId) {
      const { data: isUnique } = await supabase.rpc("check_whatsapp_duplicate", {
        p_recipient_number: cleanNumber,
        p_template_name: templateName,
        p_trigger_reference_id: triggerReferenceId,
      });

      if (!isUnique) {
        console.log("[SEND-WHATSAPP] Duplicate message blocked");
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Duplicate message within 24 hours",
            code: "DUPLICATE" 
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check if recipient has opted in
    if (recipientProfileId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("whatsapp_opted_in")
        .eq("id", recipientProfileId)
        .single();

      if (!profile?.whatsapp_opted_in) {
        console.log("[SEND-WHATSAPP] Recipient not opted in");
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Recipient has not opted in to WhatsApp notifications",
            code: "NOT_OPTED_IN" 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Send via Meta Cloud API
    console.log(`[SEND-WHATSAPP] Calling Meta API for number: ${cleanNumber}`);
    
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: cleanNumber,
          type: "template",
          template: {
            name: templateName,
            language: { code: "en_GB" },
            components: templateParams || [],
          },
        }),
      }
    );

    const data = await response.json();

    // Log the message
    const { error: logError } = await supabase.from("whatsapp_messages").insert({
      organisation_id: organisationId,
      recipient_profile_id: recipientProfileId,
      recipient_number: cleanNumber,
      template_name: templateName,
      template_params: templateParams,
      message_id: data.messages?.[0]?.id || null,
      status: response.ok ? "sent" : "failed",
      error_message: response.ok ? null : JSON.stringify(data.error),
      trigger_type: triggerType,
      trigger_reference_id: triggerReferenceId,
    });

    if (logError) {
      console.error("[SEND-WHATSAPP] Failed to log message:", logError);
    }

    if (!response.ok) {
      console.error("[SEND-WHATSAPP] Meta API error:", data.error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Failed to send WhatsApp message",
          code: "API_ERROR" 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[SEND-WHATSAPP] Message sent successfully: ${data.messages?.[0]?.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: data.messages?.[0]?.id 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, corsHeaders);
    }
    console.error("[SEND-WHATSAPP] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
