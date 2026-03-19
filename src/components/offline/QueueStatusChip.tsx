import { CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  counts: { queued: number; syncing: number; failed: number; synced: number };
  compact?: boolean;
}

export function QueueStatusChip({ counts, compact = false }: Props) {
  const total = counts.queued + counts.syncing + counts.failed;

  if (total === 0 && counts.synced === 0) {
    return (
      <p className={cn('text-muted-foreground', compact ? 'text-xs' : 'text-sm')}>
        Nothing queued
      </p>
    );
  }

  return (
    <div className={cn('flex flex-wrap gap-2', compact ? 'text-xs' : 'text-sm')}>
      {counts.synced > 0 && (
        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full font-medium">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {counts.synced} synced
        </span>
      )}
      {counts.queued > 0 && (
        <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-1 rounded-full font-medium">
          <Clock className="h-3.5 w-3.5" />
          {counts.queued} queued
        </span>
      )}
      {counts.syncing > 0 && (
        <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-1 rounded-full font-medium">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {counts.syncing} syncing
        </span>
      )}
      {counts.failed > 0 && (
        <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-1 rounded-full font-medium">
          <AlertCircle className="h-3.5 w-3.5" />
          {counts.failed} failed
        </span>
      )}
    </div>
  );
}
