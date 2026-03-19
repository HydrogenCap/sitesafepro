import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { Link } from "react-router-dom";

const COOKIE_KEY = "ssp_cookie_consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_KEY);
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(COOKIE_KEY, "accepted");
    setVisible(false);
  };

  const dismiss = () => {
    localStorage.setItem(COOKIE_KEY, "dismissed");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 inset-x-0 z-50 p-4 md:p-6"
    >
      <div className="mx-auto max-w-xl rounded-xl border bg-card shadow-lg p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <p className="text-sm text-muted-foreground flex-1">
          We use essential cookies to keep Site Safe running. No tracking cookies are used.{" "}
          <Link to="/cookie-policy" className="underline text-primary">
            Cookie Policy
          </Link>
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" onClick={accept}>
            Accept
          </Button>
          <button
            onClick={dismiss}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
