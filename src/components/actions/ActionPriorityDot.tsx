import { cn } from "@/lib/utils";

interface ActionPriorityDotProps {
  priority: "critical" | "high" | "medium" | "low";
  className?: string;
}

export const ActionPriorityDot = ({ priority, className }: ActionPriorityDotProps) => {
  const colorClasses = {
    critical: "bg-red-500",
    high: "bg-orange-500",
    medium: "bg-amber-500",
    low: "bg-gray-400",
  };

  return (
    <span
      className={cn(
        "inline-block h-3 w-3 rounded-full",
        colorClasses[priority],
        className
      )}
      title={`${priority.charAt(0).toUpperCase() + priority.slice(1)} Priority`}
    />
  );
};
