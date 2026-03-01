import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (req.method === "GET") {
      // Validate token and return contractor info + required docs + already uploaded docs
      const url = new URL(req.url);
      const token = url.searchParams.get("token");

      if (!token) {
        return new Response(JSON.stringify({ error: "Missing token" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: contractor, error: fetchErr } = await supabase
        .from("contractor_companies")
        .select("id, company_name, organisation_id, upload_token_expires_at, required_doc_types")
        .eq("upload_token", token)
        .single();

      if (fetchErr || !contractor) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired upload link" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (contractor.upload_token_expires_at) {
        if (new Date(contractor.upload_token_expires_at) < new Date()) {
          return new Response(
            JSON.stringify({ error: "This upload link has expired" }),
            { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Fetch org name
      const { data: org } = await supabase
        .from("organisations")
        .select("name")
        .eq("id", contractor.organisation_id)
        .single();

      // Fetch already uploaded current docs for this contractor
      const { data: existingDocs } = await supabase
        .from("contractor_compliance_docs")
        .select("id, doc_type, status, expiry_date, created_at")
        .eq("contractor_company_id", contractor.id)
        .eq("is_current", true)
        .order("created_at", { ascending: false });

      return new Response(
        JSON.stringify({
          contractor_id: contractor.id,
          company_name: contractor.company_name,
          organisation_id: contractor.organisation_id,
          organisation_name: org?.name || null,
          required_doc_types: contractor.required_doc_types || [],
          uploaded_docs: existingDocs || [],
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST") {
      const formData = await req.formData();
      const token = formData.get("token") as string;
      const docType = formData.get("doc_type") as string;
      const expiryDate = formData.get("expiry_date") as string | null;
      const file = formData.get("file") as File;

      if (!token || !docType || !file) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: token, doc_type, file" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        return new Response(
          JSON.stringify({ error: "File size must be less than 10MB" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate file type
      const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        return new Response(
          JSON.stringify({ error: "Only PDF and image files are allowed" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate token
      const { data: contractor, error: fetchErr } = await supabase
        .from("contractor_companies")
        .select("id, organisation_id, upload_token_expires_at")
        .eq("upload_token", token)
        .single();

      if (fetchErr || !contractor) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired upload link" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (contractor.upload_token_expires_at) {
        if (new Date(contractor.upload_token_expires_at) < new Date()) {
          return new Response(
            JSON.stringify({ error: "This upload link has expired" }),
            { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Upload file to compliance-docs bucket
      const fileExt = file.name.split(".").pop();
      const storagePath = `${contractor.organisation_id}/${contractor.id}/${docType}_${Date.now()}.${fileExt}`;

      const { error: uploadErr } = await supabase.storage
        .from("compliance-docs")
        .upload(storagePath, file, { contentType: file.type });

      if (uploadErr) {
        console.error("Storage upload error:", uploadErr);
        return new Response(
          JSON.stringify({ error: "Failed to upload file" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark any existing current doc of same type as superseded
      await supabase
        .from("contractor_compliance_docs")
        .update({ is_current: false, status: "superseded" })
        .eq("contractor_company_id", contractor.id)
        .eq("doc_type", docType)
        .eq("is_current", true);

      // Create compliance doc record (use a system user ID placeholder)
      const { data: newDoc, error: insertErr } = await supabase
        .from("contractor_compliance_docs")
        .insert({
          contractor_company_id: contractor.id,
          organisation_id: contractor.organisation_id,
          doc_type: docType,
          file_path: storagePath,
          expiry_date: expiryDate || null,
          status: "uploaded",
          is_current: true,
          uploaded_by: "00000000-0000-0000-0000-000000000000", // system placeholder for unauthenticated upload
          version_number: 1,
        })
        .select("id, doc_type, status, expiry_date, created_at")
        .single();

      if (insertErr) {
        console.error("Insert error:", insertErr);
        return new Response(
          JSON.stringify({ error: "Failed to create document record" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Trigger AI document check (fire-and-forget)
      if (newDoc?.id) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        fetch(`${supabaseUrl}/functions/v1/check-compliance-doc`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${anonKey}`,
          },
          body: JSON.stringify({
            compliance_doc_id: newDoc.id,
            organisation_id: contractor.organisation_id,
          }),
        }).catch((err) => console.error("AI check trigger error:", err));
      }

      return new Response(
        JSON.stringify({ success: true, doc: newDoc }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
