import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Rocket, FileText, AlertTriangle, Loader2, CheckCircle } from "lucide-react";

interface DocumentTemplate {
  id: string;
  name: string;
  category: string;
  requires_acknowledgement: boolean;
}

interface GoLiveConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  onConfirm: () => void;
  isLoading: boolean;
}

export const GoLiveConfirmDialog = ({
  open,
  onOpenChange,
  projectName,
  onConfirm,
  isLoading,
}: GoLiveConfirmDialogProps) => {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  useEffect(() => {
    const fetchTemplates = async () => {
      if (!open) return;
      setLoadingTemplates(true);
      try {
        const { data, error } = await supabase
          .from("document_templates")
          .select("id, name, category, requires_acknowledgement")
          .eq("auto_generate_on_go_live", true)
          .eq("is_active", true)
          .order("sort_order");

        if (error) throw error;
        setTemplates(data || []);
      } catch (error) {
        console.error("Error fetching templates:", error);
      } finally {
        setLoadingTemplates(false);
      }
    };

    fetchTemplates();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            Take Site Live
          </DialogTitle>
          <DialogDescription>
            Activate <strong>{projectName}</strong> and generate site documents
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Success message */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-success/10 border border-success/20">
            <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">
                All pre-construction requirements are satisfied
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                The site is ready to go live
              </p>
            </div>
          </div>

          {/* Templates to generate */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">
              Documents to generate:
            </h4>
            {loadingTemplates ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading templates...
              </div>
            ) : templates.length > 0 ? (
              <ul className="space-y-2">
                {templates.map((template) => (
                  <li
                    key={template.id}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <FileText className="h-4 w-4 text-primary" />
                    <span>{template.name}</span>
                    {template.requires_acknowledgement && (
                      <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                        Requires signature
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
                <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-foreground">
                    No document templates configured
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The site will go live without auto-generated documents. You can
                    set up templates in Settings → Document Templates.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Going Live...
              </>
            ) : (
              <>
                <Rocket className="h-4 w-4 mr-2" />
                Go Live
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
