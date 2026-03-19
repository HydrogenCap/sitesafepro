import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, Settings2 } from "lucide-react";
import { Link } from "react-router-dom";

const COOKIE_KEY = "ssp_cookie_consent";

interface CookiePreferences {
  essential: true; // always true
  analytics: boolean;
  marketing: boolean;
}

const DEFAULT_PREFS: CookiePreferences = { essential: true, analytics: false, marketing: false };

function loadPreferences(): CookiePreferences | null {
  try {
    const raw = localStorage.getItem(COOKIE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && "essential" in parsed) {
      return { ...DEFAULT_PREFS, ...parsed, essential: true };
    }
    // Legacy string value ("accepted" / "dismissed") — treat as accepted-all
    return { essential: true, analytics: true, marketing: true };
  } catch {
    return null;
  }
}

export function getConsentFor(category: keyof CookiePreferences): boolean {
  const prefs = loadPreferences();
  if (!prefs) return false;
  return prefs[category];
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [prefs, setPrefs] = useState<CookiePreferences>(DEFAULT_PREFS);

  useEffect(() => {
    const stored = loadPreferences();
    if (!stored) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const save = useCallback((preferences: CookiePreferences) => {
    localStorage.setItem(COOKIE_KEY, JSON.stringify(preferences));
    setVisible(false);
  }, []);

  const acceptAll = () => save({ essential: true, analytics: true, marketing: true });
  const rejectNonEssential = () => save(DEFAULT_PREFS);
  const savePreferences = () => save(prefs);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 inset-x-0 z-50 p-4 md:p-6"
    >
      <div className="mx-auto max-w-xl rounded-xl border bg-card shadow-lg p-4 space-y-3">
        {!showPreferences ? (
          <>
            <p className="text-sm text-muted-foreground">
              We use essential cookies to keep SiteSafe running. Optional cookies help us
              improve the product.{" "}
              <Link to="/cookie-policy" className="underline text-primary">
                Cookie Policy
              </Link>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={acceptAll}>
                Accept All
              </Button>
              <Button size="sm" variant="outline" onClick={rejectNonEssential}>
                Reject Non-Essential
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowPreferences(true)}
                className="gap-1"
              >
                <Settings2 className="h-3.5 w-3.5" />
                Manage
              </Button>
              <button
                onClick={rejectNonEssential}
                className="ml-auto p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm font-medium">Cookie Preferences</p>
            <div className="space-y-2 text-sm">
              <label className="flex items-center gap-2 opacity-60">
                <input type="checkbox" checked disabled className="accent-primary" />
                <span>Essential (always on)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.analytics}
                  onChange={(e) => setPrefs((p) => ({ ...p, analytics: e.target.checked }))}
                  className="accent-primary"
                />
                <span>Analytics — helps us understand usage</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.marketing}
                  onChange={(e) => setPrefs((p) => ({ ...p, marketing: e.target.checked }))}
                  className="accent-primary"
                />
                <span>Marketing — personalised tips &amp; updates</span>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={savePreferences}>
                Save Preferences
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowPreferences(false)}>
                Back
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
