import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePdfTextExtraction } from "@/hooks/usePdfTextExtraction";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Shield,
  RefreshCw,
  Loader2,
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
  const [analysing, setAnalysing] = useState(false);
  const [result, setResult] = useState<ComplianceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { extractTextFromPdf } = usePdfTextExtraction();

  const runAnalysis = async () => {
    setAnalysing(true);
    setError(null);

    try {
      // Get document details
      const { data: doc, error: docError } = await supabase
        .from("documents")
        .select("file_path, name, mime_type")
        .eq("id", documentId)
        .single();

      if (docError || !doc) {
        throw new Error("Failed to fetch document details");
      }

      // Download the file to extract text
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("documents")
        .download(doc.file_path);

      if (downloadError || !fileData) {
        throw new Error("Failed to download document");
      }

      // Extract text from PDF
      let textContent = "";
      if (doc.mime_type === "application/pdf") {
        const file = new File([fileData], doc.name, { type: doc.mime_type });
        const extracted = await extractTextFromPdf(file);
        if (extracted) {
          textContent = extracted.text;
        }
      } else {
        // For non-PDF files, try to read as text
        textContent = await fileData.text();
      }

      if (!textContent || textContent.length < 50) {
        throw new Error("Could not extract enough text from document for analysis");
      }

      // Call the classify-document edge function with deepAnalysis=true
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
        "classify-document",
        {
          body: {
            filename: doc.name,
            mimeType: doc.mime_type,
            textContent: textContent,
            deepAnalysis: true,
          },
        }
      );

      if (analysisError) {
        throw new Error("AI analysis failed");
      }

      if (analysisData?.complianceScore !== undefined && analysisData?.complianceChecklist) {
        setResult({
          complianceScore: analysisData.complianceScore,
          complianceChecklist: analysisData.complianceChecklist,
        });
      } else {
        // If no deep analysis data returned, show a message
        setError("AI analysis did not return detailed compliance data. Try again.");
      }
    } catch (err) {
      console.error("Error running compliance analysis:", err);
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
      setAnalysing(false);
    }
  };

  useEffect(() => {
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

  if (loading || analysing) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            AI Compliance Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
            <div>
              <p className="text-sm font-medium">Analysing document...</p>
              <p className="text-xs text-muted-foreground">
                AI is checking RAMS compliance requirements
              </p>
            </div>
          </div>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            AI Compliance Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={runAnalysis}
            disabled={analysing}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Analysis
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!result) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            AI Compliance Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Run AI analysis to check RAMS compliance
          </p>
          <Button onClick={runAnalysis} disabled={analysing}>
            {analysing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analysing...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Run Analysis
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            AI Compliance Analysis
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={runAnalysis}
            disabled={analysing}
          >
            <RefreshCw className={`h-4 w-4 ${analysing ? "animate-spin" : ""}`} />
          </Button>
        </div>
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
