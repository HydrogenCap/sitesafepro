import React, {
  createContext, useContext, useEffect, useState, useCallback, useRef,
} from 'react';
import { syncEngine } from './sync';
import { getQueueCounts } from './queue';
import type { SyncStats } from './types';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/hooks/useOrg';

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
  const countsTimer = useRef<ReturnType<typeof setInterval>>();

  const refreshCounts = useCallback(async () => {
    if (!user?.id) return;
    try {
      const c = await getQueueCounts(user.id);
      setCounts(c);
      setPendingConflictCount(syncEngine.getPendingConflicts().length);
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
    await refreshCounts();
  }, [refreshCounts]);

  return (
    <SyncContext.Provider value={{
      syncState, counts, lastSyncStats, pendingConflictCount,
      triggerSync, resolveConflict,
    }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used within <SyncProvider>');
  return ctx;
}
