import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { optionalUUID, ValidationError, validationErrorResponse } from "../_shared/validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Map Stripe product IDs to subscription tiers
const PRODUCT_TIER_MAP: Record<string, string> = {
  "prod_U5yQaYflCCRt7V": "starter",
  "prod_U5yRa8ElsPq6UQ": "professional",
  "prod_U5yR6HvjaEKEVA": "enterprise",
};

// Check if an email is in the owner override list
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
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const body = await req.json().catch(() => ({}));
    const requestedOrgId = optionalUUID((body as Record<string, unknown>).organisationId, "organisationId");

    const { data: memberships, error: membershipsError } = await supabaseClient
      .from('organisation_members')
      .select('organisation_id')
      .eq('profile_id', user.id)
      .eq('status', 'active');

    if (membershipsError) throw membershipsError;

    const activeOrgIds = (memberships ?? []).map((membership) => membership.organisation_id);
    const organisationId = requestedOrgId ?? (
      activeOrgIds.length === 1 ? activeOrgIds[0] : null
    );

    if (!organisationId) {
      return new Response(JSON.stringify({
        subscribed: false,
        tier: null,
        subscription_end: null,
        stripe_customer_id: null,
        error: "organisationId is required when you belong to multiple organisations",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (!activeOrgIds.includes(organisationId)) {
      return new Response(JSON.stringify({ error: "You do not have access to this organisation" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const { data: orgData, error: orgError } = await supabaseClient
      .from('organisations')
      .select('subscription_status, subscription_tier, trial_ends_at, stripe_customer_id, stripe_subscription_id')
      .eq('id', organisationId)
      .single();

    if (orgError || !orgData) throw orgError ?? new Error("Organisation not found");

    // Owner override: grant free Enterprise access
    if (isOwnerEmail(user.email)) {
      logStep("Owner email detected, granting Enterprise override", { email: user.email, organisationId });

      await supabaseClient
        .from('organisations')
        .update({
          subscription_tier: 'enterprise',
          subscription_status: 'active',
        })
        .eq('id', organisationId);
      logStep("Organisation updated with owner Enterprise override");

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

    if (orgData.subscription_status === 'trialing' && orgData.trial_ends_at) {
      const trialEnd = new Date(orgData.trial_ends_at);
      if (trialEnd > new Date()) {
        logStep("Active trial found in database", {
          organisationId,
          tier: orgData.subscription_tier,
          trialEndsAt: orgData.trial_ends_at,
        });
        return new Response(JSON.stringify({
          subscribed: true,
          tier: orgData.subscription_tier || 'enterprise',
          subscription_end: orgData.trial_ends_at,
          stripe_customer_id: orgData.stripe_customer_id,
          stripe_subscription_id: orgData.stripe_subscription_id,
          trial: true,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      } else {
        logStep("Trial expired, falling through to Stripe check", {
          organisationId,
          trialEndsAt: orgData.trial_ends_at,
        });
      }
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    if (!orgData.stripe_customer_id && !orgData.stripe_subscription_id) {
      logStep("No Stripe identifiers stored on organisation", { organisationId });
      return new Response(JSON.stringify({ 
        subscribed: false,
        tier: null,
        subscription_end: null,
        stripe_customer_id: null,
        stripe_subscription_id: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    let activeSubscription: Stripe.Subscription | null = null;
    let customerId = orgData.stripe_customer_id ?? null;

    if (orgData.stripe_subscription_id) {
      const subscription = await stripe.subscriptions.retrieve(orgData.stripe_subscription_id);
      if (subscription.customer) {
        customerId = String(subscription.customer);
      }
      if (["active", "trialing"].includes(subscription.status)) {
        activeSubscription = subscription;
      }
    }

    if (!activeSubscription && orgData.stripe_customer_id) {
      const subscriptions = await stripe.subscriptions.list({
        customer: orgData.stripe_customer_id,
        status: "active",
        limit: 1,
      });
      activeSubscription = subscriptions.data[0] ?? null;
    }

    const hasActiveSub = !!activeSubscription;
    let tier: string | null = null;
    let subscriptionEnd: string | null = null;
    let stripeSubscriptionId: string | null = activeSubscription?.id ?? orgData.stripe_subscription_id ?? null;

    if (activeSubscription) {
      subscriptionEnd = new Date(activeSubscription.current_period_end * 1000).toISOString();
      logStep("Active subscription found", {
        organisationId,
        subscriptionId: activeSubscription.id,
        endDate: subscriptionEnd,
      });
      
      const productId = activeSubscription.items.data[0].price.product as string;
      tier = PRODUCT_TIER_MAP[productId] || "starter";
      logStep("Determined subscription tier", { productId, tier });

      await supabaseClient
        .from('organisations')
        .update({
          stripe_customer_id: customerId,
          stripe_subscription_id: stripeSubscriptionId,
          subscription_tier: tier,
          subscription_status: 'active',
        })
        .eq('id', organisationId);
      logStep("Organisation updated with subscription info", { organisationId });
    } else {
      logStep("No active subscription found", { organisationId });
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
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, corsHeaders);
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
