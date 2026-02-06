import { motion } from "framer-motion";
import {
  FileSignature,
  QrCode,
  Users,
  ClipboardList,
  Calendar,
  Building2,
} from "lucide-react";

const features = [
  {
    icon: FileSignature,
    title: "Documents & E-Signatures",
    description:
      "Upload RAMS, method statements, and safety documents. Get digital signatures with full audit trails.",
  },
  {
    icon: QrCode,
    title: "QR Site Access",
    description:
      "Generate unique QR codes for each site. Track real-time headcount and enable emergency roll calls.",
  },
  {
    icon: Users,
    title: "Toolbox Talks",
    description:
      "35+ pre-loaded safety talks. Record attendance digitally and track completion across your workforce.",
  },
  {
    icon: ClipboardList,
    title: "Permits to Work",
    description:
      "Hot works, confined spaces, and more. Digital approval workflows with time-limited permits.",
  },
  {
    icon: Calendar,
    title: "Compliance Calendar",
    description:
      "Never miss a renewal. Automated alerts for expiring certificates, insurances, and inspections.",
  },
  {
    icon: Building2,
    title: "Contractor Portal",
    description:
      "Free access for sub-contractors. They can view documents, sign off, and upload their RAMS.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 bg-mesh-gradient">
      <div className="container mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium mb-4"
          >
            Features
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4"
          >
            Everything you need for
            <br />
            <span className="text-gradient-primary">site safety compliance</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            From document management to real-time site access tracking, 
            SiteSafe Pro covers all your CDM 2015 compliance needs.
          </motion.p>
        </div>

        {/* Features grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              className="group relative bg-card rounded-2xl p-8 shadow-md hover:shadow-xl transition-all duration-300 border border-border/50 hover:border-primary/20"
            >
              {/* Icon */}
              <div className="mb-6 inline-flex items-center justify-center w-14 h-14 rounded-xl bg-secondary group-hover:bg-primary transition-colors duration-300">
                <feature.icon className="w-7 h-7 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold text-foreground mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>

              {/* Hover effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
