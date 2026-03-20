import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

const PRODUCT_TIER_MAP: Record<string, string> = {
  "prod_U5yQaYflCCRt7V": "starter",
  "prod_U5yRa8ElsPq6UQ": "professional",
  "prod_U5yR6HvjaEKEVA": "enterprise",
};

const isOwnerEmail = (email: string): boolean => {
  const ownerEmails = Deno.env.get("OWNER_EMAILS") || "";
  if (!ownerEmails) return false;
  const emails = ownerEmails.split(",").map(e => e.trim().toLowerCase());
  return emails.includes(email.toLowerCase());
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_LIVE_KEY") || Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("No Stripe key found (checked STRIPE_LIVE_KEY and STRIPE_SECRET_KEY)");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // [P2 FIX] Accept optional organisation_id from client to scope to the active org
    let targetOrgId: string | null = null;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        targetOrgId = body.organisation_id ?? null;
      } catch {
        // GET requests or empty body — fall through
      }
    }

    // Resolve the target organisation membership
    let memberQuery = supabaseClient
      .from('organisation_members')
      .select('organisation_id')
      .eq('profile_id', user.id)
      .eq('status', 'active');

    if (targetOrgId) {
      memberQuery = memberQuery.eq('organisation_id', targetOrgId);
    }

    const { data: memberData } = await memberQuery.limit(1).single();

    if (!memberData) {
      return new Response(JSON.stringify({ subscribed: false, tier: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const orgId = memberData.organisation_id;

    // Owner override
    if (isOwnerEmail(user.email)) {
      logStep("Owner email detected, granting Enterprise override");
      await supabaseClient
        .from('organisations')
        .update({ subscription_tier: 'enterprise', subscription_status: 'active' })
        .eq('id', orgId);

      return new Response(JSON.stringify({
        subscribed: true,
        tier: 'enterprise',
        subscription_end: null,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        owner_override: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check database trial status
    const { data: orgData } = await supabaseClient
      .from('organisations')
      .select('subscription_status, subscription_tier, trial_ends_at, stripe_customer_id')
      .eq('id', orgId)
      .single();

    if (orgData?.subscription_status === 'trialing' && orgData.trial_ends_at) {
      const trialEnd = new Date(orgData.trial_ends_at);
      if (trialEnd > new Date()) {
        logStep("Active trial found", { tier: orgData.subscription_tier, trialEndsAt: orgData.trial_ends_at });
        return new Response(JSON.stringify({
          subscribed: true,
          tier: orgData.subscription_tier || 'enterprise',
          subscription_end: orgData.trial_ends_at,
          stripe_customer_id: null,
          stripe_subscription_id: null,
          trial: true,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // [P2 FIX] Use org's stored stripe_customer_id first, fall back to email lookup
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    let customerId: string | null = orgData?.stripe_customer_id ?? null;

    if (!customerId) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length === 0) {
        logStep("No customer found, user is not subscribed");
        return new Response(JSON.stringify({
          subscribed: false,
          tier: null,
          subscription_end: null,
          stripe_customer_id: null,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      customerId = customers.data[0].id;
    }

    logStep("Using Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let tier: string | null = null;
    let subscriptionEnd: string | null = null;
    let stripeSubscriptionId: string | null = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      stripeSubscriptionId = subscription.id;
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();

      const productId = subscription.items.data[0].price.product as string;
      tier = PRODUCT_TIER_MAP[productId] || "starter";
      logStep("Active subscription found", { tier, subscriptionId: subscription.id });

      // Update the specific organisation
      await supabaseClient
        .from('organisations')
        .update({
          stripe_customer_id: customerId,
          stripe_subscription_id: stripeSubscriptionId,
          subscription_tier: tier,
          subscription_status: 'active',
        })
        .eq('id', orgId);
      logStep("Organisation updated with subscription info");
    } else {
      logStep("No active subscription found");
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      tier,
      subscription_end: subscriptionEnd,
      stripe_customer_id: customerId,
      stripe_subscription_id: stripeSubscriptionId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
