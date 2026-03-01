import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // GET — look up talk by token
    if (req.method === "GET") {
      const url = new URL(req.url);
      const token = url.searchParams.get("token");
      if (!token) {
        return new Response(JSON.stringify({ error: "Missing token" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: talk, error } = await supabase
        .from("toolbox_talks")
        .select(`
          id, title, category, delivered_at, location, status,
          project:projects(name),
          organisation:organisations(name, logo_url)
        `)
        .eq("attendance_token", token)
        .single();

      if (error || !talk) {
        return new Response(
          JSON.stringify({ error: "Talk not found or link has expired" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ talk }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST — submit attendance
    if (req.method === "POST") {
      const body = await req.json();
      const { token, attendee_name, attendee_company, attendee_trade, signature_data } = body;

      if (!token || !attendee_name || !signature_data) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find the talk
      const { data: talk, error: talkError } = await supabase
        .from("toolbox_talks")
        .select("id, organisation_id")
        .eq("attendance_token", token)
        .single();

      if (talkError || !talk) {
        return new Response(
          JSON.stringify({ error: "Talk not found or link has expired" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Insert attendee
      const { error: insertError } = await supabase
        .from("toolbox_talk_attendees")
        .insert({
          toolbox_talk_id: talk.id,
          organisation_id: talk.organisation_id,
          attendee_name,
          attendee_company: attendee_company || null,
          attendee_trade: attendee_trade || null,
          signature_data,
          signed_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to record attendance" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
