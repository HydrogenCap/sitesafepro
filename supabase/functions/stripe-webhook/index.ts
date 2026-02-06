import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Map Stripe product IDs to subscription tiers
const PRODUCT_ID_TO_TIER: Record<string, "starter" | "professional" | "enterprise"> = {
  "prod_TvhlSRnZEPA9fh": "starter",
  "prod_Tvhlx1rQqSEXrr": "professional",
  "prod_Tvhm61rgsuEQEI": "enterprise",
};

// Map tiers to max projects
const TIER_MAX_PROJECTS: Record<string, number> = {
  starter: 1,
  professional: 5,
  enterprise: 999, // Unlimited
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  
  if (!stripeKey) {
    logStep("ERROR: STRIPE_SECRET_KEY not set");
    return new Response(JSON.stringify({ error: "Stripe key not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const body = await req.text();
    let event: Stripe.Event;

    // Verify webhook signature if secret is configured
    if (webhookSecret) {
      const signature = req.headers.get("stripe-signature");
      if (!signature) {
        logStep("ERROR: Missing stripe-signature header");
        return new Response(JSON.stringify({ error: "Missing signature" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err) {
        logStep("ERROR: Invalid signature", { error: err.message });
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // For development/testing without webhook secret
      event = JSON.parse(body);
      logStep("WARNING: No webhook secret configured, skipping signature verification");
    }

    logStep("Processing event", { type: event.type, id: event.id });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout completed", { 
          customerId: session.customer, 
          subscriptionId: session.subscription,
          customerEmail: session.customer_email 
        });

        // Get customer email to find the organisation
        const customerEmail = session.customer_email || session.customer_details?.email;
        if (!customerEmail) {
          logStep("ERROR: No customer email in session");
          break;
        }

        // Find the profile by email
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", customerEmail)
          .single();

        if (profileError || !profile) {
          logStep("ERROR: Could not find profile", { email: customerEmail, error: profileError });
          break;
        }

        // Find organisation by owner
        const { data: membership, error: memberError } = await supabase
          .from("organisation_members")
          .select("organisation_id")
          .eq("profile_id", profile.id)
          .eq("role", "owner")
          .eq("status", "active")
          .single();

        if (memberError || !membership) {
          logStep("ERROR: Could not find organisation", { profileId: profile.id, error: memberError });
          break;
        }

        // Get subscription details
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const productId = subscription.items.data[0]?.price.product as string;
          const tier = PRODUCT_ID_TO_TIER[productId] || "starter";
          const maxProjects = TIER_MAX_PROJECTS[tier];

          // Update organisation
          const { error: updateError } = await supabase
            .from("organisations")
            .update({
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
              subscription_tier: tier,
              subscription_status: "active",
              max_projects: maxProjects,
              trial_ends_at: null,
            })
            .eq("id", membership.organisation_id);

          if (updateError) {
            logStep("ERROR: Failed to update organisation", { error: updateError });
          } else {
            logStep("Organisation updated successfully", { 
              orgId: membership.organisation_id, 
              tier, 
              maxProjects 
            });
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription updated", { 
          subscriptionId: subscription.id, 
          status: subscription.status 
        });

        const productId = subscription.items.data[0]?.price.product as string;
        const tier = PRODUCT_ID_TO_TIER[productId] || "starter";
        const maxProjects = TIER_MAX_PROJECTS[tier];

        // Map Stripe status to our status
        let subscriptionStatus: "active" | "past_due" | "cancelled" | "trialing" = "active";
        if (subscription.status === "past_due") subscriptionStatus = "past_due";
        else if (subscription.status === "canceled" || subscription.status === "unpaid") subscriptionStatus = "cancelled";
        else if (subscription.status === "trialing") subscriptionStatus = "trialing";

        const { error: updateError } = await supabase
          .from("organisations")
          .update({
            subscription_tier: tier,
            subscription_status: subscriptionStatus,
            max_projects: maxProjects,
          })
          .eq("stripe_subscription_id", subscription.id);

        if (updateError) {
          logStep("ERROR: Failed to update subscription", { error: updateError });
        } else {
          logStep("Subscription updated in DB", { tier, status: subscriptionStatus });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription cancelled", { subscriptionId: subscription.id });

        // Downgrade to starter/cancelled status
        const { error: updateError } = await supabase
          .from("organisations")
          .update({
            subscription_tier: "starter",
            subscription_status: "cancelled",
            max_projects: 1,
          })
          .eq("stripe_subscription_id", subscription.id);

        if (updateError) {
          logStep("ERROR: Failed to update cancelled subscription", { error: updateError });
        } else {
          logStep("Subscription cancelled in DB");
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Payment failed", { 
          invoiceId: invoice.id, 
          subscriptionId: invoice.subscription 
        });

        if (invoice.subscription) {
          const { error: updateError } = await supabase
            .from("organisations")
            .update({
              subscription_status: "past_due",
            })
            .eq("stripe_subscription_id", invoice.subscription as string);

          if (updateError) {
            logStep("ERROR: Failed to update payment failed status", { error: updateError });
          } else {
            logStep("Organisation marked as past_due");
          }
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    logStep("ERROR: Webhook processing failed", { error: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
