import React, {
  createContext, useContext, useEffect, useState, useCallback, useRef,
} from 'react';
import { syncEngine } from './sync';
import { getQueueCounts, getPendingConflictItems } from './queue';
import type { QueueItem, SyncStats } from './types';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/hooks/useOrg';
import { ConflictDialog } from '@/components/offline/ConflictDialog';

interface SyncContextValue {
  syncState: 'idle' | 'checking' | 'syncing' | 'paused_auth' | 'paused_offline';
  counts: { queued: number; syncing: number; failed: number; synced: number };
  lastSyncStats: Partial<SyncStats> | null;
  pendingConflictCount: number;
  triggerSync: () => Promise<void>;
  resolveConflict: (itemId: string, resolution: 'keep_mine' | 'keep_server' | 'skip') => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { membership } = useOrg();
  const [syncState, setSyncState] = useState<SyncContextValue['syncState']>('idle');
  const [counts, setCounts] = useState({ queued: 0, syncing: 0, failed: 0, synced: 0 });
  const [lastSyncStats, setLastSyncStats] = useState<Partial<SyncStats> | null>(null);
  const [pendingConflictCount, setPendingConflictCount] = useState(0);
  const [pendingConflicts, setPendingConflicts] = useState<QueueItem[]>([]);
  const [dismissedConflictIds, setDismissedConflictIds] = useState<string[]>([]);
  const countsTimer = useRef<ReturnType<typeof setInterval>>();

  const refreshCounts = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [c, conflicts] = await Promise.all([
        getQueueCounts(user.id),
        getPendingConflictItems(user.id),
      ]);
      setCounts(c);
      setPendingConflicts(conflicts);
      setPendingConflictCount(conflicts.length);
    } catch {
      // IDB may not be available in all contexts
    }
  }, [user?.id]);

  useEffect(() => {
    countsTimer.current = setInterval(refreshCounts, 5000);
    refreshCounts();
    return () => clearInterval(countsTimer.current!);
  }, [refreshCounts]);

  useEffect(() => {
    if (!user?.id || !membership?.orgId) return;
    syncEngine.init(user.id, membership.orgId);

    const unsubscribe = syncEngine.subscribe((state, stats) => {
      setSyncState(state);
      if (stats) setLastSyncStats(stats);
      refreshCounts();
    });

    syncEngine.trigger('app_mount');

    return () => {
      unsubscribe();
      syncEngine.destroy();
    };
  }, [user?.id, membership?.orgId, refreshCounts]);

  const triggerSync = useCallback(async () => {
    await syncEngine.trigger('manual');
  }, []);

  const resolveConflict = useCallback(async (
    itemId: string,
    resolution: 'keep_mine' | 'keep_server' | 'skip'
  ) => {
    await syncEngine.resolveConflict(itemId, resolution);
    setDismissedConflictIds((prev) => prev.filter((id) => id !== itemId));
    await refreshCounts();
  }, [refreshCounts]);

  const activeConflict = pendingConflicts.find(
    (item) => !dismissedConflictIds.includes(item.id)
  ) ?? null;

  return (
    <>
      <SyncContext.Provider value={{
        syncState, counts, lastSyncStats, pendingConflictCount,
        triggerSync, resolveConflict,
      }}>
        {children}
      </SyncContext.Provider>
      {activeConflict && (
        <ConflictDialog
          item={activeConflict}
          onResolve={(resolution) => resolveConflict(activeConflict.id, resolution)}
          onClose={() => {
            setDismissedConflictIds((prev) => (
              prev.includes(activeConflict.id) ? prev : [...prev, activeConflict.id]
            ));
          }}
        />
      )}
    </>
  );
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used within <SyncProvider>');
  return ctx;
}
