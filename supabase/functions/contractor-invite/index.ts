import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireString, requireEmail, requireUUID, optionalString, ValidationError, validationErrorResponse } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sendContractorInviteEmail(
  to: string,
  contactName: string,
  companyName: string,
  organisationName: string,
  inviteUrl: string,
  message?: string
): Promise<boolean> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.log("RESEND_API_KEY not configured, skipping email");
    return false;
  }

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #0ea5e9; margin: 0; font-size: 28px;">SiteSafe Pro</h1>
        <p style="color: #64748b; margin: 5px 0 0;">Construction Safety Management</p>
      </div>
      
      <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; padding: 30px; margin-bottom: 20px;">
        <h2 style="margin: 0 0 10px; color: #0c4a6e;">Contractor Invitation</h2>
        <p style="margin: 0; color: #334155;">
          Hi <strong>${contactName}</strong>,
        </p>
        <p style="color: #334155;">
          <strong>${organisationName}</strong> has invited <strong>${companyName}</strong> to join their contractor portal on SiteSafe Pro.
        </p>
        ${message ? `<p style="color: #475569; font-style: italic; background: white; border-radius: 8px; padding: 12px; margin-top: 15px;">"${message}"</p>` : ""}
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Accept &amp; Set Up Your Account
        </a>
      </div>

      <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 10px; color: #334155; font-size: 14px;">Once you accept, you'll be able to:</h3>
        <ul style="margin: 0; padding-left: 20px; color: #64748b;">
          <li>Upload compliance documents (insurance, CSCS, accreditations)</li>
          <li>Track your compliance status in real time</li>
          <li>Get notified before documents expire</li>
          <li>View assigned project details</li>
        </ul>
      </div>

      <p style="color: #64748b; font-size: 13px; text-align: center;">
        This invitation link will expire in 7 days. If you didn't expect this email, you can safely ignore it.
      </p>
      
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
      <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
        &copy; ${new Date().getFullYear()} SiteSafe Pro. All rights reserved.
      </p>
    </body>
    </html>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "SiteSafe Pro <noreply@resend.dev>",
        to: [to],
        subject: `${organisationName} has invited ${companyName} to SiteSafe Pro`,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      console.error("Resend error:", await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error("Email send error:", error);
    return false;
  }
}

