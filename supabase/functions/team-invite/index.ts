import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

      const email = (member.profile as any)?.email;
      const fullName = (member.profile as any)?.full_name;

      if (!email) {
        throw new Error("No email associated with this invitation");
      }

      // Create the user account in auth.users
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

      // Update the profile to link to the new auth user
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({ id: authUser.user.id })
        .eq("id", member.profile_id);

      if (profileError) {
        console.error("Error updating profile:", profileError);
        // Profile might have trigger that creates it, try to continue
      }

      // Update the organisation member record
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

      // Check if user already exists in auth
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users.find(u => u.email === email);

      // Generate invite token
      const inviteToken = crypto.randomUUID();

      let profileId: string;

      if (existingUser) {
        // User exists - check if already a member
        const { data: existingMember } = await supabaseAdmin
          .from("organisation_members")
          .select("id")
          .eq("profile_id", existingUser.id)
          .eq("organisation_id", organisationId)
          .single();

        if (existingMember) {
          throw new Error("This user is already a member of your organisation");
        }

        profileId = existingUser.id;
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

      // In a real app, you would send an email here
      // For now, we'll return the invite link
      const inviteUrl = `${req.headers.get("origin") || supabaseUrl.replace('.supabase.co', '.lovable.app')}/accept-invite?token=${inviteToken}`;
      
      console.log(`Invitation created for ${email}. Invite URL: ${inviteUrl}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Invitation sent",
          inviteUrl, // In production, this would be sent via email
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

      const { error: updateError } = await supabaseAdmin
        .from("organisation_members")
        .update({ invite_token: newToken })
        .eq("id", memberId)
        .eq("status", "invited");

      if (updateError) {
        throw new Error("Failed to resend invitation");
      }

      const inviteUrl = `${req.headers.get("origin")}/accept-invite?token=${newToken}`;
      
      console.log(`Invitation resent to ${email}. New URL: ${inviteUrl}`);

      return new Response(
        JSON.stringify({ success: true, inviteUrl }),
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
