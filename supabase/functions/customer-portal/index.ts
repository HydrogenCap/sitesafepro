import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // [P2 FIX] Accept optional organisation_id to scope to the correct org
    let targetOrgId: string | null = null;
    try {
      const body = await req.json();
      targetOrgId = body.organisation_id ?? null;
    } catch {
      // empty body is fine
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // [P2 FIX] Prefer org's stored stripe_customer_id over email lookup
    let customerId: string | null = null;

    if (targetOrgId) {
      // Verify caller is a member of this org
      const { data: membership } = await supabaseClient
        .from('organisation_members')
        .select('organisation_id')
        .eq('profile_id', user.id)
        .eq('organisation_id', targetOrgId)
        .eq('status', 'active')
        .maybeSingle();

      if (membership) {
        const { data: orgData } = await supabaseClient
          .from('organisations')
          .select('stripe_customer_id')
          .eq('id', targetOrgId)
          .single();

        customerId = orgData?.stripe_customer_id ?? null;
      }
    }

    // Fallback to email lookup
    if (!customerId) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length === 0) {
        throw new Error("No Stripe customer found for this user. Please subscribe first.");
      }
      customerId = customers.data[0].id;
    }

    logStep("Found Stripe customer", { customerId });

    const appOrigin = getTrustedAppOrigin(req);
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appOrigin}/dashboard`,
    });
    logStep("Customer portal session created", { sessionId: portalSession.id, url: portalSession.url });

    return new Response(JSON.stringify({ url: portalSession.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in customer-portal", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
