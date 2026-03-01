import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireString, requireUUID, optionalString, ValidationError, validationErrorResponse } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateOrgRequest {
  userId: string;
  companyName: string;
  phone?: string;
  email?: string;
  fullName?: string;
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

    const body = await req.json();
    const userId = requireUUID(body.userId, "userId");
    const companyName = requireString(body.companyName, "companyName", { maxLength: 200 });
    const phone = optionalString(body.phone, "phone", { maxLength: 30 });
    const email = optionalString(body.email, "email", { maxLength: 255 });
    const fullName = optionalString(body.fullName, "fullName", { maxLength: 100 });

    console.log(`Creating organisation for user ${userId}, company: ${companyName}`);

    // Check if profile exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (!existingProfile) {
      console.log(`Profile not found, creating one for user ${userId}`);
      
      // Create the profile - FK constraint removed so this should work
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          email: email || 'unknown@example.com',
          full_name: fullName || 'User',
        });

      if (profileError) {
        console.error("Error creating profile:", profileError);
        return new Response(
          JSON.stringify({ error: `Failed to create profile: ${profileError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log(`Profile created for user ${userId}`);
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

    // Seed default document templates for the new organisation
    try {
      // Get the base URL from the request or use a default
      const url = new URL(req.url);
      const baseUrl = url.origin.replace('supabase.co/functions', 'lovable.app');
      
      // Call the seed-default-templates function
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const seedResponse = await fetch(`${supabaseUrl}/functions/v1/seed-default-templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          organisationId: orgData.id,
          userId: userId,
          baseUrl: 'https://sitesafepro.lovable.app', // Use published app URL for templates
        }),
      });

      if (seedResponse.ok) {
        const seedResult = await seedResponse.json();
        console.log(`Default templates seeded: ${seedResult.templatesCreated} created`);
      } else {
        console.error("Failed to seed default templates:", await seedResponse.text());
      }
    } catch (seedError) {
      // Log but don't fail org creation if template seeding fails
      console.error("Error seeding default templates:", seedError);
    }

    console.log(`Organisation setup complete for user ${userId}`);

    return new Response(
      JSON.stringify({ success: true, organisation: orgData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, corsHeaders);
    }
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred creating your organisation" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});