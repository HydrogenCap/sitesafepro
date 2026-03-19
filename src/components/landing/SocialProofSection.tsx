import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";

const stats = [
  { value: "UK Built", label: "For Construction" },
  { value: "CDM 2015", label: "Fully Compliant" },
  { value: "14 Days", label: "Free Trial" },
  { value: "No Card", label: "Required to Start" },
];

const highlights = [
  {
    quote:
      "Built specifically for UK construction — covering CDM 2015, RAMS, COSHH, and contractor compliance out of the box.",
    title: "CDM 2015 Ready",
    subtitle: "Full regulatory compliance built in",
  },
  {
    quote:
      "QR-based site access, offline capture, and digital toolbox talks — everything your site team needs, on any device.",
    title: "Mobile-First",
    subtitle: "Designed for site, not just the office",
  },
  {
    quote:
      "From contractor onboarding to document expiry tracking — automate the admin that slows your projects down.",
    title: "Automated Compliance",
    subtitle: "Less paperwork, more building",
  },
];

export const SocialProofSection = () => {
  return (
    <section className="py-24 bg-secondary/30">
      <div className="container mx-auto">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="text-center"
            >
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">
                {stat.value}
              </div>
              <div className="text-muted-foreground font-medium">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Section header */}
        <div className="text-center mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl font-bold text-foreground mb-4"
          >
            Why construction teams choose Site Safe
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-muted-foreground"
          >
            Purpose-built for UK construction health &amp; safety
          </motion.p>
        </div>

        {/* Highlights */}
        <div className="grid md:grid-cols-3 gap-6">
          {highlights.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-card rounded-2xl p-8 shadow-md border border-border/50"
            >
              <ShieldCheck className="w-10 h-10 text-primary/40 mb-4" />
              <p className="text-foreground mb-6 leading-relaxed">
                {item.quote}
              </p>
              <div>
                <div className="font-semibold text-foreground">{item.title}</div>
                <div className="text-sm text-muted-foreground">{item.subtitle}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
