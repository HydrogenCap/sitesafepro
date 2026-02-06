import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Sparkles,
  FileText,
  ClipboardList,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Download,
  CheckCircle,
} from "lucide-react";
import { generateDocumentPDF, generateDocumentDOCX, type DocumentData } from "@/lib/document-generator";

interface Question {
  id: string;
  question: string;
  type: "text" | "textarea" | "select" | "date" | "number";
  options?: string[];
  required: boolean;
  placeholder?: string;
}

interface Project {
  id: string;
  name: string;
}

interface DocumentGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TemplateType = "induction_register" | "rams_register" | "permit_to_work";
type Step = "select_template" | "select_project" | "questions" | "generating" | "complete";

const TEMPLATES = [
  {
    id: "induction_register" as TemplateType,
    name: "Site Induction Register",
    description: "Visitor/contractor sign-in sheets with site-specific safety rules",
    icon: ClipboardList,
  },
  {
    id: "rams_register" as TemplateType,
    name: "RAMS Register",
    description: "Track subcontractor risk assessments for the project",
    icon: FileText,
  },
  {
    id: "permit_to_work" as TemplateType,
    name: "Permit to Work Forms",
    description: "Hot work, confined space, excavation permits and more",
    icon: ShieldCheck,
  },
];

export const DocumentGeneratorDialog = ({
  open,
  onOpenChange,
}: DocumentGeneratorDialogProps) => {
  const { organisation } = useSubscription();
  const [step, setStep] = useState<Step>("select_template");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>("none");
  const [projects, setProjects] = useState<Project[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [generatedDocument, setGeneratedDocument] = useState<DocumentData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStep("select_template");
      setSelectedTemplate(null);
      setSelectedProject("none");
      setQuestions([]);
      setAnswers({});
      setGeneratedDocument(null);
      setCurrentQuestionIndex(0);
    }
  }, [open]);

  // Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, name")
        .eq("status", "active")
        .order("name");
      setProjects(data || []);
    };
    if (open) fetchProjects();
  }, [open]);

  const handleSelectTemplate = (template: TemplateType) => {
    setSelectedTemplate(template);
    setStep("select_project");
  };

  const handleProjectSelected = async () => {
    if (!selectedTemplate) return;
    
    setLoading(true);
    setStep("questions");

    try {
      const projectName = projects.find(p => p.id === selectedProject)?.name;
      
      const { data, error } = await supabase.functions.invoke("generate-document", {
        body: {
          action: "generate_questions",
          templateType: selectedTemplate,
          projectName,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        setStep("select_project");
        return;
      }

      setQuestions(data.questions || []);
      setCurrentQuestionIndex(0);
    } catch (error) {
      console.error("Error fetching questions:", error);
      toast.error("Failed to generate questions. Please try again.");
      setStep("select_project");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      handleGenerateDocument();
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleGenerateDocument = async () => {
    if (!selectedTemplate) return;

    setStep("generating");
    setLoading(true);

    try {
      const projectName = projects.find(p => p.id === selectedProject)?.name;

      const { data, error } = await supabase.functions.invoke("generate-document", {
        body: {
          action: "generate_document",
          templateType: selectedTemplate,
          answers,
          projectName,
          organisationName: organisation?.name,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        setStep("questions");
        return;
      }

      setGeneratedDocument(data.document);
      setStep("complete");
    } catch (error) {
      console.error("Error generating document:", error);
      toast.error("Failed to generate document. Please try again.");
      setStep("questions");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!generatedDocument) return;
    generateDocumentPDF(generatedDocument, organisation?.name);
    toast.success("PDF downloaded successfully");
  };

  const handleDownloadDOCX = async () => {
    if (!generatedDocument) return;
    await generateDocumentDOCX(generatedDocument, organisation?.name);
    toast.success("Word document downloaded successfully");
  };

  const currentQuestion = questions[currentQuestionIndex];
  const progress = questions.length > 0 
    ? ((currentQuestionIndex + 1) / questions.length) * 100 
    : 0;

  const isCurrentAnswerValid = () => {
    if (!currentQuestion) return true;
    if (!currentQuestion.required) return true;
    const answer = answers[currentQuestion.id];
    return answer && answer.trim().length > 0;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Document Generator
          </DialogTitle>
          <DialogDescription>
            Generate customised safety documents for your site
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {/* Step 1: Select Template */}
          {step === "select_template" && (
            <motion.div
              key="select_template"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <p className="text-sm text-muted-foreground">
                Choose a document template to generate:
              </p>
              <div className="grid gap-3">
                {TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template.id)}
                    className="flex items-start gap-4 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                  >
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <template.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">{template.name}</h4>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 2: Select Project */}
          {step === "select_project" && (
            <motion.div
              key="select_project"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Select Project (Optional)</Label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific project</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Selecting a project will pre-fill some information
                </p>
              </div>

              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => setStep("select_template")}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleProjectSelected}>
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Questions */}
          {step === "questions" && (
            <motion.div
              key="questions"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">
                    AI is preparing your questions...
                  </p>
                </div>
              ) : currentQuestion ? (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  <motion.div
                    key={currentQuestion.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    <Label className="text-base">
                      {currentQuestion.question}
                      {currentQuestion.required && (
                        <span className="text-destructive ml-1">*</span>
                      )}
                    </Label>

                    {currentQuestion.type === "text" && (
                      <Input
                        value={answers[currentQuestion.id] || ""}
                        onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                        placeholder={currentQuestion.placeholder}
                      />
                    )}

                    {currentQuestion.type === "textarea" && (
                      <Textarea
                        value={answers[currentQuestion.id] || ""}
                        onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                        placeholder={currentQuestion.placeholder}
                        rows={4}
                      />
                    )}

                    {currentQuestion.type === "select" && currentQuestion.options && (
                      <Select
                        value={answers[currentQuestion.id] || ""}
                        onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select an option" />
                        </SelectTrigger>
                        <SelectContent>
                          {currentQuestion.options.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {currentQuestion.type === "number" && (
                      <Input
                        type="number"
                        value={answers[currentQuestion.id] || ""}
                        onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                        placeholder={currentQuestion.placeholder}
                      />
                    )}

                    {currentQuestion.type === "date" && (
                      <Input
                        type="date"
                        value={answers[currentQuestion.id] || ""}
                        onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      />
                    )}
                  </motion.div>

                  <div className="flex justify-between pt-4">
                    <Button
                      variant="outline"
                      onClick={handlePrevQuestion}
                      disabled={currentQuestionIndex === 0}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Previous
                    </Button>
                    <Button
                      onClick={handleNextQuestion}
                      disabled={!isCurrentAnswerValid()}
                    >
                      {currentQuestionIndex === questions.length - 1 ? (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate Document
                        </>
                      ) : (
                        <>
                          Next
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No questions available
                </p>
              )}
            </motion.div>
          )}

          {/* Step 4: Generating */}
          {step === "generating" && (
            <motion.div
              key="generating"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-12 gap-4"
            >
              <div className="relative">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-foreground">Generating Your Document</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  AI is creating a customised document based on your answers...
                </p>
              </div>
            </motion.div>
          )}

          {/* Step 5: Complete */}
          {step === "complete" && generatedDocument && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="flex flex-col items-center text-center gap-3">
                <div className="h-14 w-14 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle className="h-7 w-7 text-success" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Document Ready!</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {generatedDocument.title}
                  </p>
                </div>
              </div>

              <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                <p className="text-sm font-medium text-foreground">Document Preview:</p>
                <p className="text-xs text-muted-foreground">
                  Reference: {generatedDocument.reference}
                </p>
                <p className="text-xs text-muted-foreground">
                  Sections: {generatedDocument.sections?.length || 0}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={handleDownloadPDF}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button
                  onClick={handleDownloadDOCX}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Word
                </Button>
              </div>

              <Button
                variant="ghost"
                onClick={() => setStep("select_template")}
                className="w-full"
              >
                Generate Another Document
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
