import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, RotateCcw, Trash2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QueueStatusChip } from '@/components/offline/QueueStatusChip';
import { ConflictDialog } from '@/components/offline/ConflictDialog';
import { useSync } from '@/offline/SyncContext';
import { getAllQueueItems } from '@/offline/db';
import { requeueItem, discardItem } from '@/offline/queue';
import { useAuth } from '@/contexts/AuthContext';
import { useNetworkStatus } from '@/offline/useNetworkStatus';
import type { QueueItem } from '@/offline/types';
import { cn } from '@/lib/utils';

const STATUS_ORDER: QueueItem['status'][] = ['syncing', 'failed', 'queued', 'synced'];

const STATUS_LABELS: Record<QueueItem['status'], string> = {
  queued: '⏳ Queued',
  syncing: '⟳ Syncing',
  failed: '✗ Failed',
  synced: '✓ Synced',
};

export default function QueueManager() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isOnline } = useNetworkStatus();
  const { triggerSync, syncState, counts, resolveConflict } = useSync();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [filter, setFilter] = useState<QueueItem['status'] | 'all'>('all');
  const [conflictItem, setConflictItem] = useState<QueueItem | null>(null);

  const loadItems = async () => {
    if (!user?.id) return;
    const all = await getAllQueueItems(user.id);
    setItems(all.sort((a, b) => b.captured_at - a.captured_at));
  };

  useEffect(() => { loadItems(); }, [user?.id, syncState]);

  const handleRetry = async (item: QueueItem) => {
    await requeueItem(user!.id, item);
    triggerSync();
    loadItems();
  };

  const [discardTarget, setDiscardTarget] = useState<QueueItem | null>(null);

  const handleDiscard = async (item: QueueItem) => {
    await discardItem(user!.id, item.id);
    setDiscardTarget(null);
    loadItems();
  };

  const filtered = filter === 'all' ? items : items.filter(i => i.status === filter);

  const grouped = STATUS_ORDER.reduce((acc, status) => {
    const group = filtered.filter(i => i.status === status);
    if (group.length > 0) acc.set(status, group);
    return acc;
  }, new Map<QueueItem['status'], QueueItem[]>());

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </button>
        <h1 className="font-bold flex-1">Upload Queue</h1>
        <Button size="sm" variant="outline" onClick={() => triggerSync()}
          disabled={syncState === 'syncing' || !isOnline}>
          <RefreshCw className={cn('h-4 w-4 mr-1', syncState === 'syncing' && 'animate-spin')} />
          Sync All
        </Button>
      </header>

      <div className="px-4 py-4 space-y-5 max-w-lg mx-auto">
        <QueueStatusChip counts={counts} />

        <div className="flex gap-1 flex-wrap">
          {(['all', ...STATUS_ORDER] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-full border transition-colors',
                filter === s
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-primary/50'
              )}
            >
              {s === 'all' ? `All (${items.length})` : STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {Array.from(grouped.entries()).map(([status, group]) => (
          <section key={status}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              {STATUS_LABELS[status]} ({group.length})
            </h3>
            <div className="space-y-2">
              {group.map(item => (
                <div key={item.id} className="border rounded-lg p-3 bg-card space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium capitalize">
                        {item.type.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.captured_at).toLocaleString('en-GB')}
                        {item.captured_offline && ' · Captured offline'}
                      </p>
                      {item.error_message && (
                        <p className="text-xs text-destructive mt-1 font-mono">
                          {item.error_message}
                        </p>
                      )}
                    </div>
                    {item.status === 'failed' && (
                      <div className="flex gap-1.5 flex-shrink-0">
                        {item.error_message?.includes('Conflict') ? (
                          <Button size="sm" variant="outline"
                            onClick={() => setConflictItem(item)}
                            className="text-xs h-7">
                            Resolve
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline"
                            onClick={() => handleRetry(item)}
                            className="text-xs h-7">
                            <RotateCcw className="h-3 w-3 mr-1" /> Retry
                          </Button>
                        )}
                        <Button size="sm" variant="ghost"
                          onClick={() => setDiscardTarget(item)}
                          className="text-xs h-7 text-destructive hover:text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        {items.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-12">
            No items in queue
          </p>
        )}
      </div>

      {conflictItem && (
        <ConflictDialog
          item={conflictItem}
          onResolve={async (resolution) => {
            await resolveConflict(conflictItem.id, resolution);
            setConflictItem(null);
            loadItems();
          }}
          onClose={() => setConflictItem(null)}
        />
      )}

      <ConfirmDialog
        open={!!discardTarget}
        onOpenChange={(open) => { if (!open) setDiscardTarget(null); }}
        title="Discard this capture?"
        description="This captured item will be permanently removed from the queue. This cannot be undone."
        confirmLabel="Discard"
        variant="destructive"
        onConfirm={() => {
          if (discardTarget) handleDiscard(discardTarget);
        }}
      />
    </div>
  );
}
