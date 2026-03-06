import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Shield, Users, ClipboardCheck } from "lucide-react";
import { Founding50Banner } from "@/components/landing/Founding50Banner";

const highlights = [
  "Up to 2 months free",
  "No credit card required",
  "UK CDM 2015 compliant",
];

export const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-hero-gradient">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-20 right-10 w-72 h-72 bg-accent/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-20 left-10 w-96 h-96 bg-primary-foreground/5 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        
        {/* Floating icons */}
        <motion.div
          className="absolute top-1/4 right-[15%] hidden lg:block"
          animate={{ y: [-10, 10, -10] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="bg-primary-foreground/10 backdrop-blur-sm p-4 rounded-2xl">
            <Shield className="w-8 h-8 text-primary-foreground/70" />
          </div>
        </motion.div>
        <motion.div
          className="absolute bottom-1/3 right-[25%] hidden lg:block"
          animate={{ y: [10, -10, 10] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        >
          <div className="bg-accent/20 backdrop-blur-sm p-4 rounded-2xl">
            <ClipboardCheck className="w-8 h-8 text-accent" />
          </div>
        </motion.div>
        <motion.div
          className="absolute top-1/3 left-[10%] hidden lg:block"
          animate={{ y: [-15, 15, -15] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        >
          <div className="bg-primary-foreground/10 backdrop-blur-sm p-4 rounded-2xl">
            <Users className="w-8 h-8 text-primary-foreground/70" />
          </div>
        </motion.div>
      </div>

      <div className="container mx-auto relative z-10 pt-24 pb-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Founding 50 Banner */}
          <Founding50Banner variant="hero" />

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20 mb-8"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
            </span>
            <span className="text-sm font-medium text-primary-foreground/90">
              Built for UK SME contractors
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-primary-foreground mb-6 leading-tight tracking-tight"
          >
            Construction Safety{" "}
            <span className="relative">
              Compliance
              <svg
                className="absolute -bottom-2 left-0 w-full"
                viewBox="0 0 300 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2 10C50 4 150 2 298 6"
                  stroke="hsl(25 95% 53%)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <br />
            <span className="text-primary-foreground/80">Simplified</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg sm:text-xl text-primary-foreground/70 mb-8 max-w-2xl mx-auto leading-relaxed"
          >
            Replace paper-based health & safety management with a mobile-first digital platform. 
            CDM 2015 compliant. Built for UK SME contractors.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8"
          >
            <Button variant="hero" size="xl" className="w-full sm:w-auto group" asChild>
              <Link to="/auth">
                Start Free Trial
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button variant="heroOutline" size="xl" className="w-full sm:w-auto" asChild>
              <a href="#pricing">See Pricing</a>
            </Button>
          </motion.div>

          {/* Highlights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-6"
          >
            {highlights.map((highlight) => (
              <div key={highlight} className="flex items-center gap-2 text-primary-foreground/80">
                <CheckCircle2 className="w-5 h-5 text-accent" />
                <span className="text-sm font-medium">{highlight}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};
