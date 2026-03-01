import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useSubscription } from "@/hooks/useSubscription";
import { useProjects } from "@/hooks/useProjects";

const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const UsageBars = () => {
  const { tier, isTrialing, projectLimit, storageLimit, organisation } = useSubscription();
  const { data: projects } = useProjects();

  // Only show for Starter and trialling orgs
  if (tier !== "starter" && tier !== "trial") return null;

  const projectCount = projects?.length ?? 0;
  const storageUsed = organisation?.storage_used_bytes ?? 0;

  const projectPct = projectLimit > 0 ? Math.min((projectCount / projectLimit) * 100, 100) : 0;
  const storagePct = storageLimit > 0 ? Math.min((storageUsed / storageLimit) * 100, 100) : 0;

  const items = [
    {
      label: "Projects",
      current: projectCount,
      limit: projectLimit >= 999 ? "∞" : projectLimit,
      pct: projectPct,
      atLimit: projectCount >= projectLimit && projectLimit < 999,
    },
    {
      label: "Storage",
      current: formatBytes(storageUsed),
      limit: formatBytes(storageLimit),
      pct: storagePct,
      atLimit: storagePct >= 90,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl p-5 shadow-sm border border-border"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Plan Usage</h3>
        <span className="text-xs text-muted-foreground capitalize">
          {isTrialing ? "Free Trial" : `${tier} plan`}
        </span>
      </div>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.label} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">
                  {item.current} / {item.limit}
                </span>
                {item.atLimit && (
                  <Link
                    to="/settings"
                    className="text-xs text-primary hover:underline inline-flex items-center gap-0.5"
                  >
                    Upgrade <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </div>
            <Progress
              value={item.pct}
              className={`h-2 ${item.atLimit ? "[&>div]:bg-accent" : ""}`}
            />
          </div>
        ))}
      </div>
    </motion.div>
  );
};
