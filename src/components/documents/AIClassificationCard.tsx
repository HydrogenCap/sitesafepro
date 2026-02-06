import { Sparkles, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AIClassificationResult {
  category: string;
  suggestedTitle: string;
  suggestedDescription: string | null;
  confidence: "high" | "medium" | "low";
  complianceFlags?: string[] | null;
  aiPowered: boolean;
}

interface AIClassificationCardProps {
  result: AIClassificationResult;
  categoryLabels: Record<string, string>;
}

export const AIClassificationCard = ({
  result,
  categoryLabels,
}: AIClassificationCardProps) => {
  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case "high":
        return "bg-success/10 text-success border-success/20";
      case "medium":
        return "bg-accent/10 text-accent border-accent/20";
      default:
        return "bg-muted text-muted-foreground border-muted";
    }
  };

  const getConfidenceLabel = (confidence: string) => {
    switch (confidence) {
      case "high":
        return "High confidence";
      case "medium":
        return "Medium confidence";
      default:
        return "Low confidence";
    }
  };

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-primary">
          AI Classification
        </span>
        {!result.aiPowered && (
          <Badge variant="outline" className="text-xs">
            Filename-based
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">
          {categoryLabels[result.category] || result.category}
        </Badge>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className={getConfidenceColor(result.confidence)}>
              {getConfidenceLabel(result.confidence)}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">
              {result.aiPowered
                ? "AI analysed the document content"
                : "Based on filename only"}
            </p>
          </TooltipContent>
        </Tooltip>
      </div>

      {result.complianceFlags && result.complianceFlags.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-accent" />
            Compliance notes
          </p>
          <ul className="space-y-1">
            {result.complianceFlags.map((flag, i) => (
              <li
                key={i}
                className="text-xs text-accent flex items-start gap-1.5"
              >
                <span className="mt-0.5">•</span>
                <span>{flag}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
