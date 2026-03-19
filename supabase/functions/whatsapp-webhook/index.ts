import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Verify webhook signature from Meta using HMAC-SHA256
async function verifyWebhookSignature(body: string, signature: string | null, appSecret: string): Promise<boolean> {
  if (!signature) return false;
  
  // Meta sends signature as "sha256=<hex>"
  const expectedPrefix = "sha256=";
  if (!signature.startsWith(expectedPrefix)) return false;
  
  const expectedHash = signature.slice(expectedPrefix.length);
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const computedHash = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
  
  // Constant-time comparison
  if (computedHash.length !== expectedHash.length) return false;
  let mismatch = 0;
  for (let i = 0; i < computedHash.length; i++) {
    mismatch |= computedHash.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  }
  return mismatch === 0;
}

// Meta sends different status updates for message delivery
interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        statuses?: Array<{
          id: string;
          status: "sent" | "delivered" | "read" | "failed";
          timestamp: string;
          recipient_id: string;
          errors?: Array<{
            code: number;
            title: string;
          }>;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          text?: {
            body: string;
          };
          type: string;
          context?: {
            from: string;
            id: string;
          };
        }>;
      };
      field: string;
    }>;
  }>;
}

serve(async (req) => {
  // Handle webhook verification (GET request from Meta)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const VERIFY_TOKEN = Deno.env.get("WHATSAPP_WEBHOOK_VERIFY_TOKEN");

    console.log("[WHATSAPP-WEBHOOK] Verification request received");

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("[WHATSAPP-WEBHOOK] Verification successful");
      return new Response(challenge, { status: 200 });
    } else {
      console.log("[WHATSAPP-WEBHOOK] Verification failed");
      return new Response("Verification failed", { status: 403 });
    }
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Handle webhook events (POST request)
  if (req.method === "POST") {
    try {
      const WHATSAPP_APP_SECRET = Deno.env.get("WHATSAPP_APP_SECRET");
      const rawBody = await req.text();

      // Verify webhook signature if app secret is configured
      if (WHATSAPP_APP_SECRET) {
        const signature = req.headers.get("x-hub-signature-256");
        const isValid = await verifyWebhookSignature(rawBody, signature, WHATSAPP_APP_SECRET);
        if (!isValid) {
          console.error("[WHATSAPP-WEBHOOK] Invalid signature - rejecting request");
          return new Response(JSON.stringify({ error: "Invalid signature" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        console.warn("[WHATSAPP-WEBHOOK] WARNING: WHATSAPP_APP_SECRET not configured, skipping signature verification");
      }

      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      const payload: WhatsAppWebhookPayload = JSON.parse(rawBody);

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Process each entry
      for (const entry of payload.entry || []) {
        for (const change of entry.changes || []) {
          const value = change.value;

          // Process status updates
          if (value.statuses) {
            for (const status of value.statuses) {
              console.log(`[WHATSAPP-WEBHOOK] Status update: ${status.id} -> ${status.status}`);

              const updates: Record<string, unknown> = {
                status: status.status,
              };

              if (status.status === "delivered") {
                updates.delivered_at = new Date(parseInt(status.timestamp) * 1000).toISOString();
              } else if (status.status === "read") {
                updates.read_at = new Date(parseInt(status.timestamp) * 1000).toISOString();
              } else if (status.status === "failed" && status.errors) {
                updates.error_message = JSON.stringify(status.errors);
              }

              const { error } = await supabase
                .from("whatsapp_messages")
                .update(updates)
                .eq("message_id", status.id);

              if (error) {
                console.error("[WHATSAPP-WEBHOOK] Failed to update message status:", error);
              }
            }
          }

          // Process incoming messages (replies)
          if (value.messages) {
            for (const message of value.messages) {
              // Check if this is a reply to one of our messages
              if (message.context?.id) {
                console.log(`[WHATSAPP-WEBHOOK] Reply received for message: ${message.context.id}`);

                const { error } = await supabase
                  .from("whatsapp_messages")
                  .update({
                    reply_text: message.text?.body || `[${message.type}]`,
                    reply_received_at: new Date(parseInt(message.timestamp) * 1000).toISOString(),
                  })
                  .eq("message_id", message.context.id);

                if (error) {
                  console.error("[WHATSAPP-WEBHOOK] Failed to log reply:", error);
                }
              } else {
                console.log(`[WHATSAPP-WEBHOOK] Incoming message (not a reply)`);
              }
            }
          }
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (error) {
      console.error("[WHATSAPP-WEBHOOK] Error processing webhook:", error);
      // Always return 200 to Meta to acknowledge receipt
      return new Response(
        JSON.stringify({ success: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  return new Response("Method not allowed", { status: 405 });
});
