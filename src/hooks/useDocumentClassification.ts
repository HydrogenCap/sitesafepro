import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ClassificationResult {
  category: string;
  suggestedTitle: string;
  suggestedDescription: string | null;
  confidence: "high" | "medium" | "low";
  complianceFlags?: string[] | null;
  aiPowered: boolean;
  complianceScore?: number;
  complianceChecklist?: Array<{
    item: string;
    status: "pass" | "warning" | "fail";
    note: string | null;
  }>;
}

export function useDocumentClassification() {
  const [classifying, setClassifying] = useState(false);
  const [classificationResult, setClassificationResult] = useState<ClassificationResult | null>(null);

  const classifyDocument = useCallback(async (
    filename: string,
    mimeType: string,
    textContent: string | null,
    deepAnalysis: boolean = false
  ): Promise<ClassificationResult | null> => {
    setClassifying(true);
    setClassificationResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("classify-document", {
        body: {
          filename,
          mimeType,
          textContent: textContent || "",
          deepAnalysis,
        },
      });

      if (error) {
        console.error("Classification error:", error);
        // Return fallback
        const fallback: ClassificationResult = {
          category: "other",
          suggestedTitle: filename.replace(/\.[^/.]+$/, ""),
          suggestedDescription: null,
          confidence: "low",
          aiPowered: false,
        };
        setClassificationResult(fallback);
        return fallback;
      }

      const result: ClassificationResult = {
        category: data.category || "other",
        suggestedTitle: data.suggestedTitle || filename.replace(/\.[^/.]+$/, ""),
        suggestedDescription: data.suggestedDescription || null,
        confidence: data.confidence || "low",
        complianceFlags: data.complianceFlags || null,
        aiPowered: data.aiPowered ?? false,
        complianceScore: data.complianceScore,
        complianceChecklist: data.complianceChecklist,
      };

      setClassificationResult(result);
      return result;
    } catch (err) {
      console.error("Failed to classify document:", err);
      const fallback: ClassificationResult = {
        category: "other",
        suggestedTitle: filename.replace(/\.[^/.]+$/, ""),
        suggestedDescription: null,
        confidence: "low",
        aiPowered: false,
      };
      setClassificationResult(fallback);
      return fallback;
    } finally {
      setClassifying(false);
    }
  }, []);

  const clearClassification = useCallback(() => {
    setClassificationResult(null);
  }, []);

  return {
    classifyDocument,
    classifying,
    classificationResult,
    clearClassification,
  };
}
