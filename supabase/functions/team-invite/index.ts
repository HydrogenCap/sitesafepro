import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Helper to send invitation email via Resend
async function sendInviteEmail(
  to: string,
  inviteeName: string,
  organisationName: string,
  role: string,
  inviteUrl: string
): Promise<boolean> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.log("RESEND_API_KEY not configured, skipping email");
    return false;
  }

  const roleDisplayNames: Record<string, string> = {
    admin: "Administrator",
    site_manager: "Site Manager",
    contractor: "Contractor",
    client_viewer: "Client Viewer",
  };

  const roleName = roleDisplayNames[role] || role;

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #0ea5e9; margin: 0; font-size: 28px;">SiteSafe Pro</h1>
        <p style="color: #64748b; margin: 5px 0 0;">Construction Safety Management</p>
      </div>
      
      <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; padding: 30px; margin-bottom: 20px;">
        <h2 style="margin: 0 0 10px; color: #0c4a6e;">You're Invited!</h2>
        <p style="margin: 0; color: #334155;">
          Hi <strong>${inviteeName}</strong>,
        </p>
        <p style="color: #334155;">
          You've been invited to join <strong>${organisationName}</strong> on SiteSafe Pro as a <strong>${roleName}</strong>.
        </p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Accept Invitation
        </a>
      </div>

      <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 10px; color: #334155; font-size: 14px;">What you'll be able to do:</h3>
        <ul style="margin: 0; padding-left: 20px; color: #64748b;">
          ${role === 'admin' ? `
            <li>Manage projects, documents, and team members</li>
            <li>Configure organisation settings</li>
            <li>Access all safety and compliance data</li>
          ` : role === 'site_manager' ? `
            <li>Manage site activities and inspections</li>
            <li>Create and track corrective actions</li>
            <li>Upload and manage documents</li>
          ` : role === 'contractor' ? `
            <li>View assigned projects</li>
            <li>Upload compliance documents</li>
            <li>Acknowledge safety briefings</li>
          ` : `
            <li>View project progress and reports</li>
            <li>Access safety documentation</li>
            <li>Monitor compliance status</li>
          `}
        </ul>
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
        subject: `You're invited to join ${organisationName} on SiteSafe Pro`,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Resend API error:", errorText);
      return false;
    }

    console.log(`Invitation email sent to ${to}`);
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

    // Get the authorization header for user context
    const authHeader = req.headers.get("Authorization");
    
    const body = await req.json();
    const { action } = body;

    console.log(`Team invite action: ${action}`);

    // VALIDATE - Check if invite token is valid (public)
    if (action === "validate") {
      const { token } = body;
      
      if (!token) {
        return new Response(
          JSON.stringify({ valid: false, message: "No token provided" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find the member record with this invite token
      const { data: member, error: memberError } = await supabaseAdmin
        .from("organisation_members")
        .select(`
          id,
          role,
          status,
          organisation:organisations!organisation_members_organisation_id_fkey (
            name
          ),
          profile:profiles!organisation_members_profile_id_fkey (
            email,
            full_name
          )
        `)
        .eq("invite_token", token)
        .single();

      if (memberError || !member) {
        console.log("Invalid token or member not found:", memberError);
        return new Response(
          JSON.stringify({ valid: false, message: "Invalid or expired invitation" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (member.status !== "invited") {
        return new Response(
          JSON.stringify({ valid: false, message: "This invitation has already been used" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          valid: true,
          invite: {
            organisationName: (member.organisation as any)?.name || "Unknown",
            role: member.role,
            email: (member.profile as any)?.email || "",
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ACCEPT - Accept invitation and create user account (public)
    if (action === "accept") {
      const { token, password } = body;

      if (!token || !password) {
        throw new Error("Token and password are required");
      }

      // Get the invitation details
      const { data: member, error: memberError } = await supabaseAdmin
        .from("organisation_members")
        .select(`
          id,
          profile_id,
          organisation_id,
          status,
          profile:profiles!organisation_members_profile_id_fkey (
            id,
            email,
            full_name
          )
        `)
        .eq("invite_token", token)
        .eq("status", "invited")
        .single();

      if (memberError || !member) {
        throw new Error("Invalid or expired invitation");
      }

      const placeholderProfileId = member.profile_id;
      const email = (member.profile as any)?.email;
      const fullName = (member.profile as any)?.full_name;

      if (!email) {
        throw new Error("No email associated with this invitation");
      }

      // Create the user account in auth.users first
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm since they were invited
        user_metadata: {
          full_name: fullName,
        },
      });

      if (authError) {
        console.error("Error creating user:", authError);
        throw new Error(authError.message);
      }

      // The handle_new_user trigger will create/update the profile with the auth user ID
      // due to ON CONFLICT (email) DO UPDATE. Now update the organisation member to point
      // to the new auth user ID (which is now the profile ID)
      const { error: updateError } = await supabaseAdmin
        .from("organisation_members")
        .update({
          profile_id: authUser.user.id,
          status: "active",
          accepted_at: new Date().toISOString(),
          invite_token: null,
        })
        .eq("id", member.id);

      if (updateError) {
        console.error("Error updating member:", updateError);
        throw new Error("Failed to activate membership");
      }

      // Delete the placeholder profile if it's different from the new auth user
      // (the trigger should have merged them, but clean up just in case)
      if (placeholderProfileId !== authUser.user.id) {
        await supabaseAdmin
          .from("profiles")
          .delete()
          .eq("id", placeholderProfileId);
      }

      console.log(`User ${email} accepted invitation successfully`);

      return new Response(
        JSON.stringify({ success: true, message: "Account created successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // INVITE - Send new invitation (requires auth)
    if (action === "invite") {
      if (!authHeader) {
        throw new Error("Authentication required");
      }

      const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      if (userError || !user) {
        throw new Error("Invalid authentication");
      }

      const { email, fullName, role, organisationId } = body;

      if (!email || !fullName || !role || !organisationId) {
        throw new Error("Email, name, role, and organisation are required");
      }

      // Verify the inviter has permission (is owner or admin)
      const { data: inviterMember, error: inviterError } = await supabaseAdmin
        .from("organisation_members")
        .select("role")
        .eq("profile_id", user.id)
        .eq("organisation_id", organisationId)
        .eq("status", "active")
        .single();

      if (inviterError || !inviterMember) {
        throw new Error("You don't have access to this organisation");
      }

      if (!["owner", "admin"].includes(inviterMember.role)) {
        throw new Error("Only owners and admins can invite members");
      }

      // Check if user already exists by querying profiles table (scales better than listUsers)
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      // Generate invite token
      const inviteToken = crypto.randomUUID();

      let profileId: string;
      let isExistingUser = false;

      if (existingProfile) {
        // User/profile exists - check if already a member
        const { data: existingMember } = await supabaseAdmin
          .from("organisation_members")
          .select("id")
          .eq("profile_id", existingProfile.id)
          .eq("organisation_id", organisationId)
          .maybeSingle();

        if (existingMember) {
          throw new Error("This user is already a member of your organisation");
        }

        profileId = existingProfile.id;
        isExistingUser = true;
      } else {
        // Create a placeholder profile for the invited user
        const { data: newProfile, error: profileError } = await supabaseAdmin
          .from("profiles")
          .insert({
            id: crypto.randomUUID(),
            email,
            full_name: fullName,
          })
          .select()
          .single();

        if (profileError) {
          console.error("Error creating profile:", profileError);
          throw new Error("Failed to create invitation");
        }

        profileId = newProfile.id;
      }

      // Create the organisation member record
      const { error: memberError } = await supabaseAdmin
        .from("organisation_members")
        .insert({
          organisation_id: organisationId,
          profile_id: profileId,
          role,
          status: "invited",
          invite_token: inviteToken,
        });

      if (memberError) {
        console.error("Error creating member:", memberError);
        throw new Error("Failed to create invitation");
      }

      // Get the organisation name for the email
      const { data: org } = await supabaseAdmin
        .from("organisations")
        .select("name")
        .eq("id", organisationId)
        .single();

      const orgName = org?.name || "Your Organisation";
      const inviteUrl = `${req.headers.get("origin") || supabaseUrl.replace('.supabase.co', '.lovable.app')}/accept-invite?token=${inviteToken}`;
      
      // Send invitation email
      const emailSent = await sendInviteEmail(email, fullName, orgName, role, inviteUrl);
      
      console.log(`Invitation created for ${email}. Email sent: ${emailSent}. Invite URL: ${inviteUrl}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: emailSent ? "Invitation sent" : "Invitation created (email not sent)",
          inviteUrl, // Include URL for manual sharing if email fails
          emailSent,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // RESEND - Resend invitation email (requires auth)
    if (action === "resend") {
      if (!authHeader) {
        throw new Error("Authentication required");
      }

      const { memberId, email } = body;

      // Generate new token
      const newToken = crypto.randomUUID();

      // Get member details for email
      const { data: member, error: memberError } = await supabaseAdmin
        .from("organisation_members")
        .select(`
          id,
          role,
          organisation:organisations!organisation_members_organisation_id_fkey (name),
          profile:profiles!organisation_members_profile_id_fkey (full_name, email)
        `)
        .eq("id", memberId)
        .eq("status", "invited")
        .single();

      if (memberError || !member) {
        throw new Error("Invitation not found or already accepted");
      }

      const { error: updateError } = await supabaseAdmin
        .from("organisation_members")
        .update({ invite_token: newToken })
        .eq("id", memberId)
        .eq("status", "invited");

      if (updateError) {
        throw new Error("Failed to resend invitation");
      }

      const inviteUrl = `${req.headers.get("origin")}/accept-invite?token=${newToken}`;
      
      // Send the email
      const memberEmail = (member.profile as any)?.email || email;
      const memberName = (member.profile as any)?.full_name || "Team Member";
      const orgName = (member.organisation as any)?.name || "Your Organisation";
      
      const emailSent = await sendInviteEmail(memberEmail, memberName, orgName, member.role, inviteUrl);
      
      console.log(`Invitation resent to ${memberEmail}. Email sent: ${emailSent}. New URL: ${inviteUrl}`);

      return new Response(
        JSON.stringify({ success: true, inviteUrl, emailSent }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    console.error("Error in team-invite function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
