import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Helper to send client portal invitation email via Resend
async function sendClientInviteEmail(
  to: string,
  clientName: string,
  companyName: string,
  organisationName: string,
  role: string,
  inviteUrl: string,
  permissions: string[]
): Promise<boolean> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.log("RESEND_API_KEY not configured, skipping email");
    return false;
  }

  const roleDisplayNames: Record<string, string> = {
    client: "Client",
    principal_designer: "Principal Designer",
    cdm_advisor: "CDM Advisor",
    building_control: "Building Control",
  };

  const roleName = roleDisplayNames[role] || role;

  const permissionList = permissions.length > 0 
    ? permissions.map(p => `<li>${p}</li>`).join("") 
    : "<li>View project progress and compliance status</li>";

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #0F766E; margin: 0; font-size: 28px;">SiteSafe Pro</h1>
        <p style="color: #64748b; margin: 5px 0 0;">Client Portal Invitation</p>
      </div>
      
      <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; padding: 30px; margin-bottom: 20px;">
        <h2 style="margin: 0 0 10px; color: #14532d;">You're Invited!</h2>
        <p style="margin: 0; color: #334155;">
          Hi <strong>${clientName}</strong>,
        </p>
        <p style="color: #334155;">
          <strong>${organisationName}</strong> has invited you to access their Client Portal as a <strong>${roleName}</strong>.
        </p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #0F766E 0%, #0d9488 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Accept Invitation
        </a>
      </div>

      <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 10px; color: #334155; font-size: 14px;">What you'll be able to access:</h3>
        <ul style="margin: 0; padding-left: 20px; color: #64748b;">
          ${permissionList}
        </ul>
      </div>

      <div style="background: #fffbeb; border-radius: 8px; padding: 15px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
        <p style="margin: 0; color: #92400e; font-size: 13px;">
          <strong>Note:</strong> This is a read-only portal. You can view project information, download reports, and monitor compliance status but cannot make changes.
        </p>
      </div>

      <p style="color: #64748b; font-size: 13px; text-align: center;">
        This invitation link will expire in 7 days. If you didn't expect this email, you can safely ignore it.
      </p>
      
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
      
      <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
        © ${new Date().getFullYear()} SiteSafe Pro. All rights reserved.
      </p>
    </body>
    </html>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "SiteSafe Pro <noreply@resend.dev>",
        to: [to],
        subject: `Client Portal Invitation from ${organisationName}`,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Resend API error:", errorText);
      return false;
    }

    console.log(`Client invitation email sent to ${to}`);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const authHeader = req.headers.get("Authorization");
    const body = await req.json();
    const { action } = body;

    console.log(`Client invite action: ${action}`);

    // SEND - Send client portal invitation
    if (action === "send") {
      if (!authHeader) {
        throw new Error("Authentication required");
      }

      const {
        clientUserId,
        email,
        fullName,
        companyName,
        role,
        organisationId,
        inviteToken,
        permissions,
      } = body;

      if (!email || !fullName || !companyName || !organisationId || !inviteToken) {
        throw new Error("Missing required fields for invitation");
      }

      // Get the organisation name
      const { data: org } = await supabaseAdmin
        .from("organisations")
        .select("name")
        .eq("id", organisationId)
        .single();

      const orgName = org?.name || "Your Organisation";
      
      // Build the invite URL
      const origin = req.headers.get("origin") || "https://sitesafepro.lovable.app";
      const inviteUrl = `${origin}/client/accept-invite?token=${inviteToken}`;

      // Build permissions list for email
      const permissionLabels: Record<string, string> = {
        can_view_documents: "View Documents",
        can_view_rams: "View RAMS",
        can_view_actions: "View Corrective Actions",
        can_view_diary: "View Site Diary",
        can_view_workforce: "View Workforce Data",
        can_view_incidents: "View Incidents",
        can_download_reports: "Download Reports",
      };

      const activePermissions = Object.entries(permissions || {})
        .filter(([_, enabled]) => enabled)
        .map(([key]) => permissionLabels[key] || key);

      // Send the invitation email
      const emailSent = await sendClientInviteEmail(
        email,
        fullName,
        companyName,
        orgName,
        role,
        inviteUrl,
        activePermissions
      );

      console.log(`Client invitation processed for ${email}. Email sent: ${emailSent}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: emailSent ? "Invitation sent" : "Invitation created (email not sent)",
          inviteUrl,
          emailSent,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // RESEND - Resend client portal invitation
    if (action === "resend") {
      if (!authHeader) {
        throw new Error("Authentication required");
      }

      const { clientUserId, email } = body;

      if (!clientUserId) {
        throw new Error("Client user ID required");
      }

      // Generate a new invite token
      const newToken = crypto.randomUUID();

      // Get client user details
      const { data: clientUser, error: clientError } = await supabaseAdmin
        .from("client_portal_users")
        .select(`
          id,
          email,
          full_name,
          company_name,
          role,
          organisation_id,
          can_view_documents,
          can_view_rams,
          can_view_actions,
          can_view_diary,
          can_view_workforce,
          can_view_incidents,
          can_download_reports,
          organisations!client_portal_users_organisation_id_fkey (name)
        `)
        .eq("id", clientUserId)
        .single();

      if (clientError || !clientUser) {
        throw new Error("Client user not found");
      }

      // Update the invite token
      const { error: updateError } = await supabaseAdmin
        .from("client_portal_users")
        .update({ 
          invite_token: newToken,
          invited_at: new Date().toISOString(),
        })
        .eq("id", clientUserId);

      if (updateError) {
        throw new Error("Failed to update invitation");
      }

      const origin = req.headers.get("origin") || "https://sitesafepro.lovable.app";
      const inviteUrl = `${origin}/client/accept-invite?token=${newToken}`;
      const orgName = (clientUser.organisations as any)?.name || "Your Organisation";

      // Build permissions list
      const permissionLabels: Record<string, string> = {
        can_view_documents: "View Documents",
        can_view_rams: "View RAMS",
        can_view_actions: "View Corrective Actions",
        can_view_diary: "View Site Diary",
        can_view_workforce: "View Workforce Data",
        can_view_incidents: "View Incidents",
        can_download_reports: "Download Reports",
      };

      const activePermissions = Object.entries(permissionLabels)
        .filter(([key]) => (clientUser as any)[key])
        .map(([_, label]) => label);

      // Send the invitation email
      const emailSent = await sendClientInviteEmail(
        clientUser.email,
        clientUser.full_name,
        clientUser.company_name,
        orgName,
        clientUser.role,
        inviteUrl,
        activePermissions
      );

      console.log(`Client invitation resent to ${clientUser.email}. Email sent: ${emailSent}`);

      return new Response(
        JSON.stringify({ success: true, inviteUrl, emailSent }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    console.error("Error in client-invite function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
