import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";

const tiers = [
  {
    name: "Starter",
    description: "Perfect for single-site contractors",
    monthlyPrice: 49,
    yearlyPrice: 470,
    features: [
      "1 active project",
      "Up to 10 contractor accounts",
      "Documents & e-signatures",
      "Site induction register",
      "QR site access & headcount",
      "Basic compliance dashboard",
      "5 GB document storage",
      "Email support",
    ],
    popular: false,
  },
  {
    name: "Professional",
    description: "For growing contractors with multiple sites",
    monthlyPrice: 99,
    yearlyPrice: 950,
    features: [
      "Up to 5 active projects",
      "Unlimited contractor accounts",
      "Everything in Starter, plus:",
      "Permits to work module",
      "35 pre-loaded toolbox talks",
      "Scaffold & site inspections",
      "Incident reporting (RIDDOR)",
      "COSHH register",
      "Compliance calendar",
      "Sub-contractor RAMS workflow",
      "25 GB storage",
      "Priority support",
    ],
    popular: true,
  },
  {
    name: "Enterprise",
    description: "For large contractors and developers",
    monthlyPrice: 199,
    yearlyPrice: 1910,
    features: [
      "Unlimited active projects",
      "Everything in Professional, plus:",
      "Client portal (read-only)",
      "AI-powered RAMS analysis",
      "Digital H&S File builder",
      "Custom branding",
      "Advanced reporting & PDF export",
      "API access",
      "100 GB storage",
      "Phone & email support",
      "Dedicated onboarding",
    ],
    popular: false,
  },
];

export const PricingSection = () => {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <section id="pricing" className="py-24 bg-background">
      <div className="container mx-auto">
        {/* Section header */}
        <div className="text-center mb-12">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium mb-4"
          >
            Pricing
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4"
          >
            Simple, transparent pricing
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-foreground mb-8"
          >
            Start with a 14-day free trial. No credit card required.
          </motion.p>

          {/* Billing toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-4 bg-muted p-1.5 rounded-full"
          >
            <button
              onClick={() => setIsYearly(false)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                !isYearly
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                isYearly
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Yearly
              <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full font-semibold">
                Save 20%
              </span>
            </button>
          </motion.div>
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {tiers.map((tier, index) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`relative bg-card rounded-2xl p-8 border-2 transition-all duration-300 ${
                tier.popular
                  ? "border-primary shadow-xl shadow-primary/10 scale-105"
                  : "border-border/50 hover:border-primary/30 shadow-md hover:shadow-lg"
              }`}
            >
              {/* Popular badge */}
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-semibold">
                    <Sparkles className="w-4 h-4" />
                    Most Popular
                  </div>
                </div>
              )}

              {/* Tier name */}
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-foreground mb-2">
                  {tier.name}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {tier.description}
                </p>
              </div>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl md:text-5xl font-bold text-foreground">
                    £{isYearly ? tier.yearlyPrice : tier.monthlyPrice}
                  </span>
                  <span className="text-muted-foreground">
                    /{isYearly ? "year" : "month"}
                  </span>
                </div>
                {isYearly && (
                  <p className="text-sm text-success mt-1">
                    Save £{tier.monthlyPrice * 12 - tier.yearlyPrice}/year
                  </p>
                )}
              </div>

              {/* CTA */}
              <Button
                variant={tier.popular ? "pricingAccent" : "pricing"}
                size="lg"
                className="w-full mb-8"
              >
                Start Free Trial
              </Button>

              {/* Features */}
              <ul className="space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Contractor note */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center text-muted-foreground mt-12"
        >
          <span className="font-semibold text-foreground">
            Contractor accounts are always free.
          </span>{" "}
          Your sub-contractors can view documents, sign off, and upload RAMS at no cost.
        </motion.p>
      </div>
    </section>
  );
};
