import { Card, CardContent } from "@/components/ui/card";

interface ComplianceProgressProps {
  approved: number;
  pending: number;
  rejected: number;
  missing: number;
  total: number;
}

export function ComplianceProgressGauge({
  approved,
  pending,
  rejected,
  missing,
  total,
}: ComplianceProgressProps) {
  const percentage = total > 0 ? Math.round((approved / total) * 100) : 0;
  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (percentage / 100) * circumference;

  const color =
    percentage >= 80
      ? "hsl(var(--success))"
      : percentage >= 50
        ? "hsl(var(--warning))"
        : "hsl(var(--destructive))";

  return (
    <Card>
      <CardContent className="p-6 flex flex-col items-center">
        <div className="relative w-32 h-32">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="10"
            />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke={color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold" style={{ color }}>
              {percentage}%
            </span>
            <span className="text-xs text-muted-foreground">Compliant</span>
          </div>
        </div>

        <div className="mt-4 w-full grid grid-cols-2 gap-2 text-center text-xs">
          <div className="p-2 rounded bg-muted/50">
            <p className="font-bold text-success">{approved}</p>
            <p className="text-muted-foreground">Approved</p>
          </div>
          <div className="p-2 rounded bg-muted/50">
            <p className="font-bold text-primary">{pending}</p>
            <p className="text-muted-foreground">Pending</p>
          </div>
          <div className="p-2 rounded bg-muted/50">
            <p className="font-bold text-destructive">{rejected}</p>
            <p className="text-muted-foreground">Rejected</p>
          </div>
          <div className="p-2 rounded bg-muted/50">
            <p className="font-bold text-warning">{missing}</p>
            <p className="text-muted-foreground">Missing</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
