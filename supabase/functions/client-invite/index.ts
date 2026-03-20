import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_INVITER_ROLES = new Set(["owner", "admin", "site_manager"]);

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
        from: "Site Safe <noreply@sitesafe.cloud>",
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

    const getAuthenticatedUser = async () => {
      if (!authHeader) {
        throw new Error("Authentication required");
      }

      const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user }, error } = await supabaseClient.auth.getUser();
      if (error || !user) {
        throw new Error("Invalid authentication");
      }

      return user;
    };

    const assertCanManageClientInvites = async (userId: string, organisationId: string) => {
      const { data: member, error } = await supabaseAdmin
        .from("organisation_members")
        .select("role")
        .eq("profile_id", userId)
        .eq("organisation_id", organisationId)
        .eq("status", "active")
        .single();

      if (error || !member || !ALLOWED_INVITER_ROLES.has(member.role)) {
        throw new Error("You don't have access to this organisation");
      }
    };

    const getClientInviteByToken = async (token: string) => {
      const { data: clientUser, error } = await supabaseAdmin
        .from("client_portal_users")
        .select(`
          id,
          organisation_id,
          profile_id,
          email,
          full_name,
          company_name,
          role,
          invite_token,
          invite_expires_at,
          accepted_at,
          can_view_documents,
          can_view_rams,
          can_view_actions,
          can_view_diary,
          can_view_workforce,
          can_view_incidents,
          can_download_reports,
          organisations!client_portal_users_organisation_id_fkey (name)
        `)
        .eq("invite_token", token)
        .single();

      if (error || !clientUser) {
        throw new Error("Invalid or expired invitation");
      }

      if (!clientUser.invite_token || clientUser.accepted_at) {
        throw new Error("This invitation has already been used");
      }

      if (
        clientUser.invite_expires_at &&
        new Date(clientUser.invite_expires_at).getTime() < Date.now()
      ) {
        throw new Error("Invalid or expired invitation");
      }

      return clientUser;
    };

    console.log(`Client invite action: ${action}`);

    // VALIDATE - Check whether a client portal token is still valid (public)
    if (action === "validate") {
      const { token } = body;

      if (!token) {
        return new Response(
          JSON.stringify({ valid: false, message: "No token provided" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        const clientUser = await getClientInviteByToken(token);
        const permissionLabels: Record<string, string> = {
          can_view_documents: "View Documents",
          can_view_rams: "View RAMS",
          can_view_actions: "View Corrective Actions",
          can_view_diary: "View Site Diary",
          can_view_workforce: "View Workforce Data",
          can_view_incidents: "View Incidents",
          can_download_reports: "Download Reports",
        };

        const permissions = Object.entries(permissionLabels)
          .filter(([key]) => (clientUser as Record<string, unknown>)[key] === true)
          .map(([_, label]) => label);

        return new Response(
          JSON.stringify({
            valid: true,
            invite: {
              organisationName: (clientUser.organisations as any)?.name || "Unknown",
              role: clientUser.role,
              email: clientUser.email,
              companyName: clientUser.company_name,
              permissions,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        const safeMessage = sanitizeErrorMessage(error);
        return new Response(
          JSON.stringify({ valid: false, message: safeMessage }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ACCEPT - Accept invitation and link/create the auth user (public)
    if (action === "accept") {
      const { token, password } = body;

      if (!token || !password) {
        throw new Error("Token and password are required");
      }

      const clientUser = await getClientInviteByToken(token);

      let resolvedUserId = clientUser.profile_id;

      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: clientUser.email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: clientUser.full_name,
          company_name: clientUser.company_name,
        },
      });

      if (authError) {
        const duplicateEmail = authError.message.toLowerCase().includes("already");
        if (!duplicateEmail) {
          console.error("Error creating client portal user:", authError);
          throw new Error(authError.message);
        }

        const { data: existingProfile, error: profileError } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("email", clientUser.email)
          .maybeSingle();

        if (profileError || !existingProfile) {
          throw new Error("Unable to link this invitation to the existing account");
        }

        resolvedUserId = existingProfile.id;
      } else if (authUser.user?.id) {
        resolvedUserId = authUser.user.id;
      }

      if (!resolvedUserId) {
        throw new Error("Unable to activate this invitation");
      }

      const { data: existingClientAccess, error: existingClientAccessError } = await supabaseAdmin
        .from("client_portal_users")
        .select("id, organisation_id")
        .eq("profile_id", resolvedUserId)
        .eq("is_active", true)
        .neq("id", clientUser.id)
        .limit(1)
        .maybeSingle();

      if (existingClientAccessError) {
        throw new Error("Unable to verify existing client portal access");
      }

      if (existingClientAccess) {
        throw new Error("This account is already linked to another active client portal");
      }

      const { error: updateError } = await supabaseAdmin
        .from("client_portal_users")
        .update({
          profile_id: resolvedUserId,
          accepted_at: new Date().toISOString(),
          invite_token: null,
          invite_expires_at: null,
        })
        .eq("id", clientUser.id);

      if (updateError) {
        console.error("Error activating client portal access:", updateError);
        throw new Error("Failed to activate client portal access");
      }

      return new Response(
        JSON.stringify({ success: true, message: "Client portal account created successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SEND - Send client portal invitation
    if (action === "send") {
      const user = await getAuthenticatedUser();
      const { clientUserId, organisationId } = body;

      if (!clientUserId || !organisationId) {
        throw new Error("Missing required fields for invitation");
      }

      await assertCanManageClientInvites(user.id, organisationId);

      const { data: clientUser, error: clientError } = await supabaseAdmin
        .from("client_portal_users")
        .select(`
          id,
          email,
          full_name,
          company_name,
          role,
          organisation_id,
          invite_token,
          can_view_documents,
          can_view_rams,
          can_view_actions,
          can_view_diary,
          can_view_workforce,
          can_view_incidents,
          can_download_reports
        `)
        .eq("id", clientUserId)
        .eq("organisation_id", organisationId)
        .single();

      if (clientError || !clientUser || !clientUser.invite_token) {
        throw new Error("Client user not found");
      }

      // Get the organisation name
      const { data: org } = await supabaseAdmin
        .from("organisations")
        .select("name")
        .eq("id", clientUser.organisation_id)
        .single();

      const orgName = org?.name || "Your Organisation";
      
      // Build the invite URL
      // [P2 FIX] Use trusted app origin
      const { getTrustedAppOrigin } = await import("../_shared/app-origin.ts");
      const appOrigin = getTrustedAppOrigin(req);
      const inviteUrl = `${appOrigin}/client/accept-invite?token=${clientUser.invite_token}`;

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

      const activePermissions = Object.entries(permissionLabels)
        .filter(([key]) => (clientUser as Record<string, unknown>)[key] === true)
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

      console.log(`Client invitation processed for ${clientUser.email}. Email sent: ${emailSent}`);

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
      const user = await getAuthenticatedUser();
      const { clientUserId } = body;

      if (!clientUserId) {
        throw new Error("Client user ID required");
      }

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
          accepted_at,
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

      if (clientUser.accepted_at) {
        throw new Error("This invitation has already been accepted");
      }

      await assertCanManageClientInvites(user.id, clientUser.organisation_id);

      // Generate a new invite token
      const newToken = crypto.randomUUID();

      // Update the invite token with expiry
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { error: updateError } = await supabaseAdmin
        .from("client_portal_users")
        .update({ 
          invite_token: newToken,
          invited_at: new Date().toISOString(),
          invite_expires_at: expiresAt,
        })
        .eq("id", clientUserId);

      if (updateError) {
        throw new Error("Failed to update invitation");
      }

      // [P2 FIX] Use trusted app origin
      const { getTrustedAppOrigin } = await import("../_shared/app-origin.ts");
      const resendAppOrigin = getTrustedAppOrigin(req);
      const inviteUrl = `${resendAppOrigin}/client/accept-invite?token=${newToken}`;
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
    // Sanitize error message - only return safe, user-friendly messages
    const safeMessage = sanitizeErrorMessage(error);
    return new Response(
      JSON.stringify({ error: safeMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

// Helper function to sanitize error messages
function sanitizeErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      // Map known safe errors to user-friendly messages
      if (message.includes("authentication required")) {
        return "Authentication required";
    }
    if (message.includes("invalid authentication")) {
      return "Invalid authentication";
    }
      if (message.includes("missing required fields")) {
        return "Please fill in all required fields";
      }
      if (message.includes("token and password are required")) {
        return "Token and password are required";
      }
      if (message.includes("invalid or expired invitation")) {
        return "Invalid or expired invitation";
      }
      if (message.includes("already been used")) {
        return "This invitation has already been used";
      }
      if (message.includes("already been accepted")) {
        return "This invitation has already been accepted";
      }
      if (message.includes("client user not found")) {
        return "Client user not found";
      }
      if (message.includes("already linked to another active client portal")) {
        return "This email is already linked to another active client portal";
      }
      if (message.includes("don't have access")) {
        return "You don't have access to this organisation";
      }
    if (message.includes("unknown action")) {
      return "Invalid request";
    }
  }
  // Default safe message
  return "Unable to process invitation. Please try again or contact support.";
}
