import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What happens after the 14-day free trial?",
    answer:
      "After your trial ends, you can choose to subscribe to any of our plans. If you don't subscribe, your account will be converted to a free contractor account, and you'll still be able to access any organisations that invite you. Your data is never deleted.",
  },
  {
    question: "Do I need to provide a credit card to start the trial?",
    answer:
      "No, you can start your 14-day free trial without providing any payment information. You'll only need to add a payment method when you're ready to subscribe.",
  },
  {
    question: "Are contractor accounts really free?",
    answer:
      "Yes! Contractors invited by a paying customer get completely free access. They can view documents, sign acknowledgements, scan QR codes, attend toolbox talks, and upload their RAMS—all at no cost. This removes friction from adoption.",
  },
  {
    question: "Can I upgrade or downgrade my plan at any time?",
    answer:
      "Absolutely. You can upgrade or downgrade your plan at any time from your billing settings. When upgrading, you'll be charged a prorated amount. When downgrading, the new rate applies from your next billing cycle.",
  },
  {
    question: "Is SiteSafe Pro compliant with UK CDM 2015 regulations?",
    answer:
      "Yes, SiteSafe Pro is specifically designed for UK CDM 2015 compliance. Our document categories, workflows, and templates are all aligned with CDM requirements for principal contractors, designers, and clients.",
  },
  {
    question: "Can I export my data if I decide to leave?",
    answer:
      "Yes, you can export all your data at any time, including documents, signatures, inspection records, and compliance history. We believe in data portability and will never hold your data hostage.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Your data is stored in secure EU-based data centres with enterprise-grade encryption at rest and in transit. We're fully GDPR compliant and undergo regular security audits. All access is logged and auditable.",
  },
  {
    question: "Do you offer discounts for annual billing?",
    answer:
      "Yes, you save 20% when you choose annual billing. For example, the Professional plan is £99/month billed monthly, or £950/year (equivalent to £79/month) when billed annually.",
  },
];

export const FAQSection = () => {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto">
        {/* Section header */}
        <div className="text-center mb-12">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium mb-4"
          >
            FAQ
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl font-bold text-foreground mb-4"
          >
            Frequently asked questions
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-foreground"
          >
            Everything you need to know about SiteSafe Pro
          </motion.p>
        </div>

        {/* FAQ Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="max-w-3xl mx-auto"
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card border border-border/50 rounded-xl px-6 data-[state=open]:shadow-md transition-shadow"
              >
                <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>

        {/* Contact CTA */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center text-muted-foreground mt-12"
        >
          Still have questions?{" "}
          <a href="#contact" className="text-primary font-medium hover:underline">
            Get in touch
          </a>{" "}
          and we'll help you out.
        </motion.p>
      </div>
    </section>
  );
};
