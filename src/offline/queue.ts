import { v4 as uuid } from 'uuid';
import { upsertQueueItem, putBlob, getAllQueueItems, deleteQueueItem } from './db';
import type { QueueItem, QueueItemType, BlobEntry } from './types';

const CLIENT_VERSION = import.meta.env.VITE_APP_VERSION ?? 'dev';

interface EnqueueOptions {
  type: QueueItemType;
  orgId: string;
  projectId?: string | null;
  documentId?: string | null;
  versionId?: string | null;
  payload: Record<string, unknown>;
  blob?: {
    data: ArrayBuffer;
    mimeType: string;
    fileName: string;
  };
  userId: string;
  capturedOffline?: boolean;
}

export async function enqueue(opts: EnqueueOptions): Promise<QueueItem> {
  const itemId = uuid();
  const now = Date.now();
  let blobKeys: string[] = [];

  if (opts.blob) {
    const blobKey = `${itemId}-blob`;
    const blobEntry: BlobEntry = {
      key: blobKey,
      queue_item_id: itemId,
      data: opts.blob.data,
      mime_type: opts.blob.mimeType,
      file_name: opts.blob.fileName,
      size_bytes: opts.blob.data.byteLength,
      created_at: now,
    };
    await putBlob(opts.userId, blobEntry);
    blobKeys = [blobKey];
  }

  const item: QueueItem = {
    id: itemId,
    type: opts.type,
    org_id: opts.orgId,
    project_id: opts.projectId ?? null,
    document_id: opts.documentId ?? null,
    version_id: opts.versionId ?? null,
    payload: opts.payload,
    blob_keys: blobKeys,
    status: 'queued',
    attempt_count: 0,
    last_attempted_at: null,
    next_retry_at: null,
    error_message: null,
    synced_at: null,
    captured_at: now,
    captured_offline: opts.capturedOffline ?? !navigator.onLine,
    user_id: opts.userId,
    client_version: CLIENT_VERSION,
  };

  await upsertQueueItem(opts.userId, item);
  return item;
}

export async function markSyncing(userId: string, item: QueueItem): Promise<QueueItem> {
  const updated = { ...item, status: 'syncing' as const, last_attempted_at: Date.now() };
  await upsertQueueItem(userId, updated);
  return updated;
}

export async function markSynced(userId: string, item: QueueItem): Promise<QueueItem> {
  const updated = { ...item, status: 'synced' as const, synced_at: Date.now(), error_message: null };
  await upsertQueueItem(userId, updated);
  return updated;
}

export function computeNextRetry(attemptCount: number): number {
  const delays = [10, 30, 120, 600, 1800, 3600];
  const delaySecs = delays[Math.min(attemptCount - 1, delays.length - 1)];
  const jitter = delaySecs * 0.2 * (Math.random() - 0.5);
  return Date.now() + (delaySecs + jitter) * 1000;
}

export async function markFailed(
  userId: string,
  item: QueueItem,
  errorMessage: string
): Promise<QueueItem> {
  const newAttempts = item.attempt_count + 1;
  const updated: QueueItem = {
    ...item,
    status: 'failed',
    attempt_count: newAttempts,
    error_message: errorMessage,
    next_retry_at: computeNextRetry(newAttempts),
    last_attempted_at: Date.now(),
  };
  await upsertQueueItem(userId, updated);
  return updated;
}

export async function requeueItem(userId: string, item: QueueItem): Promise<QueueItem> {
  const updated: QueueItem = {
    ...item,
    status: 'queued',
    attempt_count: 0,
    next_retry_at: null,
    error_message: null,
  };
  await upsertQueueItem(userId, updated);
  return updated;
}

export async function discardItem(userId: string, itemId: string): Promise<void> {
  await deleteQueueItem(userId, itemId);
}

export async function getDueItems(userId: string): Promise<QueueItem[]> {
  const allActive = await getAllQueueItems(userId, ['queued', 'failed']);
  const now = Date.now();
  return allActive.filter(
    item => item.next_retry_at === null || item.next_retry_at <= now
  );
}

export async function getQueueCounts(userId: string): Promise<{
  queued: number; syncing: number; failed: number; synced: number;
}> {
  const all = await getAllQueueItems(userId);
  return {
    queued: all.filter(i => i.status === 'queued').length,
    syncing: all.filter(i => i.status === 'syncing').length,
    failed: all.filter(i => i.status === 'failed').length,
    synced: all.filter(i => i.status === 'synced').length,
  };
}
