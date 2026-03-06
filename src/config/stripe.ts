// Stripe product and price configuration
// Use environment variables for product/price IDs when available, 
// with fallbacks for development

const getEnvVar = (key: string, fallback: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key] || fallback;
  }
  return fallback;
};

export const STRIPE_PRODUCTS = {
  starter: {
    productId: getEnvVar('VITE_STRIPE_STARTER_PRODUCT_ID', 'prod_U5yQaYflCCRt7V'),
    priceId: getEnvVar('VITE_STRIPE_STARTER_PRICE_ID', 'price_1T7mTrPRQEJHylx3Lt7ysocd'),
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
    productId: getEnvVar('VITE_STRIPE_PROFESSIONAL_PRODUCT_ID', 'prod_U5yRa8ElsPq6UQ'),
    priceId: getEnvVar('VITE_STRIPE_PROFESSIONAL_PRICE_ID', 'price_1T7mULPRQEJHylx3HSDq2L0b'),
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
    productId: getEnvVar('VITE_STRIPE_ENTERPRISE_PRODUCT_ID', 'prod_Tvhm61rgsuEQEI'),
    priceId: getEnvVar('VITE_STRIPE_ENTERPRISE_PRICE_ID', 'price_1SxqMVAZFDMuITvQtnR3v92b'),
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

// Build dynamic product ID to tier mapping
export const PRODUCT_ID_TO_TIER: Record<string, SubscriptionTier> = {
  [STRIPE_PRODUCTS.starter.productId]: "starter",
  [STRIPE_PRODUCTS.professional.productId]: "professional",
  [STRIPE_PRODUCTS.enterprise.productId]: "enterprise",
};
