import { cn } from "@/lib/utils";
import { DocumentStatusBadge } from "./DocumentStatusBadge";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import type { DocumentVersion } from "@/hooks/useDocumentVersions";
import { useWorkflowActions } from "@/hooks/useWorkflowActions";
import { useOrg } from "@/hooks/useOrg";

interface Props {
  versions: DocumentVersion[];
  activeVersionId: string | null;
  onSelectVersion: (id: string) => void;
  documentId: string;
}

export function DocumentVersionHistory({ versions, activeVersionId, onSelectVersion, documentId }: Props) {
  const { can } = useOrg();
  const { perform, loading } = useWorkflowActions(() => onSelectVersion(activeVersionId!));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Version History</h3>
        {can("write") && versions.some(v => v.status === "approved") && (
          <Button size="sm" variant="outline"
            onClick={() => perform("create_version", { document_id: documentId })}
            disabled={loading === "create_version"}>
            <PlusCircle className="h-4 w-4 mr-1" /> New Version
          </Button>
        )}
      </div>

      <ol className="relative border-l border-border ml-3 space-y-0">
        {versions.map((v, idx) => (
          <li key={v.id} className="mb-0">
            <button
              onClick={() => onSelectVersion(v.id)}
              className={cn(
                "w-full text-left pl-6 pr-3 py-3 hover:bg-muted/50 transition-colors",
                "relative before:absolute before:left-[-5px] before:top-4",
                "before:h-2.5 before:w-2.5 before:rounded-full before:border-2",
                activeVersionId === v.id
                  ? "bg-muted before:bg-primary before:border-primary"
                  : "before:bg-background before:border-border"
              )}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">v{v.version_number}</span>
                <DocumentStatusBadge status={v.status} compact />
              </div>
              {v.change_summary && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{v.change_summary}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(v.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                {v.approved_at && ` · Approved ${new Date(v.approved_at).toLocaleDateString("en-GB")}`}
              </p>
            </button>
            {idx < versions.length - 1 && <div className="h-px bg-border ml-6" />}
          </li>
        ))}
      </ol>
    </div>
  );
}
