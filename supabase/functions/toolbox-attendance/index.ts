/**
 * toolbox-attendance
 *
 * Public endpoint (no auth) — accessed via QR code scan.
 *
 * GET  ?token=xxx               → returns talk info for the landing page
 * POST { token, name, company, trade, signature_data } → saves attendee record
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // ── GET: fetch talk info for landing page ─────────────────────────────────
  if (req.method === "GET") {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token) return json({ error: "token is required" }, 400);

    const { data: talk, error } = await admin
      .from("toolbox_talks")
      .select(`
        id, title, category, delivered_at, location, status, qr_token,
        project:projects(name),
        organisation:organisations!toolbox_talks_organisation_id_fkey(name, logo_url)
      `)
      .eq("qr_token", token)
      .maybeSingle();

    if (error || !talk) return json({ error: "Talk not found or QR code invalid" }, 404);
    if (talk.status === "cancelled") return json({ error: "This talk has been cancelled" }, 410);

    return json({ talk });
  }

  // ── POST: submit attendee ─────────────────────────────────────────────────
  if (req.method === "POST") {
    const body = await req.json();
    const { token, attendee_name, attendee_company, attendee_trade, signature_data } = body;

    if (!token) return json({ error: "token is required" }, 400);
    if (!attendee_name?.trim()) return json({ error: "Name is required" }, 400);
    if (!signature_data) return json({ error: "Signature is required" }, 400);

    // Fetch the talk
    const { data: talk, error: talkErr } = await admin
      .from("toolbox_talks")
      .select("id, organisation_id, status")
      .eq("qr_token", token)
      .maybeSingle();

    if (talkErr || !talk) return json({ error: "Talk not found" }, 404);
    if (talk.status === "cancelled") return json({ error: "This talk has been cancelled" }, 410);

    // Check for duplicate (same name already signed)
    const { data: existing } = await admin
      .from("toolbox_talk_attendees")
      .select("id")
      .eq("toolbox_talk_id", talk.id)
      .ilike("attendee_name", attendee_name.trim())
      .maybeSingle();

    if (existing) {
      return json({ error: "You have already signed this attendance register" }, 409);
    }

    // Insert attendee
    const { error: insertErr } = await admin
      .from("toolbox_talk_attendees")
      .insert({
        toolbox_talk_id: talk.id,
        organisation_id: talk.organisation_id,
        attendee_name: attendee_name.trim(),
        attendee_company: attendee_company?.trim() || null,
        attendee_trade: attendee_trade?.trim() || null,
        signature_data,
        signed_at: new Date().toISOString(),
      });

    if (insertErr) {
      console.error("[toolbox-attendance] insert error:", insertErr);
      return json({ error: "Failed to save attendance" }, 500);
    }

    return json({ ok: true });
  }

  return json({ error: "Method not allowed" }, 405);
});
