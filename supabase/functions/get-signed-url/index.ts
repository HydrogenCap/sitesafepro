import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireUUID, requireString, requireEnum, optionalUUID, optionalString, ValidationError, validationErrorResponse } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXPORT_TTL_SECONDS = 15 * 60;
const EVIDENCE_TTL_SECONDS = 60 * 60;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });

  try {
    const body = await req.json();
    const org_id = requireUUID(body.org_id, "org_id");
    const bucket = requireEnum(body.bucket, "bucket", ["exports", "evidence", "signatures"] as const);
    const export_id = optionalUUID(body.export_id, "export_id");
    const path = optionalString(body.path, "path");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let storagePath: string;
    let ttl: number;

    if (bucket === "exports") {
      if (!export_id) {
        return new Response(JSON.stringify({ error: "export_id required for exports bucket" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: exp } = await admin.from("document_exports")
        .select("storage_path, organisation_id, status")
        .eq("id", export_id).single();

      if (!exp || exp.organisation_id !== org_id || exp.status !== "completed") {
        return new Response(JSON.stringify({ error: "Export not found or not ready" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      storagePath = exp.storage_path;
      ttl = EXPORT_TTL_SECONDS;
    } else {
      if (!path) {
        return new Response(JSON.stringify({ error: "path required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      storagePath = path;
      ttl = EVIDENCE_TTL_SECONDS;
    }

    const { data, error } = await admin.storage
      .from(bucket)
      .createSignedUrl(storagePath, ttl);

    if (error || !data?.signedUrl) {
      return new Response(JSON.stringify({ error: "Could not create signed URL" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(
      JSON.stringify({ signed_url: data.signedUrl, expires_in: ttl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    if (e instanceof ValidationError) return validationErrorResponse(e, corsHeaders);
    console.error("[get-signed-url]", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
