import { Download, FileText, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useExportPdf } from "@/hooks/useExportPdf";
import { cn } from "@/lib/utils";

interface Props { versionId: string; }

const STATUS_CONFIG = {
  idle: { icon: FileText, label: "Export PDF", variant: "outline" as const },
  pending: { icon: Loader2, label: "Starting…", variant: "outline" as const },
  processing: { icon: Loader2, label: "Generating…", variant: "outline" as const },
  completed: { icon: Download, label: "Download PDF", variant: "default" as const },
  failed: { icon: AlertCircle, label: "Export Failed", variant: "destructive" as const },
};

export function ExportPdfButton({ versionId }: Props) {
  const { triggerExport, status, signedUrl } = useExportPdf(versionId);
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  const isLoading = status === "pending" || status === "processing";

  const handleClick = () => {
    if (status === "completed" && signedUrl) {
      window.open(signedUrl, "_blank", "noopener noreferrer");
    } else if (status === "idle" || status === "failed") {
      triggerExport();
    }
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button size="sm" variant={config.variant} onClick={handleClick} disabled={isLoading}
        className={cn(status === "completed" && "bg-emerald-600 hover:bg-emerald-700 text-white border-0")}>
        <Icon className={cn("h-4 w-4 mr-1.5", isLoading && "animate-spin")} />
        {config.label}
      </Button>
      {isLoading && (
        <div className="w-32">
          <Progress value={status === "pending" ? 10 : 60} className="h-1" />
          <p className="text-[10px] text-muted-foreground mt-0.5 text-right">This may take a moment</p>
        </div>
      )}
      {status === "completed" && signedUrl && (
        <p className="text-[10px] text-muted-foreground">Link expires in 15 minutes</p>
      )}
    </div>
  );
}
