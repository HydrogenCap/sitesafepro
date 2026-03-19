import { cn } from "@/lib/utils";

interface ComplianceScoreGaugeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export const ComplianceScoreGauge = ({ 
  score, 
  size = "md", 
  showLabel = true 
}: ComplianceScoreGaugeProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-amber-500";
    return "text-red-500";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "stroke-green-500";
    if (score >= 60) return "stroke-amber-500";
    return "stroke-red-500";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Compliant";
    if (score >= 60) return "At Risk";
    return "Non-Compliant";
  };

  const sizeClasses = {
    sm: "h-16 w-16",
    md: "h-24 w-24",
    lg: "h-32 w-32",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
  };

  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={cn("relative", sizeClasses[size])}>
        <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            strokeWidth="8"
            className="stroke-muted"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            className={getScoreBgColor(score)}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: "stroke-dashoffset 0.5s ease-in-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("font-bold", textSizes[size], getScoreColor(score))}>
            {Math.round(score)}%
          </span>
        </div>
      </div>
      {showLabel && (
        <span className={cn("text-sm font-medium", getScoreColor(score))}>
          {getScoreLabel(score)}
        </span>
      )}
    </div>
  );
};
