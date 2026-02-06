// Stripe product and price configuration
// These IDs are from your Stripe dashboard

export const STRIPE_PRODUCTS = {
  starter: {
    productId: "prod_TvhlSRnZEPA9fh",
    priceId: "price_1SxqLuAZFDMuITvQ0R713pKz",
    name: "Starter",
    price: 49,
    currency: "GBP",
    interval: "month",
    features: [
      "1 active project",
      "5GB document storage",
      "Document management",
      "E-signatures",
      "QR code site access",
      "Site inductions",
      "Email support",
    ],
  },
  professional: {
    productId: "prod_Tvhlx1rQqSEXrr",
    priceId: "price_1SxqMBAZFDMuITvQmi1VUVhu",
    name: "Professional",
    price: 99,
    currency: "GBP",
    interval: "month",
    features: [
      "Up to 5 active projects",
      "25GB document storage",
      "Everything in Starter",
      "Permits to work",
      "Toolbox talks",
      "Inspections & audits",
      "Incident reporting",
      "COSHH register",
      "Compliance calendar",
      "RAMS workflow",
      "Priority support",
    ],
    popular: true,
  },
  enterprise: {
    productId: "prod_Tvhm61rgsuEQEI",
    priceId: "price_1SxqMVAZFDMuITvQtnR3v92b",
    name: "Enterprise",
    price: 199,
    currency: "GBP",
    interval: "month",
    features: [
      "Unlimited projects",
      "100GB document storage",
      "Everything in Professional",
      "Client portal",
      "AI document analysis",
      "Custom branding",
      "API access",
      "Dedicated account manager",
      "Custom integrations",
      "SLA guarantee",
    ],
  },
} as const;

export type SubscriptionTier = keyof typeof STRIPE_PRODUCTS;

// Map Stripe product IDs to tier names
export const PRODUCT_ID_TO_TIER: Record<string, SubscriptionTier> = {
  "prod_TvhlSRnZEPA9fh": "starter",
  "prod_Tvhlx1rQqSEXrr": "professional",
  "prod_Tvhm61rgsuEQEI": "enterprise",
};
