import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  CheckCircle,
  FileText,
  ClipboardList,
  ShieldCheck,
  Download,
  Pen,
  Loader2,
} from "lucide-react";
import { generateDocumentPDF, generateDocumentDOCX, type DocumentData } from "@/lib/document-generator";

interface GeneratedDocument {
  id: string;
  document_type: string;
  signed_at: string | null;
  signature_data: string | null;
}

interface GeneratedDocumentsListProps {
  projectId: string;
  projectName: string;
  documents: GeneratedDocument[];
  onDocumentsGenerated: () => void;
}

const DOCUMENT_TYPES = [
  {
    type: "induction_register",
    label: "Site Induction Register",
    description: "Visitor sign-in and safety briefing records",
    icon: ClipboardList,
  },
  {
    type: "rams_register",
    label: "RAMS Register",
    description: "Subcontractor risk assessments tracker",
    icon: FileText,
  },
  {
    type: "permit_to_work",
    label: "Permit to Work Forms",
    description: "High-risk work authorisation permits",
    icon: ShieldCheck,
  },
];

export const GeneratedDocumentsList = ({
  projectId,
  projectName,
  documents,
  onDocumentsGenerated,
}: GeneratedDocumentsListProps) => {
  const { user } = useAuth();
  const { organisation } = useSubscription();
  const [generating, setGenerating] = useState(false);
  const [generatedDocs, setGeneratedDocs] = useState<Record<string, DocumentData>>({});

  const getDocumentStatus = (type: string) => {
    return documents.find((d) => d.document_type === type);
  };

  const handleGenerateAll = async () => {
    if (!organisation || !user) return;

    setGenerating(true);
    try {
      const docTypes = ["induction_register", "rams_register", "permit_to_work"];
      
      for (const docType of docTypes) {
        // Check if already exists
        if (getDocumentStatus(docType)) continue;

        // Generate questions and document via AI
        const { data: questionsData, error: questionsError } = await supabase.functions.invoke("generate-document", {
          body: {
            action: "generate_questions",
            templateType: docType,
            projectName,
          },
        });

        if (questionsError) throw questionsError;

        // Auto-fill with project data
        const autoAnswers: Record<string, string> = {
          site_name: projectName,
        };

        // Generate document
        const { data: docData, error: docError } = await supabase.functions.invoke("generate-document", {
          body: {
            action: "generate_document",
            templateType: docType,
            answers: autoAnswers,
            projectName,
            organisationName: organisation.name,
          },
        });

        if (docError) throw docError;

        // Store generated document data
        setGeneratedDocs((prev) => ({
          ...prev,
          [docType]: docData.document,
        }));

        // Create tracking record
        const { error: insertError } = await supabase
          .from("project_generated_documents")
          .insert({
            organisation_id: organisation.id,
            project_id: projectId,
            document_type: docType,
            generated_by: user.id,
          });

        if (insertError) throw insertError;
      }

      toast.success("Site documents generated successfully!");
      onDocumentsGenerated();
    } catch (error) {
      console.error("Error generating documents:", error);
      toast.error("Failed to generate some documents");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPDF = (type: string) => {
    const doc = generatedDocs[type];
    if (doc) {
      generateDocumentPDF(doc, organisation?.name);
      toast.success("PDF downloaded");
    }
  };

  const handleDownloadDOCX = async (type: string) => {
    const doc = generatedDocs[type];
    if (doc) {
      await generateDocumentDOCX(doc, organisation?.name);
      toast.success("Word document downloaded");
    }
  };

  const allGenerated = DOCUMENT_TYPES.every((dt) => getDocumentStatus(dt.type));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl p-6 border border-border"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Site-Specific Documents
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {allGenerated
              ? "All documents generated and ready for use"
              : "Generate customised safety documents for this site"}
          </p>
        </div>
        {!allGenerated && (
          <Button onClick={handleGenerateAll} disabled={generating}>
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate All"
            )}
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {DOCUMENT_TYPES.map((dt, index) => {
          const status = getDocumentStatus(dt.type);
          const isGenerated = !!status;
          const isSigned = status?.signed_at;
          const generatedDoc = generatedDocs[dt.type];

          return (
            <motion.div
              key={dt.type}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`
                flex items-center gap-4 p-4 rounded-lg border transition-colors
                ${isGenerated ? "bg-success/5 border-success/20" : "bg-muted/30 border-border"}
              `}
            >
              <div className={`
                h-10 w-10 rounded-lg flex items-center justify-center
                ${isGenerated ? "bg-success/10" : "bg-muted"}
              `}>
                <dt.icon className={`h-5 w-5 ${isGenerated ? "text-success" : "text-muted-foreground"}`} />
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground">{dt.label}</h4>
                <p className="text-sm text-muted-foreground">{dt.description}</p>
                {isSigned && (
                  <p className="text-xs text-success mt-1 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Signed
                  </p>
                )}
              </div>

              {isGenerated && generatedDoc && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadPDF(dt.type)}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadDOCX(dt.type)}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    DOCX
                  </Button>
                  {!isSigned && (
                    <Button size="sm" variant="default">
                      <Pen className="h-4 w-4 mr-1" />
                      Sign
                    </Button>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};
