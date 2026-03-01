export type QueueItemType =
  | 'evidence_photo'
  | 'evidence_note'
  | 'evidence_signature'
  | 'hazard_note'
  | 'action_item'
  | 'document_section_edit'
  | 'request_review'
  | 'create_version';

export interface QueueItem {
  id: string;
  type: QueueItemType;
  org_id: string;
  project_id: string | null;
  document_id: string | null;
  version_id: string | null;
  payload: Record<string, unknown>;
  blob_keys: string[];
  status: 'queued' | 'syncing' | 'failed' | 'synced';
  attempt_count: number;
  last_attempted_at: number | null;
  next_retry_at: number | null;
  error_message: string | null;
  synced_at: number | null;
  captured_at: number;
  captured_offline: boolean;
  user_id: string;
  client_version: string;
}

export interface BlobEntry {
  key: string;
  queue_item_id: string;
  data: ArrayBuffer;
  mime_type: string;
  file_name: string;
  size_bytes: number;
  created_at: number;
}

export interface CachedDocument {
  id: string;
  version_id: string;
  org_id: string;
  project_id: string | null;
  title: string;
  type: string;
  status: string;
  content_json: Record<string, unknown>;
  cached_at: number;
  version_number: number;
  is_immutable: boolean;
}

export interface SyncLogEntry {
  id: string;
  queue_item_id: string | null;
  event: SyncLogEvent;
  detail: string;
  timestamp: number;
}

export type SyncLogEvent =
  | 'sync_started' | 'sync_completed' | 'sync_paused'
  | 'item_started' | 'item_succeeded' | 'item_failed'
  | 'item_conflict' | 'auth_error' | 'network_error'
  | 'backoff_scheduled' | 'blob_upload_started' | 'blob_upload_done';

export interface ConflictResult {
  type: 'none' | 'version_deleted' | 'version_approved' | 'concurrent_edit';
  serverVersion?: {
    id: string;
    status: string;
    is_immutable: boolean;
    updated_at: string;
  };
}

export interface SyncStats {
  synced: number;
  failed: number;
  skipped: number;
  conflictsResolved: number;
  conflictsNeedingReview: number;
}
