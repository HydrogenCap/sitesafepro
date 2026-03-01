import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground border-border" },
  in_review: { label: "In Review", className: "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300" },
  approved: { label: "Approved", className: "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300" },
  superseded: { label: "Superseded", className: "bg-muted text-muted-foreground/50 border-border line-through" },
  pending: { label: "Pending", className: "bg-muted text-muted-foreground border-border" },
};

interface Props { status: string; compact?: boolean; }

export function DocumentStatusBadge({ status, compact = false }: Props) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: "bg-muted text-muted-foreground border-border" };
  return (
    <span className={cn(
      "inline-flex items-center border rounded-full font-medium",
      compact ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1",
      config.className
    )}>
      {config.label}
    </span>
  );
}
