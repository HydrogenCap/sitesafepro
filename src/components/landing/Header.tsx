import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];

export const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
      <div className="container mx-auto">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link to="/" className="flex-shrink-0">
            <Logo />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm">
              Login
            </Button>
            <Button variant="default" size="sm">
              Start Free Trial
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 -mr-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6 text-foreground" />
            ) : (
              <Menu className="h-6 w-6 text-foreground" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden overflow-hidden"
            >
              <nav className="flex flex-col gap-2 pb-6">
                {navItems.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    className="px-4 py-3 text-base font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </a>
                ))}
                <div className="flex flex-col gap-2 mt-4 px-4">
                  <Button variant="outline" className="w-full">
                    Login
                  </Button>
                  <Button variant="default" className="w-full">
                    Start Free Trial
                  </Button>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};
