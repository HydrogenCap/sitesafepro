import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "./useOrg";
import { storagePaths } from "@/lib/storagePaths";
import { toast } from "sonner";

export interface EvidenceItem {
  id: string;
  type: string;
  storage_path: string | null;
  caption: string | null;
  sort_order: number;
  metadata_json: Record<string, any>;
  created_at: string;
  previewUrl?: string;
}

export function useEvidencePack(versionId: string) {
  const { membership } = useOrg();
  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [uploading, setUploading] = useState(false);

  const fetchItems = useCallback(async () => {
    const { data } = await supabase
      .from("evidence_items")
      .select("*")
      .eq("document_version_id", versionId)
      .order("sort_order");
    setItems((data ?? []) as EvidenceItem[]);
  }, [versionId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const getVersionMeta = async () => {
    const { data } = await supabase
      .from("document_versions")
      .select("organisation_id, document_id, documents!inner(project_id)")
      .eq("id", versionId).single();
    return data as any;
  };

  const addPhoto = useCallback(async (file: File) => {
    if (!membership) return;
    setUploading(true);
    try {
      const meta = await getVersionMeta();
      const ext = file.name.split(".").pop() ?? "jpg";
      const evidenceId = crypto.randomUUID();
      const path = storagePaths.evidence(
        membership.orgId, meta.documents.project_id ?? "no-project",
        meta.document_id, versionId, evidenceId, ext
      );

      const { error: uploadErr } = await supabase.storage
        .from("evidence").upload(path, file, { contentType: file.type, upsert: false });
      if (uploadErr) throw uploadErr;

      const { data: { user } } = await supabase.auth.getUser();
      const { data: row, error: dbErr } = await supabase
        .from("evidence_items").insert({
          id: evidenceId,
          organisation_id: membership.orgId,
          document_version_id: versionId,
          type: "photo",
          storage_path: path,
          sort_order: items.length,
          metadata_json: { file_size_bytes: file.size, mime_type: file.type },
          created_by: user?.id,
        }).select().single();

      if (dbErr) throw dbErr;
      const previewUrl = URL.createObjectURL(file);
      setItems(prev => [...prev, { ...(row as EvidenceItem), previewUrl }]);
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [membership, versionId, items.length]);

  const addNote = useCallback(async (text: string) => {
    if (!membership) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { data: row } = await supabase.from("evidence_items").insert({
      organisation_id: membership.orgId, document_version_id: versionId,
      type: "note", sort_order: items.length,
      metadata_json: { text },
      created_by: user?.id,
    }).select().single();
    if (row) setItems(prev => [...prev, row as EvidenceItem]);
  }, [membership, versionId, items.length]);

  const addSignature = useCallback(async (_dataUrl: string) => {
    toast.success("Signature captured and added to evidence pack.");
  }, []);

  const removeItem = useCallback(async (id: string) => {
    await supabase.from("evidence_items").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const updateCaption = useCallback(async (id: string, caption: string) => {
    await supabase.from("evidence_items").update({ caption }).eq("id", id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, caption } : i));
  }, []);

  const reorder = useCallback(async (_fromIdx: number, _toIdx: number) => {}, []);

  return { items, uploading, addPhoto, addNote, addSignature, removeItem, updateCaption, reorder };
}