function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.includes("duplicate key") || msg.includes("already")) return "This contractor has already been invited";
    if (msg.includes("not found")) return msg;
    return msg;
  }
  return "An unexpected error occurred";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get("Authorization");
    const body = await req.json();
    const { action } = body;

    // ── INVITE ─────────────────────────────────────────────
    if (action === "invite") {
      if (!authHeader) throw new Error("Authentication required");

      const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      if (userError || !user) throw new Error("Invalid authentication");

      const email = requireEmail(body.email, "email");
      const contactName = requireString(body.contactName, "contactName", { maxLength: 100 });
      const companyName = requireString(body.companyName, "companyName", { maxLength: 200 });
      const organisationId = requireUUID(body.organisationId, "organisationId");
      const primaryTrade = requireString(body.primaryTrade, "primaryTrade", { maxLength: 100 });
      const message = optionalString(body.message, "message", { maxLength: 1000 });
      const requiredDocTypes: string[] = body.requiredDocTypes || [];

      // Verify inviter is owner/admin/site_manager
      const { data: inviterMember } = await supabaseAdmin
        .from("organisation_members")
        .select("role")
        .eq("profile_id", user.id)
        .eq("organisation_id", organisationId)
        .eq("status", "active")
        .single();

      if (!inviterMember || !["owner", "admin", "site_manager"].includes(inviterMember.role)) {
        throw new Error("Insufficient permissions to invite contractors");
      }

      // Check if email already exists as a contractor in this org
      const { data: existingInvite } = await supabaseAdmin
        .from("contractor_invitations")
        .select("id, status")
        .eq("email", email)
        .eq("organisation_id", organisationId)
        .in("status", ["pending"])
        .maybeSingle();

      if (existingInvite) {
        throw new Error("This email already has a pending contractor invitation");
      }

      // Create or find profile
      let profileId: string;
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (existingProfile) {
        profileId = existingProfile.id;
        // Check if already a member
        const { data: existingMember } = await supabaseAdmin
          .from("organisation_members")
          .select("id")
          .eq("profile_id", existingProfile.id)
          .eq("organisation_id", organisationId)
          .maybeSingle();

        if (existingMember) {
          throw new Error("This user is already a member of your organisation");
        }
      } else {
        const { data: newProfile, error: profileError } = await supabaseAdmin
          .from("profiles")
          .insert({ id: crypto.randomUUID(), email, full_name: contactName })
          .select()
          .single();
        if (profileError) throw new Error("Failed to create profile");
        profileId = newProfile.id;
      }

      // Create org member with contractor role
      const inviteToken = crypto.randomUUID();
      const { error: memberError } = await supabaseAdmin
        .from("organisation_members")
        .insert({
          organisation_id: organisationId,
          profile_id: profileId,
          role: "contractor",
          status: "invited",
          invite_token: inviteToken,
        });
      if (memberError) throw new Error("Failed to create membership: " + memberError.message);

      // Create contractor company record
      const { data: contractorCompany, error: companyError } = await supabaseAdmin
        .from("contractor_companies")
        .insert({
          organisation_id: organisationId,
          company_name: companyName,
          primary_contact_name: contactName,
          primary_contact_email: email,
          primary_trade: primaryTrade,
          required_doc_types: requiredDocTypes,
          compliance_status: "incomplete",
          compliance_score: 0,
          is_active: true,
          is_approved: false,
        })
        .select("id")
        .single();
      if (companyError) throw new Error("Failed to create contractor company: " + companyError.message);

      // Create contractor invitation record
      await supabaseAdmin
        .from("contractor_invitations")
        .insert({
          organisation_id: organisationId,
          email,
          company_name: companyName,
          contractor_company_id: contractorCompany.id,
          invited_by: user.id,
          message: message || null,
          required_doc_types: requiredDocTypes,
          status: "pending",
          invite_token: inviteToken,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });

      // Get org name for email
      const { data: org } = await supabaseAdmin
        .from("organisations")
        .select("name")
        .eq("id", organisationId)
        .single();

      const origin = req.headers.get("origin") || "https://sitesafepro.lovable.app";
      const inviteUrl = `${origin}/accept-invite?token=${inviteToken}`;

      const emailSent = await sendContractorInviteEmail(
        email, contactName, companyName, org?.name || "Organisation", inviteUrl, message || undefined
      );

      // Audit log
      await supabaseAdmin.rpc("log_audit_event", {
        p_org_id: organisationId,
        p_entity_type: "contractor",
        p_entity_id: contractorCompany.id,
        p_action: "invite",
        p_metadata: { email, company_name: companyName, primary_trade: primaryTrade },
      });

      return new Response(
        JSON.stringify({
          success: true,
          contractorCompanyId: contractorCompany.id,
          inviteUrl,
          emailSent,
          message: emailSent ? "Contractor invitation sent" : "Invitation created (email not sent)",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── VALIDATE ─────────────────────────────────────────
    if (action === "validate") {
      const { token } = body;
      if (!token) {
        return new Response(
          JSON.stringify({ valid: false, message: "No token provided" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check contractor_invitations first
      const { data: invite } = await supabaseAdmin
        .from("contractor_invitations")
        .select("id, company_name, email, status, expires_at, organisation_id, required_doc_types, organisations(name)")
        .eq("invite_token", token)
        .maybeSingle();

      if (invite) {
        if (invite.status !== "pending") {
          return new Response(
            JSON.stringify({ valid: false, message: "This invitation has already been used" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (new Date(invite.expires_at) < new Date()) {
          return new Response(
            JSON.stringify({ valid: false, message: "This invitation has expired" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({
            valid: true,
            invite: {
              organisationName: (invite.organisations as any)?.name || "Organisation",
              role: "contractor",
              email: invite.email,
              companyName: invite.company_name,
              requiredDocs: invite.required_doc_types || [],
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fall through — not a contractor invite token
      return new Response(
        JSON.stringify({ valid: false, message: "Invalid invitation token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── ACCEPT ───────────────────────────────────────────
    if (action === "accept") {
      const { token, password } = body;
      if (!token || !password) throw new Error("Token and password are required");

      // Find the contractor invitation
      const { data: invite } = await supabaseAdmin
        .from("contractor_invitations")
        .select("*, contractor_company_id")
        .eq("invite_token", token)
        .eq("status", "pending")
        .maybeSingle();

      if (!invite) throw new Error("Invalid or expired invitation");

      // Find org member by invite_token
      const { data: member } = await supabaseAdmin
        .from("organisation_members")
        .select("id, profile_id, organisation_id, profile:profiles!organisation_members_profile_id_fkey(id, email, full_name)")
        .eq("invite_token", token)
        .eq("status", "invited")
        .single();

      if (!member) throw new Error("Membership record not found");

      const placeholderProfileId = member.profile_id;
      const email = (member.profile as any)?.email;
      const fullName = (member.profile as any)?.full_name;

      if (!email) throw new Error("No email associated with invitation");

      // Create auth user
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (authError) throw new Error(authError.message);

      // Update org membership
      await supabaseAdmin
        .from("organisation_members")
        .update({
          profile_id: authUser.user.id,
          status: "active",
          accepted_at: new Date().toISOString(),
          invite_token: null,
        })
        .eq("id", member.id);

      // Update contractor invitation
      await supabaseAdmin
        .from("contractor_invitations")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
          accepted_by: authUser.user.id,
        })
        .eq("id", invite.id);

      // Clean up placeholder profile
      if (placeholderProfileId !== authUser.user.id) {
        await supabaseAdmin.from("profiles").delete().eq("id", placeholderProfileId);
      }

      console.log(`Contractor ${email} accepted invitation for ${invite.company_name}`);

      return new Response(
        JSON.stringify({ success: true, message: "Account created successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, corsHeaders);
    }
    console.error("contractor-invite error:", error);
    return new Response(
      JSON.stringify({ error: sanitizeErrorMessage(error) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
