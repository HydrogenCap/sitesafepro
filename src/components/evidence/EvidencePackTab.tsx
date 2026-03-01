import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Image, FileText, StickyNote, GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEvidencePack } from "@/hooks/useEvidencePack";
import { cn } from "@/lib/utils";

interface Props { versionId: string; isLocked: boolean; }

const TYPE_ICONS = { photo: Image, note: StickyNote, file_attachment: FileText };

export function EvidencePackTab({ versionId, isLocked }: Props) {
  const { items, addPhoto, addNote, removeItem, updateCaption } = useEvidencePack(versionId);

  const onDrop = useCallback((files: File[]) => {
    files.forEach(f => addPhoto(f));
  }, [addPhoto]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { "image/*": [], "application/pdf": [] }, disabled: isLocked, maxSize: 50 * 1024 * 1024,
  });

  return (
    <div className="space-y-6">
      {!isLocked && (
        <div {...getRootProps()} className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        )}>
          <input {...getInputProps()} />
          <Image className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Drop photos or files here, or <span className="text-primary font-medium">click to upload</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, PDF · Max 50 MB each</p>
        </div>
      )}

      {!isLocked && (
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => addNote("Enter your note here…")}>
            <StickyNote className="h-4 w-4 mr-1.5" /> Add Note
          </Button>
        </div>
      )}

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          {isLocked ? "No evidence items were attached to this version." : "No evidence items yet."}
        </p>
      )}

      <div className="space-y-3">
        {items.map((item) => {
          const Icon = TYPE_ICONS[item.type as keyof typeof TYPE_ICONS] ?? FileText;
          return (
            <div key={item.id} className="flex items-start gap-3 p-3 border rounded-lg bg-card hover:bg-accent/30 transition-colors group">
              {!isLocked && (
                <button className="mt-1 cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="h-4 w-4" />
                </button>
              )}
              <div className="flex-shrink-0 w-10 h-10 rounded bg-muted flex items-center justify-center">
                {item.type === "photo" && item.previewUrl
                  ? <img src={item.previewUrl} alt="" className="w-10 h-10 object-cover rounded" />
                  : <Icon className="h-5 w-5 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                {item.type === "note" ? (
                  <textarea className="w-full text-sm bg-transparent resize-none outline-none" defaultValue={item.metadata_json?.text ?? ""} disabled={isLocked} rows={2} />
                ) : (
                  <Input value={item.caption ?? ""} placeholder="Add a caption…" disabled={isLocked}
                    onChange={(e) => updateCaption(item.id, e.target.value)}
                    className="h-7 text-sm border-0 p-0 focus-visible:ring-0 bg-transparent" />
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.type} · {new Date(item.created_at).toLocaleString("en-GB")}
                </p>
              </div>
              {!isLocked && (
                <button onClick={() => removeItem(item.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 mt-1">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
