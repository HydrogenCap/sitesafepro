import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireUUID, ValidationError, validationErrorResponse } from "../_shared/validation.ts";
import { getTrustedAppOrigin } from "../_shared/app-origin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CUSTOMER-PORTAL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_LIVE_KEY") || Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("No Stripe key found (checked STRIPE_LIVE_KEY and STRIPE_SECRET_KEY)");
    logStep("Stripe key verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");

    const body = await req.json();
    const organisationId = requireUUID(body.organisationId, "organisationId");
    logStep("User authenticated", { userId: user.id, organisationId });

    const { data: membership, error: membershipError } = await supabaseClient
      .from("organisation_members")
      .select("organisation_id")
      .eq("profile_id", user.id)
      .eq("organisation_id", organisationId)
      .eq("status", "active")
      .maybeSingle();

    if (membershipError || !membership) {
      return new Response(JSON.stringify({ error: "You do not have access to this organisation" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const { data: organisation, error: organisationError } = await supabaseClient
      .from("organisations")
      .select("stripe_customer_id")
      .eq("id", organisationId)
      .single();

    if (organisationError || !organisation?.stripe_customer_id) {
      throw new Error("No Stripe customer found for this organisation. Please subscribe first.");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customerId = organisation.stripe_customer_id;
    logStep("Found Stripe customer", { customerId });

    const origin = getTrustedAppOrigin(req);
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/dashboard`,
    });
    logStep("Customer portal session created", { sessionId: portalSession.id, url: portalSession.url });

    return new Response(JSON.stringify({ url: portalSession.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, corsHeaders);
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in customer-portal", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
