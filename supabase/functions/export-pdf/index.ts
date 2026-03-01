import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireUUID, ValidationError, validationErrorResponse } from "../_shared/validation.ts";
import { buildEvidencePdf } from "../_shared/pdf-builder.ts";
import { storagePaths } from "../_shared/storage-paths.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });

  try {
    const body = await req.json();
    const org_id = requireUUID(body.org_id, "org_id");
    const version_id = requireUUID(body.version_id, "version_id");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Idempotency: check for existing export
    const { data: existing } = await admin
      .from("document_exports")
      .select("id, status, storage_path")
      .eq("document_version_id", version_id)
      .in("status", ["pending", "completed"])
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ export_id: existing.id, status: existing.status, ok: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load version + document + org
    const { data: version, error: vErr } = await admin
      .from("document_versions")
      .select(`
        id, version_number, content_json, change_summary,
        created_at, approved_at, is_immutable, status,
        documents!inner(
          id, name, type, organisation_id, project_id,
          organisations!inner(id, name, slug),
          projects(id, name, address)
        )
      `)
      .eq("id", version_id)
      .eq("organisation_id", org_id)
      .single();

    if (vErr || !version) {
      return new Response(JSON.stringify({ error: "Version not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!version.is_immutable) {
      return new Response(
        JSON.stringify({ error: "PDF export is only available for approved (immutable) versions" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load evidence, signatures, all versions
    const [evidenceRes, signaturesRes, allVersionsRes] = await Promise.all([
      admin.from("evidence_items").select("*").eq("document_version_id", version_id).order("sort_order"),
      admin.from("document_signatures").select("*").eq("document_version_id", version_id),
      admin.from("document_versions")
        .select("version_number, change_summary, created_by, created_at, status, approved_at")
        .eq("document_id", (version.documents as any).id)
        .order("version_number"),
    ]);

    // Create export row
    const { data: exportRow } = await admin
      .from("document_exports")
      .insert({
        organisation_id: org_id,
        document_version_id: version_id,
        status: "pending",
        created_by: user.id,
      })
      .select("id")
      .single();

    const exportId = exportRow!.id;
    const doc = version.documents as any;
    const storagePath = storagePaths.export(
      org_id, doc.project_id ?? "no-project", doc.id, version_id, exportId
    );

    await admin.from("document_exports").update({ status: "processing" }).eq("id", exportId);

    try {
      const pdfBytes = await buildEvidencePdf({
        version,
        evidence: evidenceRes.data ?? [],
        signatures: signaturesRes.data ?? [],
        allVersions: allVersionsRes.data ?? [],
        exportId,
        supabaseAdmin: admin,
      });

      const { error: uploadErr } = await admin.storage
        .from("exports")
        .upload(storagePath, pdfBytes, { contentType: "application/pdf", upsert: false });

      if (uploadErr) throw uploadErr;

      await admin.from("document_exports").update({
        status: "completed",
        storage_path: storagePath,
        completed_at: new Date().toISOString(),
      }).eq("id", exportId);

      return new Response(
        JSON.stringify({ export_id: exportId, status: "completed", ok: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await admin.from("document_exports").update({ status: "failed", error: msg }).eq("id", exportId);
      console.error("[export-pdf] Generation failed:", msg);
      return new Response(JSON.stringify({ error: "PDF generation failed", export_id: exportId }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (e) {
    if (e instanceof ValidationError) return validationErrorResponse(e, corsHeaders);
    console.error("[export-pdf]", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
