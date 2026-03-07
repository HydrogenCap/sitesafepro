import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Founding50BannerProps {
  variant?: "hero" | "auth";
}

export const Founding50Banner = ({ variant = "hero" }: Founding50BannerProps) => {
  const [spotsRemaining, setSpotsRemaining] = useState<number | null>(null);

  useEffect(() => {
    const fetchCount = async () => {
      const { data } = await supabase
        .from("app_settings" as any)
        .select("value")
        .eq("key", "founding_fifty_count")
        .single();

      if (data) {
        const count = typeof (data as any).value === "number" ? (data as any).value : 0;
        setSpotsRemaining(Math.max(0, 50 - count));
      }
    };
    fetchCount();
  }, []);

  if (spotsRemaining === null) return null;

  const allClaimed = spotsRemaining === 0;

  if (variant === "auth") {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-lg border px-4 py-3 text-center text-sm ${
            allClaimed
              ? "border-border bg-muted text-muted-foreground"
              : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
          }`}
        >
          {allClaimed ? (
            <span>All 50 founding spots have been claimed.</span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4 flex-shrink-0" />
              <span>
                <strong>Founding 50 Offer</strong> — First 50 users get 6 months free!{" "}
                <strong>{spotsRemaining} spot{spotsRemaining !== 1 ? "s" : ""} remaining</strong>
              </span>
            </span>
          )}
        </motion.div>
      </AnimatePresence>
    );
  }

  // Hero variant
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full backdrop-blur-sm border mb-4 ${
          allClaimed
            ? "bg-primary-foreground/5 border-primary-foreground/10"
            : "bg-amber-500/15 border-amber-400/30"
        }`}
      >
        {allClaimed ? (
          <span className="text-sm text-primary-foreground/60">
            All 50 founding spots have been claimed
          </span>
        ) : (
          <>
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-semibold text-primary-foreground">
              🎉 Founding 50 — 2 months free!{" "}
              <span className="text-amber-300 font-bold">
                {spotsRemaining} spot{spotsRemaining !== 1 ? "s" : ""} left
              </span>
            </span>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
