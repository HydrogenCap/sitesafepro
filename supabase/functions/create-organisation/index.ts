import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateOrgRequest {
  userId: string;
  companyName: string;
  phone?: string;
}

// Helper to wait for profile to be created by trigger
async function waitForProfile(supabase: any, userId: string, maxAttempts = 10): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();
    
    if (profile) {
      console.log(`Profile found on attempt ${i + 1}`);
      return true;
    }
    
    console.log(`Profile not found, attempt ${i + 1}/${maxAttempts}, waiting...`);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { userId, companyName, phone }: CreateOrgRequest = await req.json();

    if (!userId || !companyName) {
      return new Response(
        JSON.stringify({ error: "Missing userId or companyName" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Creating organisation for user ${userId}, company: ${companyName}`);

    // Wait for the profile to be created by the auth trigger
    const profileExists = await waitForProfile(supabaseAdmin, userId);
    
    if (!profileExists) {
      console.error("Profile was not created in time");
      return new Response(
        JSON.stringify({ error: "User profile not ready. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate unique slug
    const { data: slugData } = await supabaseAdmin.rpc('generate_unique_slug', {
      base_name: companyName
    });

    const slug = slugData || companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // Create organisation with trial status
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organisations')
      .insert({
        name: companyName,
        slug: slug,
        owner_id: userId,
        phone: phone || null,
        subscription_status: 'trialing',
        subscription_tier: 'enterprise',
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (orgError) {
      console.error("Error creating organisation:", orgError);
      return new Response(
        JSON.stringify({ error: orgError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Organisation created: ${orgData.id}`);

    // Create organisation membership as owner
    const { error: memberError } = await supabaseAdmin
      .from('organisation_members')
      .insert({
        organisation_id: orgData.id,
        profile_id: userId,
        role: 'owner',
        status: 'active',
        accepted_at: new Date().toISOString(),
      });

    if (memberError) {
      console.error("Error creating membership:", memberError);
      return new Response(
        JSON.stringify({ error: memberError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update profile with phone if provided
    if (phone) {
      await supabaseAdmin
        .from('profiles')
        .update({ phone })
        .eq('id', userId);
    }

    console.log(`Organisation setup complete for user ${userId}`);

    return new Response(
      JSON.stringify({ success: true, organisation: orgData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});