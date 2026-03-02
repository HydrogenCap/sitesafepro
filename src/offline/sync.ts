import { supabase } from '@/integrations/supabase/client';
import {
  upsertQueueItem, getBlob, appendSyncLog,
} from './db';
import { getDueItems, markSyncing, markSynced, markFailed } from './queue';
import { telemetry } from './telemetry';
import type { QueueItem, ConflictResult, SyncStats, SyncLogEvent } from './types';
import { v4 as uuid } from 'uuid';
import { storagePaths } from '@/lib/storagePaths';

type SyncState = 'idle' | 'checking' | 'syncing' | 'paused_auth' | 'paused_offline';
type SyncListener = (state: SyncState, stats?: Partial<SyncStats>) => void;

class SyncEngine {
  private state: SyncState = 'idle';
  private listeners: Set<SyncListener> = new Set();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private userId: string | null = null;
  private orgId: string | null = null;
  private running = false;
  pendingConflicts: Map<string, QueueItem> = new Map();

  init(userId: string, orgId: string) {
    this.userId = userId;
    this.orgId = orgId;

    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = setInterval(() => this.trigger('interval'), 30_000);

    window.addEventListener('online', this.onOnline);
    document.addEventListener('visibilitychange', this.onVisibility);
    navigator.serviceWorker?.addEventListener('message', this.onSwMessage);
  }

