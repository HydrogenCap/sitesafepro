import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What is SiteSafe Pro?",
    answer:
      "SiteSafe Pro is a cloud-based health and safety management platform built specifically for UK construction companies. It replaces paper-based systems, spreadsheets, and shared drives with a single digital platform covering document management, RAMS, permits to work, site access, inspections, incidents, toolbox talks, contractor compliance, and more. It works on any device — desktop, tablet, or phone — and includes a Progressive Web App (PWA) for installation on mobile devices.",
  },
  {
    question: "Is SiteSafe Pro compliant with UK legislation?",
    answer:
      "Yes. SiteSafe Pro is built around UK construction health and safety legislation including CDM 2015, the Health and Safety at Work Act 1974, the Work at Height Regulations 2005, COSHH Regulations 2002, and RIDDOR 2013. The pre-construction checklist, RAMS builder, permit types, and inspection categories all reference the correct UK regulatory framework.",
  },
  {
    question: "What plans are available?",
    answer:
      "There are three plans: Starter (£49/month) — 1 active project, 5GB storage, document management, e-signatures, QR site access, and inductions. Professional (£99/month) — up to 5 projects, 25GB storage, plus permits, toolbox talks, inspections, incidents, COSHH register, RAMS workflow, and compliance calendar. Enterprise (£199/month) — unlimited projects, 100GB storage, client portal, AI document analysis, custom branding, API access, and a dedicated account manager.",
  },
  {
    question: "Is there a free trial?",
    answer:
      "Yes. All new accounts start with a 14-day free trial so you can explore the platform before committing. No credit card is required. You can upgrade, downgrade, or cancel at any time from the Settings page.",
  },
  {
    question: "Are contractor accounts really free?",
    answer:
      "Yes! Contractors invited by a paying customer get completely free access. They can view documents, sign acknowledgements, scan QR codes, attend toolbox talks, and upload their RAMS—all at no cost. This removes friction from adoption.",
  },
  {
    question: "How does QR code site access work?",
    answer:
      "Each project has a unique QR code. Workers scan it on arrival using their phone camera. They enter their name, company, trade, and confirm they are inducted. On departure, they scan again to sign out. You can view who is on site in real time from the Site Access dashboard, with emergency headcount features for fire drills.",
  },
  {
    question: "What is the pre-construction compliance checklist?",
    answer:
      "Every project starts in 'setup' mode. Before work begins, you must confirm five compliance requirements: F10 Notification to HSE, Asbestos Survey, Pre-Construction Information (PCI), Construction Phase Plan (CPP), and Principal Contractor Appointment. Each item can be marked as complete, exempt (with reason), or pending. Once complete, you can 'Go Live' and unlock all project features.",
  },
  {
    question: "Can contractors upload their own documents?",
    answer:
      "Yes. When you request documents from a contractor, they receive an email with a secure upload link. They can upload the requested files without needing an account. The documents appear in your dashboard for review and verification.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Yes. All data is encrypted in transit and at rest. We use industry-standard security practices and our infrastructure is hosted on secure, EU-based cloud servers compliant with GDPR. All access is logged and auditable.",
  },
  {
    question: "Can I use SiteSafe Pro on my phone?",
    answer:
      "Yes. SiteSafe Pro is fully responsive and works in any modern web browser on mobile. You can also install it as a Progressive Web App (PWA) by visiting the Install page or tapping the install prompt in your browser. The PWA gives you an app-like experience with a home screen icon and standalone window.",
  },
  {
    question: "Can I export my data if I decide to leave?",
    answer:
      "Yes, you can export all your data at any time, including documents, signatures, inspection records, and compliance history. We believe in data portability and will never hold your data hostage.",
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
          <a href="/contact" className="text-primary font-medium hover:underline">
            Get in touch
          </a>{" "}
          or visit our{" "}
          <a href="/documentation" className="text-primary font-medium hover:underline">
            full documentation
          </a>
          .
        </motion.p>
      </div>
    </section>
  );
};
