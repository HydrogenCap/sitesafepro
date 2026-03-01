import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const stats = [
  { value: "500+", label: "Active Companies" },
  { value: "15,000+", label: "Documents Managed" },
  { value: "99.9%", label: "Uptime" },
  { value: "4.9/5", label: "Customer Rating" },
];

const testimonials = [
  {
    quote:
      "Site Safe has transformed how we manage compliance across our sites. What used to take hours of paperwork now takes minutes.",
    author: "James Richardson",
    role: "Managing Director",
    company: "Richardson Construction Ltd",
    rating: 5,
  },
  {
    quote:
      "The QR site access feature is brilliant. We can see exactly who's on site at any moment. Perfect for emergency roll calls.",
    author: "Sarah Mitchell",
    role: "H&S Manager",
    company: "BuildRight Projects",
    rating: 5,
  },
  {
    quote:
      "Finally, a safety management system that doesn't cost a fortune. The contractor portal is a game-changer for us.",
    author: "David Thompson",
    role: "Site Manager",
    company: "Thompson Developments",
    rating: 5,
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
            Trusted by UK contractors
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-muted-foreground"
          >
            See why hundreds of construction companies choose Site Safe
          </motion.p>
        </div>

        {/* Testimonials */}
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.author}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-card rounded-2xl p-8 shadow-md border border-border/50"
            >
              {/* Quote icon */}
              <Quote className="w-10 h-10 text-primary/20 mb-4" />

              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-5 h-5 fill-accent text-accent"
                  />
                ))}
              </div>

              {/* Quote */}
              <p className="text-foreground mb-6 leading-relaxed">
                "{testimonial.quote}"
              </p>

              {/* Author */}
              <div>
                <div className="font-semibold text-foreground">
                  {testimonial.author}
                </div>
                <div className="text-sm text-muted-foreground">
                  {testimonial.role}, {testimonial.company}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
