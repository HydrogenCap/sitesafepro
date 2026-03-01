import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DocumentRequestPayload {
  contractor_id: string;
  doc_types: string[];
  message?: string;
  recipient_email: string;
  recipient_name: string;
  organisation_name: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getUser(token);
    if (claimsError || !claimsData.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.user.id;

    // Parse request body
    const payload: DocumentRequestPayload = await req.json();
    const { contractor_id, doc_types, message, recipient_email, recipient_name, organisation_name } = payload;

    if (!contractor_id || !doc_types?.length || !recipient_email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: contractor_id, doc_types, recipient_email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role client for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate upload token
    const uploadToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14); // Token valid for 14 days

    // Update contractor with upload token
    const { error: updateError } = await supabase
      .from("contractor_companies")
      .update({
        upload_token: uploadToken,
        upload_token_expires_at: expiresAt.toISOString(),
      })
      .eq("id", contractor_id);

    if (updateError) {
      console.error("Error updating contractor:", updateError);
      throw new Error("Failed to generate upload token");
    }

    // Get user's organisation
    const { data: membership } = await supabase
      .from("organisation_members")
      .select("organisation_id")
      .eq("profile_id", userId)
      .eq("status", "active")
      .single();

    if (!membership) {
      throw new Error("User organisation not found");
    }

    // Create document request record
    const { error: requestError } = await supabase
      .from("contractor_document_requests")
      .insert({
        organisation_id: membership.organisation_id,
        contractor_company_id: contractor_id,
        doc_types,
        message,
        sent_by: userId,
        recipient_email,
      });

    if (requestError) {
      console.error("Error creating request record:", requestError);
    }

    // Format doc types for email
    const docTypeLabels: Record<string, string> = {
      public_liability: "Public Liability Insurance",
      employers_liability: "Employers Liability Insurance",
      professional_indemnity: "Professional Indemnity Insurance",
      cscs_card: "CSCS Card",
      gas_safe: "Gas Safe Registration",
      niceic: "NICEIC Certificate",
      safe_contractor: "Safe Contractor Accreditation",
      chas: "CHAS Accreditation",
      construction_line: "Constructionline Membership",
      iso_9001: "ISO 9001 Certificate",
      iso_14001: "ISO 14001 Certificate",
      iso_45001: "ISO 45001 Certificate",
      other: "Other Documentation",
    };

    const requestedDocs = doc_types.map((dt) => docTypeLabels[dt] || dt).join(", ");

    // Build upload portal URL
    const portalUrl = `${req.headers.get("origin") || "https://sitesafepro.lovable.app"}/contractor-upload/${uploadToken}`;

    // Send email via Resend
    const resend = new Resend(resendApiKey);
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1e3a5f; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .button { display: inline-block; background: #f97316; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .docs-list { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Document Request</h1>
            </div>
            <div class="content">
              <p>Dear ${recipient_name || "Contractor"},</p>
              
              <p>${organisation_name || "Our organisation"} is requesting the following compliance documents from you:</p>
              
              <div class="docs-list">
                <strong>Requested Documents:</strong>
                <p>${requestedDocs}</p>
              </div>
              
              ${message ? `<p><strong>Message:</strong> ${message}</p>` : ""}
              
              <p>Please click the button below to upload your documents securely:</p>
              
              <p style="text-align: center;">
                <a href="${portalUrl}" class="button">Upload Documents</a>
              </p>
              
              <p style="color: #666; font-size: 14px;">This link will expire in 14 days. If you have any questions, please contact your site contact.</p>
            </div>
            <div class="footer">
              <p>This is an automated message from SiteSafe Pro.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const { error: emailError } = await resend.emails.send({
      from: "Site Safe <noreply@sitesafe.cloud>",
      to: [recipient_email],
      subject: `Document Request from ${organisation_name || "SiteSafe Pro"}`,
      html: emailHtml,
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      throw new Error(`Failed to send email: ${emailError.message}`);
    }

    console.log(`Document request email sent to ${recipient_email} for contractor ${contractor_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Document request sent successfully",
        upload_url: portalUrl 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in contractor-document-request:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
