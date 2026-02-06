import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import SignatureCanvas from "react-signature-canvas";
import { toast } from "sonner";
import { 
  Video, 
  CheckCircle, 
  ClipboardCheck, 
  PenLine, 
  ArrowRight, 
  ArrowLeft,
  RotateCcw,
  Loader2 
} from "lucide-react";

interface InductionItem {
  id: string;
  question: string;
  description: string | null;
  is_required: boolean;
}

interface InductionTemplate {
  id: string;
  name: string;
  description: string | null;
  video_url: string | null;
  items: InductionItem[];
}

interface VisitorInfo {
  visitor_name: string;
  visitor_email: string;
  visitor_company: string;
  visitor_phone: string;
}

interface InductionFlowProps {
  template: InductionTemplate;
  visitorInfo: VisitorInfo;
  onComplete: (signatureData: string, completionId: string) => void;
  onCancel: () => void;
  apiUrl: string;
  apiKey: string;
  projectId: string;
  organisationId: string;
}

type Step = "video" | "checklist" | "signature" | "complete";

export function InductionFlow({ 
  template, 
  visitorInfo, 
  onComplete, 
  onCancel,
  apiUrl,
  apiKey,
  projectId,
  organisationId
}: InductionFlowProps) {
  const [currentStep, setCurrentStep] = useState<Step>(template.video_url ? "video" : "checklist");
  const [videoWatched, setVideoWatched] = useState(!template.video_url);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const signatureRef = useRef<SignatureCanvas>(null);

  const steps: Step[] = template.video_url 
    ? ["video", "checklist", "signature", "complete"]
    : ["checklist", "signature", "complete"];

  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const toggleItem = (itemId: string) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(itemId)) {
      newChecked.delete(itemId);
    } else {
      newChecked.add(itemId);
    }
    setCheckedItems(newChecked);
  };

  const allRequiredChecked = template.items
    .filter(item => item.is_required)
    .every(item => checkedItems.has(item.id));

  const clearSignature = () => {
    signatureRef.current?.clear();
  };

  const getYouTubeEmbedUrl = (url: string) => {
    const videoIdMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (videoIdMatch) {
      return `https://www.youtube.com/embed/${videoIdMatch[1]}`;
    }
    return url;
  };

  const getVimeoEmbedUrl = (url: string) => {
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }
    return url;
  };

  const getEmbedUrl = (url: string) => {
    if (url.includes("youtube") || url.includes("youtu.be")) {
      return getYouTubeEmbedUrl(url);
    }
    if (url.includes("vimeo")) {
      return getVimeoEmbedUrl(url);
    }
    return url;
  };

  const handleSubmit = async () => {
    if (signatureRef.current?.isEmpty()) {
      toast.error("Please provide your signature");
      return;
    }

    const signatureData = signatureRef.current?.toDataURL("image/png") || "";
    
    setSubmitting(true);
    try {
      const response = await fetch(
        `${apiUrl}/functions/v1/site-access?action=complete-induction`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": apiKey,
          },
          body: JSON.stringify({
            template_id: template.id,
            project_id: projectId,
            organisation_id: organisationId,
            visitor_name: visitorInfo.visitor_name,
            visitor_email: visitorInfo.visitor_email || null,
            visitor_company: visitorInfo.visitor_company || null,
            visitor_phone: visitorInfo.visitor_phone || null,
            signature_data: signatureData,
            checked_items: Array.from(checkedItems),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || "Failed to complete induction");
      }

      setCurrentStep("complete");
      setTimeout(() => {
        onComplete(signatureData, result.completion?.id || "");
      }, 2000);
    } catch (error: any) {
      console.error("Induction error:", error);
      toast.error(error.message || "Failed to complete induction");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            <span className="font-semibold">{template.name}</span>
          </div>
          <span className="text-sm text-muted-foreground">
            Step {currentStepIndex + 1} of {steps.length}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </CardHeader>

      <CardContent className="pt-6">
        {/* Video Step */}
        {currentStep === "video" && template.video_url && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Video className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Watch Safety Video</h3>
            </div>
            <p className="text-muted-foreground text-sm mb-4">
              Please watch the entire safety video before proceeding
            </p>
            <div className="aspect-video rounded-lg overflow-hidden bg-black">
              <iframe
                src={getEmbedUrl(template.video_url)}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Checkbox
                id="video-watched"
                checked={videoWatched}
                onCheckedChange={(checked) => setVideoWatched(checked as boolean)}
              />
              <Label htmlFor="video-watched" className="text-sm cursor-pointer">
                I confirm I have watched the safety video
              </Label>
            </div>
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button 
                onClick={() => setCurrentStep("checklist")}
                disabled={!videoWatched}
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Checklist Step */}
        {currentStep === "checklist" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Safety Acknowledgements</h3>
            </div>
            <p className="text-muted-foreground text-sm mb-4">
              Please confirm you understand and agree to the following:
            </p>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {template.items.map((item, index) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    checkedItems.has(item.id) ? "bg-primary/5 border-primary/20" : ""
                  }`}
                >
                  <Checkbox
                    id={item.id}
                    checked={checkedItems.has(item.id)}
                    onCheckedChange={() => toggleItem(item.id)}
                  />
                  <div className="flex-1">
                    <Label htmlFor={item.id} className="cursor-pointer">
                      <span className="font-medium">{item.question}</span>
                      {item.is_required && (
                        <span className="text-destructive ml-1">*</span>
                      )}
                    </Label>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-6">
              {template.video_url ? (
                <Button variant="outline" onClick={() => setCurrentStep("video")}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              ) : (
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button 
                onClick={() => setCurrentStep("signature")}
                disabled={!allRequiredChecked}
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Signature Step */}
        {currentStep === "signature" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <PenLine className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Sign to Complete</h3>
            </div>
            <p className="text-muted-foreground text-sm mb-4">
              By signing below, you confirm that you have understood and will comply with all safety requirements.
            </p>
            
            <div className="bg-muted rounded-lg p-4 mb-4">
              <p className="text-sm">
                <strong>Name:</strong> {visitorInfo.visitor_name}
              </p>
              {visitorInfo.visitor_company && (
                <p className="text-sm">
                  <strong>Company:</strong> {visitorInfo.visitor_company}
                </p>
              )}
            </div>

            <div className="border rounded-lg p-1 bg-white">
              <SignatureCanvas
                ref={signatureRef}
                canvasProps={{
                  className: "w-full h-48 rounded",
                  style: { width: "100%", height: "12rem" },
                }}
                backgroundColor="white"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Sign above using your finger or mouse
              </span>
              <Button variant="ghost" size="sm" onClick={clearSignature}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setCurrentStep("checklist")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Complete Induction
                    <CheckCircle className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Complete Step */}
        {currentStep === "complete" && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Induction Complete!</h3>
            <p className="text-muted-foreground">
              You have successfully completed the site induction. 
              Redirecting to check-in...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}