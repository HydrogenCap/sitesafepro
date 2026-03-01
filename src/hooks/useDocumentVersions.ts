import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DocumentVersion {
  id: string;
  version_number: number;
  status: string;
  change_summary: string | null;
  created_at: string;
  approved_at: string | null;
  is_immutable: boolean;
}

export function useDocumentVersions(documentId: string | undefined) {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchVersions = useCallback(async () => {
    if (!documentId) return;
    setLoading(true);
    const { data } = await supabase
      .from("document_versions")
      .select("id, version_number, status, change_summary, created_at, approved_at, is_immutable")
      .eq("document_id", documentId)
      .order("version_number", { ascending: false });

    const vers = (data ?? []) as DocumentVersion[];
    setVersions(vers);
    const active = vers.find(v => v.status !== "superseded") ?? vers[0] ?? null;
    setActiveVersionId(active?.id ?? null);
    setLoading(false);
  }, [documentId]);

  useEffect(() => { fetchVersions(); }, [fetchVersions]);

  return { versions, activeVersionId, setActiveVersionId, loading, refetch: fetchVersions };
}
