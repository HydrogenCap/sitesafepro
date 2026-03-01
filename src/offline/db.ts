import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { QueueItem, BlobEntry, CachedDocument, SyncLogEntry } from './types';

const DB_VERSION = 1;

interface SspOfflineDB extends DBSchema {
  queue_items: {
    key: string;
    value: QueueItem;
    indexes: {
      by_status: string;
      by_status_doc: [string, string | null];
      by_next_retry: [string, number | null];
    };
  };
  blobs: {
    key: string;
    value: BlobEntry;
    indexes: {
      by_queue_item: string;
    };
  };
  cached_documents: {
    key: string;
    value: CachedDocument;
    indexes: {
      by_project: string | null;
      by_org: string;
    };
  };
  sync_log: {
    key: string;
    value: SyncLogEntry;
    indexes: {
      by_time: number;
      by_item: [string | null, number];
    };
  };
}

let _db: IDBPDatabase<SspOfflineDB> | null = null;
let _currentUserId: string | null = null;

export async function getDb(userId: string): Promise<IDBPDatabase<SspOfflineDB>> {
  if (_db && _currentUserId !== userId) {
    _db.close();
    _db = null;
  }

  if (_db) return _db;

  _currentUserId = userId;
  _db = await openDB<SspOfflineDB>(`ssp-offline-${userId}`, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        const qi = db.createObjectStore('queue_items', { keyPath: 'id' });
        qi.createIndex('by_status', 'status');
        qi.createIndex('by_status_doc', ['status', 'document_id']);
        qi.createIndex('by_next_retry', ['status', 'next_retry_at']);

        const bl = db.createObjectStore('blobs', { keyPath: 'key' });
        bl.createIndex('by_queue_item', 'queue_item_id');

        const cd = db.createObjectStore('cached_documents', { keyPath: 'id' });
        cd.createIndex('by_project', 'project_id');
        cd.createIndex('by_org', 'org_id');

        const sl = db.createObjectStore('sync_log', { keyPath: 'id' });
        sl.createIndex('by_time', 'timestamp');
        sl.createIndex('by_item', ['queue_item_id', 'timestamp']);
      }
    },
    blocked() {
      console.warn('[IDB] Database upgrade blocked — other tabs open?');
    },
    blocking() {
      _db?.close();
      _db = null;
    },
  });

  return _db;
}

export async function closeDb(): Promise<void> {
  _db?.close();
  _db = null;
  _currentUserId = null;
}

export async function getAllQueueItems(
  userId: string,
  status?: QueueItem['status'] | QueueItem['status'][]
): Promise<QueueItem[]> {
  const db = await getDb(userId);
  if (!status) {
    return db.getAll('queue_items');
  }
  const statuses = Array.isArray(status) ? status : [status];
  const results = await Promise.all(
    statuses.map(s => db.getAllFromIndex('queue_items', 'by_status', s))
  );
  return results.flat().sort((a, b) => a.captured_at - b.captured_at);
}

export async function getQueueItemsByDocument(
  userId: string,
  documentId: string,
  status: QueueItem['status']
): Promise<QueueItem[]> {
  const db = await getDb(userId);
  return db.getAllFromIndex('queue_items', 'by_status_doc', [status, documentId]);
}

export async function upsertQueueItem(userId: string, item: QueueItem): Promise<void> {
  const db = await getDb(userId);
  await db.put('queue_items', item);
}

export async function deleteQueueItem(userId: string, id: string): Promise<void> {
  const db = await getDb(userId);
  const blobs = await db.getAllFromIndex('blobs', 'by_queue_item', id);
  const tx = db.transaction(['queue_items', 'blobs'], 'readwrite');
  await Promise.all([
    tx.objectStore('queue_items').delete(id),
    ...blobs.map(b => tx.objectStore('blobs').delete(b.key)),
    tx.done,
  ]);
}

export async function putBlob(userId: string, entry: BlobEntry): Promise<void> {
  const db = await getDb(userId);
  await db.put('blobs', entry);
}

export async function getBlob(userId: string, key: string): Promise<BlobEntry | undefined> {
  const db = await getDb(userId);
  return db.get('blobs', key);
}

export async function upsertCachedDocument(userId: string, doc: CachedDocument): Promise<void> {
  const db = await getDb(userId);
  await db.put('cached_documents', doc);
}

export async function getCachedDocument(userId: string, documentId: string): Promise<CachedDocument | undefined> {
  const db = await getDb(userId);
  return db.get('cached_documents', documentId);
}

export async function appendSyncLog(userId: string, entry: SyncLogEntry): Promise<void> {
  const db = await getDb(userId);
  await db.put('sync_log', entry);
}

export async function pruneSyncLog(userId: string): Promise<void> {
  const db = await getDb(userId);
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const tx = db.transaction('sync_log', 'readwrite');
  const index = tx.store.index('by_time');
  let cursor = await index.openCursor(IDBKeyRange.upperBound(cutoff));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}