  destroy() {
    if (this.intervalId) clearInterval(this.intervalId);
    window.removeEventListener('online', this.onOnline);
    document.removeEventListener('visibilitychange', this.onVisibility);
    navigator.serviceWorker?.removeEventListener('message', this.onSwMessage);
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(state: SyncState, stats?: Partial<SyncStats>) {
    this.state = state;
    this.listeners.forEach(l => l(state, stats));
  }

  private onOnline = () => this.trigger('online');
  private onVisibility = () => {
    if (document.visibilityState === 'visible') this.trigger('visibility');
  };
  private onSwMessage = (event: MessageEvent) => {
    if (event.data?.type === 'BACKGROUND_SYNC_TRIGGER') this.trigger('bg_sync');
  };

  async trigger(_source: string): Promise<SyncStats | null> {
    if (this.running) return null;
    if (!navigator.onLine) { this.emit('paused_offline'); return null; }
    if (!this.userId || !this.orgId) return null;
    return this.runSync();
  }

  async runSync(): Promise<SyncStats> {
    if (this.running) return { synced: 0, failed: 0, skipped: 0, conflictsResolved: 0, conflictsNeedingReview: 0 };
    this.running = true;
    this.emit('syncing');

    const stats: SyncStats = { synced: 0, failed: 0, skipped: 0, conflictsResolved: 0, conflictsNeedingReview: 0 };
    const sessionId = uuid();

    await this.log(null, 'sync_started', `session=${sessionId}`);

    try {
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !session) {
        const { error: refreshErr } = await supabase.auth.refreshSession();
        if (refreshErr) {
          await this.log(null, 'auth_error', refreshErr.message);
          telemetry.error('sync_auth_error', { message: refreshErr.message });
          this.emit('paused_auth');
          this.running = false;
          return stats;
        }
      }

      const items = await getDueItems(this.userId!);
      if (items.length === 0) {
        this.emit('idle', stats);
        this.running = false;
        return stats;
      }

      const byDocument = groupByDocument(items);

      for (const [, docItems] of byDocument) {
        for (const item of docItems) {
          const result = await this.processItem(item);
          if (result === 'synced') stats.synced++;
          else if (result === 'failed') stats.failed++;
          else if (result === 'skipped') stats.skipped++;
          else if (result === 'conflict_auto') stats.conflictsResolved++;
          else if (result === 'conflict_user') stats.conflictsNeedingReview++;
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      telemetry.error('sync_engine_crash', { message: msg });
      await this.log(null, 'network_error', msg);
    } finally {
      this.running = false;
      await this.log(null, 'sync_completed', JSON.stringify(stats));
      this.emit('idle', stats);
    }

    return stats;
  }

  private async processItem(
    item: QueueItem
  ): Promise<'synced' | 'failed' | 'skipped' | 'conflict_auto' | 'conflict_user'> {
    await this.log(item.id, 'item_started', item.type);
    await markSyncing(this.userId!, item);

    try {
      const conflict = await this.checkConflict(item);

      if (conflict.type === 'version_deleted') {
        await markSynced(this.userId!, item);
        await this.log(item.id, 'item_succeeded', 'skipped_version_deleted');
        return 'skipped';
      }

      if (conflict.type === 'version_approved') {
        await this.log(item.id, 'item_conflict', 'version_approved_creating_new_draft');
        const newVersionId = await this.createNewVersionForConflict(item);
        if (!newVersionId) {
          await markFailed(this.userId!, item, 'Failed to create new version for conflict resolution');
          return 'failed';
        }
        const updatedItem = { ...item, version_id: newVersionId };
        await upsertQueueItem(this.userId!, updatedItem);
        return this.processItem(updatedItem);
      }

      if (conflict.type === 'concurrent_edit') {
        await this.log(item.id, 'item_conflict', 'concurrent_edit_needs_user');
        this.pendingConflicts.set(item.id, item);
        await markFailed(this.userId!, item, 'Conflict: document was edited by another user while offline');
        return 'conflict_user';
      }

      for (const blobKey of item.blob_keys) {
        const blobEntry = await getBlob(this.userId!, blobKey);
        if (!blobEntry) continue;
        await this.log(item.id, 'blob_upload_started', blobKey);
        await this.uploadBlob(item, blobEntry);
        await this.log(item.id, 'blob_upload_done', blobKey);
      }

      await this.executeItem(item);

      await markSynced(this.userId!, item);
      await this.log(item.id, 'item_succeeded', item.type);
      return 'synced';
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err && typeof err === 'object' && 'message' in err) ? String((err as any).message) : String(err);
      await markFailed(this.userId!, item, msg);
      await this.log(item.id, 'item_failed', msg);
      telemetry.error('sync_item_failed', { itemId: item.id, type: item.type, message: msg });
      return 'failed';
    }
  }

  private async checkConflict(item: QueueItem): Promise<ConflictResult> {
    if (!item.version_id) return { type: 'none' };

    const { data, error } = await supabase
      .from('document_versions')
      .select('id, status, is_immutable, updated_at')
      .eq('id', item.version_id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return { type: 'version_deleted' };
    if (data.is_immutable) return { type: 'version_approved', serverVersion: data };

    const serverUpdatedMs = new Date(data.updated_at).getTime();
    if (serverUpdatedMs > item.captured_at) {
      return { type: 'concurrent_edit', serverVersion: data };
    }

    return { type: 'none' };
  }

  private async createNewVersionForConflict(item: QueueItem): Promise<string | null> {
    if (!item.document_id) return null;
    try {
      const { data, error } = await supabase.functions.invoke('create-version', {
        body: {
          org_id: item.org_id,
          document_id: item.document_id,
          change_summary: `Auto-created: local offline capture from ${new Date(item.captured_at).toISOString()}`,
        },
      });
      if (error || !data?.version_id) throw error ?? new Error('No version_id returned');
      return data.version_id as string;
    } catch (err) {
      telemetry.error('create_version_for_conflict_failed', {
        documentId: item.document_id,
        error: String(err),
      });
      return null;
    }
  }

  private async uploadBlob(item: QueueItem, blob: import('./types').BlobEntry): Promise<void> {
    const ext = blob.mime_type.split('/')[1] ?? 'bin';
    const evidenceId = item.payload.evidence_id as string ?? item.id;

    const path = storagePaths.evidence(
      item.org_id,
      item.project_id ?? 'no-project',
      item.document_id ?? 'no-document',
      item.version_id ?? 'no-version',
      evidenceId,
      ext
    );

    const { error } = await supabase.storage
      .from('evidence')
      .upload(path, blob.data, { contentType: blob.mime_type, upsert: false });

    if (error && !error.message.includes('already exists')) {
      throw new Error(`Blob upload failed: ${error.message}`);
    }

    const updatedPayload = { ...item.payload, storage_path: path };
    await upsertQueueItem(this.userId!, { ...item, payload: updatedPayload });
  }

  private async executeItem(item: QueueItem): Promise<void> {
    const orgId = item.org_id;
    const payload = item.payload;

    switch (item.type) {
      case 'evidence_photo':
      case 'evidence_note':
      case 'evidence_signature': {
        const insertData = {
          organisation_id: orgId,
          document_version_id: item.version_id!,
          type: payload.type as string,
          storage_path: (payload.storage_path as string) ?? null,
          caption: (payload.caption as string) ?? null,
          sort_order: (payload.sort_order as number) ?? 0,
          metadata_json: (payload.metadata_json as Record<string, unknown>) ?? {},
          created_by: item.user_id,
        };
        const { error } = await supabase.from('evidence_items').insert(insertData as any);
        if (error) throw error;
        break;
      }

      case 'hazard_note':
      case 'action_item': {
        const { data: ver, error: verErr } = await supabase
          .from('document_versions')
          .select('content_json')
          .eq('id', item.version_id!)
          .single();
        if (verErr) throw verErr;

        const sectionKey = item.type === 'hazard_note' ? 'hazards' : 'actions';
        const existing = (ver.content_json as Record<string, unknown>)[sectionKey] ?? [];
        const updated = [...(Array.isArray(existing) ? existing : [existing]), payload.entry];

        const { error: updErr } = await supabase
          .from('document_versions')
          .update({ content_json: { ...(ver.content_json as object), [sectionKey]: updated } })
          .eq('id', item.version_id!);
        if (updErr) throw updErr;
        break;
      }

      case 'document_section_edit': {
        const { data: ver, error: verErr } = await supabase
          .from('document_versions')
          .select('content_json')
          .eq('id', item.version_id!)
          .single();
        if (verErr) throw verErr;

        const merged = { ...(ver.content_json as object), ...(payload.section_updates as object) };
        const { error: updErr } = await supabase
          .from('document_versions')
          .update({ content_json: merged })
          .eq('id', item.version_id!);
        if (updErr) throw updErr;
        break;
      }

      case 'request_review': {
        const { data, error } = await supabase.functions.invoke('request-review', {
          body: { org_id: orgId, version_id: item.version_id },
        });
        if (error || !data?.ok) throw error ?? new Error(data?.error);
        break;
      }

      case 'create_version': {
        const { data, error } = await supabase.functions.invoke('create-version', {
          body: {
            org_id: orgId,
            document_id: item.document_id,
            change_summary: payload.change_summary,
          },
        });
        if (error || !data?.version_id) throw error ?? new Error('No version_id returned');
        break;
      }

      default:
        throw new Error(`Unknown queue item type: ${(item as QueueItem).type}`);
    }
  }

  async resolveConflict(
    itemId: string,
    resolution: 'keep_mine' | 'keep_server' | 'skip'
  ): Promise<void> {
    const item = this.pendingConflicts.get(itemId);
    if (!item) return;

    this.pendingConflicts.delete(itemId);

    if (resolution === 'keep_server') {
      const { discardItem } = await import('./queue');
      await discardItem(this.userId!, itemId);
    } else if (resolution === 'skip') {
      // Leave as 'failed'
    } else {
      const updated = {
        ...item,
        status: 'queued' as const,
        attempt_count: 0,
        next_retry_at: null,
        error_message: null,
        payload: { ...item.payload, _force_overwrite: true },
      };
      await upsertQueueItem(this.userId!, updated);
    }
  }

  private async log(itemId: string | null, event: SyncLogEvent, detail: string) {
    if (!this.userId) return;
    await appendSyncLog(this.userId, {
      id: uuid(),
      queue_item_id: itemId,
      event,
      detail,
      timestamp: Date.now(),
    });
  }

  getState(): SyncState { return this.state; }
  getPendingConflicts(): QueueItem[] { return Array.from(this.pendingConflicts.values()); }
}

function groupByDocument(items: QueueItem[]): Map<string, QueueItem[]> {
  const map = new Map<string, QueueItem[]>();
  for (const item of items) {
    const key = item.document_id ?? '__no_document__';
    const group = map.get(key) ?? [];
    group.push(item);
    map.set(key, group);
  }
  for (const [k, group] of map) {
    map.set(k, group.sort((a, b) => a.captured_at - b.captured_at));
  }
  return map;
}

export const syncEngine = new SyncEngine();
