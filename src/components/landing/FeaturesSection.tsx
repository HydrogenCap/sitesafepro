import { motion } from "framer-motion";
import {
  FileSignature,
  QrCode,
  Users,
  ClipboardList,
  Calendar,
  Building2,
  Shield,
  AlertTriangle,
  FileCheck,
  HardHat,
  BookOpen,
  Beaker,
} from "lucide-react";

const features = [
  {
    icon: FileSignature,
    title: "Documents & E-Signatures",
    description:
      "Upload RAMS, method statements, and safety documents. AI-powered categorisation suggests the right category. Get digital signatures with full audit trails and acknowledgement tracking.",
  },
  {
    icon: QrCode,
    title: "QR Site Access",
    description:
      "Generate unique QR codes for each site. Workers scan to sign in/out with name, company, and trade. Real-time headcount dashboard and emergency muster list export.",
  },
  {
    icon: FileCheck,
    title: "RAMS Builder",
    description:
      "5-step guided wizard to create professional Risk Assessments and Method Statements. 80+ pre-loaded activities, hazard controls, and formatted PDF export with signatures.",
  },
  {
    icon: ClipboardList,
    title: "Permits to Work",
    description:
      "Digital permits for Hot Works, Confined Space, Excavation, Electrical Isolation, Working at Height, and Roof Work. Approval workflows with time-limited validity.",
  },
  {
    icon: Shield,
    title: "Inspections",
    description:
      "Mobile-friendly checklists for scaffold, excavation, lifting equipment, electrical, fire safety, housekeeping, and PPE compliance. Photo evidence and automatic action creation.",
  },
  {
    icon: AlertTriangle,
    title: "Incident Reporting",
    description:
      "Full incident investigation workflow with photos, witness statements, and root cause analysis. RIDDOR guidance flags reportable incidents automatically.",
  },
  {
    icon: Users,
    title: "Toolbox Talks",
    description:
      "35+ pre-loaded safety talks covering working at height, manual handling, electrical safety, and more. Digital attendance recording and completion tracking.",
  },
  {
    icon: HardHat,
    title: "Contractor Compliance",
    description:
      "Track subcontractor documents, insurance, RAMS, and training certifications. Automated expiry alerts, compliance scoring, and one-click document request emails.",
  },
  {
    icon: BookOpen,
    title: "Site Inductions",
    description:
      "Configure induction content with slides and documents. New workers complete on first QR sign-in. Acknowledgement tracking and completion records for compliance.",
  },
  {
    icon: Beaker,
    title: "COSHH Register",
    description:
      "Hazardous substance management with GHS pictograms, PPE requirements, control measures, and SDS document links. Health surveillance tracking where required.",
  },
  {
    icon: Calendar,
    title: "Compliance Calendar",
    description:
      "Never miss a renewal. Visual calendar of expiring certificates, insurances, permits, and inspection due dates. Automated email alerts 30, 14, and 7 days before expiry.",
  },
  {
    icon: Building2,
    title: "Client Portal",
    description:
      "Give clients read-only access to project documents, compliance status, and reports. Configure exactly what they can see. Perfect for principal contractors and developers.",
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
          className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
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
