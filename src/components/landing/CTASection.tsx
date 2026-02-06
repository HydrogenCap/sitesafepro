import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield } from "lucide-react";

export const CTASection = () => {
  return (
    <section className="py-24 bg-hero-gradient relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-10 right-20 w-64 h-64 bg-accent/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-10 left-20 w-80 h-80 bg-primary-foreground/5 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.15, 0.3, 0.15],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="container mx-auto relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {/* Icon */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-foreground/10 backdrop-blur-sm mb-8"
          >
            <Shield className="w-8 h-8 text-primary-foreground" />
          </motion.div>

          {/* Heading */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary-foreground mb-6"
          >
            Ready to simplify your
            <br />
            site safety compliance?
          </motion.h2>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-primary-foreground/70 mb-8"
          >
            Join 500+ UK contractors who've ditched the paperwork.
            <br />
            Start your 14-day free trial today.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button variant="hero" size="xl" className="w-full sm:w-auto group">
              Start Free Trial
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="heroOutline" size="xl" className="w-full sm:w-auto">
              Book a Demo
            </Button>
          </motion.div>

          {/* Trust indicators */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="text-primary-foreground/60 text-sm mt-8"
          >
            No credit card required • 14-day free trial • Cancel anytime
          </motion.p>
        </div>
      </div>
    </section>
  );
};
