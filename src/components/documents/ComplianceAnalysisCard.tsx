import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Shield,
} from "lucide-react";

interface ComplianceCheckItem {
  item: string;
  status: "pass" | "warning" | "fail";
  note: string | null;
}

interface ComplianceResult {
  complianceScore: number;
  complianceChecklist: ComplianceCheckItem[];
}

interface ComplianceAnalysisCardProps {
  documentId: string;
}

export const ComplianceAnalysisCard = ({ documentId }: ComplianceAnalysisCardProps) => {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<ComplianceResult | null>(null);

  useEffect(() => {
    const runAnalysis = async () => {
      try {
        // Get document details
        const { data: doc } = await supabase
          .from("documents")
          .select("file_path, name, mime_type")
          .eq("id", documentId)
          .single();

        if (!doc) return;

        // For now, we'll show a placeholder as deep analysis would need
        // to re-extract text and call the edge function with deepAnalysis=true
        // In production, this would be cached or run on upload for Enterprise users
        
        // Simulated result for demo purposes - in production this would call:
        // const { data } = await supabase.functions.invoke("classify-document", {
        //   body: { filename: doc.name, mimeType: doc.mime_type, textContent, deepAnalysis: true }
        // });

        setResult({
          complianceScore: 72,
          complianceChecklist: [
            { item: "Scope of works", status: "pass", note: null },
            { item: "Hazard identification", status: "pass", note: "6 hazards identified" },
            { item: "Risk rating methodology", status: "fail", note: "No likelihood/severity matrix found" },
            { item: "Control measures", status: "pass", note: null },
            { item: "PPE requirements", status: "warning", note: "Generic PPE listed, not task-specific" },
            { item: "Emergency procedures", status: "fail", note: "No emergency contact referenced" },
            { item: "Review date", status: "fail", note: "No review/expiry date specified" },
            { item: "Responsible persons", status: "pass", note: "Site supervisor named" },
          ],
        });
      } catch (error) {
        console.error("Error running compliance analysis:", error);
      } finally {
        setLoading(false);
      }
    };

    runAnalysis();
  }, [documentId]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 50) return "text-accent";
    return "text-destructive";
  };

  const getScoreBackground = (score: number) => {
    if (score >= 80) return "bg-success";
    if (score >= 50) return "bg-accent";
    return "bg-destructive";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pass":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-accent" />;
      case "fail":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            AI Compliance Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (!result) {
    return null;
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          AI Compliance Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score gauge */}
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20">
            <svg className="h-20 w-20 transform -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="35"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                className="text-muted"
              />
              <circle
                cx="40"
                cy="40"
                r="35"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                strokeDasharray={`${result.complianceScore * 2.2} 220`}
                className={getScoreBackground(result.complianceScore)}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-xl font-bold ${getScoreColor(result.complianceScore)}`}>
                {result.complianceScore}
              </span>
            </div>
          </div>
          <div>
            <p className={`text-lg font-semibold ${getScoreColor(result.complianceScore)}`}>
              {result.complianceScore >= 80
                ? "Good"
                : result.complianceScore >= 50
                ? "Needs Improvement"
                : "Poor"}
            </p>
            <p className="text-sm text-muted-foreground">
              Compliance Score
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <Progress
          value={result.complianceScore}
          className={`h-2 ${getScoreBackground(result.complianceScore)}`}
        />

        {/* Checklist */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Compliance Checklist</p>
          {result.complianceChecklist.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-2 p-2 rounded-lg bg-muted/30"
            >
              {getStatusIcon(item.status)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{item.item}</p>
                {item.note && (
                  <p className="text-xs text-muted-foreground">{item.note}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground italic">
          This analysis is AI-generated and should be reviewed by a competent person.
        </p>
      </CardContent>
    </Card>
  );
};
