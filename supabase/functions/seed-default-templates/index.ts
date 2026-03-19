import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getTemplateBaseUrl } from "../_shared/app-origin.ts";
import { requireString, ValidationError, validationErrorResponse } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_TEMPLATES = [
  { name: "Site Induction Register", description: "Record of all personnel who have completed site induction", category: "induction", fileName: "Site_Induction_Register.docx", requiresAcknowledgement: true, autoGenerateOnGoLive: true },
  { name: "SubContractor RAMS Register", description: "Register of all subcontractor Risk Assessments and Method Statements", category: "registers", fileName: "SubContractor_RAMS_Register.docx", requiresAcknowledgement: false, autoGenerateOnGoLive: true },
  { name: "COSHH Register", description: "Control of Substances Hazardous to Health register", category: "registers", fileName: "COSHH_Register.docx", requiresAcknowledgement: false, autoGenerateOnGoLive: true },
  { name: "Permit to Work Forms", description: "Authorisation forms for high-risk work activities", category: "permits", fileName: "Permit_to_Work_Forms.docx", requiresAcknowledgement: true, autoGenerateOnGoLive: true },
  { name: "Fire Risk Assessment", description: "Site fire risk assessment documentation", category: "safety", fileName: "Fire_Risk_Assessment.docx", requiresAcknowledgement: false, autoGenerateOnGoLive: true },
  { name: "Accident & Incident Report", description: "Form for reporting accidents and incidents on site", category: "safety", fileName: "Accident_Incident_Report.docx", requiresAcknowledgement: false, autoGenerateOnGoLive: true },
  { name: "Scaffold Inspection Register", description: "Register for scaffold inspections and certifications", category: "registers", fileName: "Scaffold_Inspection_Register.docx", requiresAcknowledgement: false, autoGenerateOnGoLive: true },
  { name: "Lifting Equipment Register", description: "Register of all lifting equipment and inspection records", category: "registers", fileName: "Lifting_Equipment_Register.docx", requiresAcknowledgement: false, autoGenerateOnGoLive: true },
  { name: "PAT Testing Register", description: "Portable Appliance Testing register", category: "registers", fileName: "PAT_Testing_Register.docx", requiresAcknowledgement: false, autoGenerateOnGoLive: true },
  { name: "H&S File Contributions Log", description: "Log of contributions to the Health & Safety file", category: "registers", fileName: "HS_File_Contributions_Log.docx", requiresAcknowledgement: false, autoGenerateOnGoLive: true },
  { name: "Welfare Facilities Checklist", description: "Checklist for site welfare facilities compliance", category: "safety", fileName: "Welfare_Facilities_Checklist.docx", requiresAcknowledgement: false, autoGenerateOnGoLive: true },
];

interface SeedRequest {
  organisationId: string;
  userId?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT - must be authenticated org admin/owner
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body: SeedRequest = await req.json();
    const isServiceRole = claimsData.claims.role === "service_role";
    const userId = isServiceRole
      ? requireString(body.userId, "userId")
      : claimsData.claims.sub as string;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { organisationId } = body;

    if (!organisationId) {
      return new Response(
        JSON.stringify({ error: "Missing organisationId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const templateBaseUrl = getTemplateBaseUrl();

    // Verify user is admin/owner of the org
    const { data: membership } = await supabaseAdmin
      .from('organisation_members')
      .select('role')
      .eq('profile_id', userId)
      .eq('organisation_id', organisationId)
      .eq('status', 'active')
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions — must be org admin or owner' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Seeding default templates for organisation ${organisationId} by user ${userId}`);

    let successCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < DEFAULT_TEMPLATES.length; i++) {
      const template = DEFAULT_TEMPLATES[i];
      try {
        const fileUrl = new URL(`/templates/${template.fileName}`, templateBaseUrl).toString();
        const response = await fetch(fileUrl);
        if (!response.ok) {
          errors.push(`Failed to fetch ${template.name}`);
          continue;
        }

        const fileData = await response.arrayBuffer();
        const fileSize = fileData.byteLength;
        const filePath = `${organisationId}/${crypto.randomUUID()}.docx`;

        const { error: uploadError } = await supabaseAdmin.storage
          .from("document-templates")
          .upload(filePath, fileData, {
            contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          });

        if (uploadError) {
          errors.push(`Upload failed for ${template.name}`);
          continue;
        }

        const { error: insertError } = await supabaseAdmin
          .from("document_templates")
          .insert({
            organisation_id: organisationId,
            name: template.name,
            description: template.description,
            category: template.category,
            file_path: filePath,
            file_size: fileSize,
            mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            requires_acknowledgement: template.requiresAcknowledgement,
            auto_generate_on_go_live: template.autoGenerateOnGoLive,
            sort_order: i,
            created_by: userId,
          });

        if (insertError) {
          await supabaseAdmin.storage.from("document-templates").remove([filePath]);
          errors.push(`Database insert failed for ${template.name}`);
          continue;
        }

        successCount++;
      } catch (err) {
        errors.push(`Error processing ${template.name}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        templatesCreated: successCount,
        totalTemplates: DEFAULT_TEMPLATES.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, corsHeaders);
    }

    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
