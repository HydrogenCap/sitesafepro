import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import type { QueueItem } from '@/offline/types';

interface Props {
  item: QueueItem;
  onResolve: (resolution: 'keep_mine' | 'keep_server' | 'skip') => Promise<void>;
  onClose: () => void;
}

export function ConflictDialog({ item, onResolve, onClose }: Props) {
  return (
    <AlertDialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            ⚠️ Sync Conflict
          </AlertDialogTitle>
          <AlertDialogDescription>
            This document was edited by another user while you were offline.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-2">
          <div className="rounded-lg border bg-muted/50 p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Your Capture
            </p>
            <p className="text-sm capitalize">{item.type.replace(/_/g, ' ')}</p>
            <p className="text-xs text-muted-foreground">
              Captured {new Date(item.captured_at).toLocaleString('en-GB')}
              {item.captured_offline && ' · Offline'}
            </p>
          </div>
        </div>

        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            className="w-full"
            onClick={() => onResolve('keep_mine')}
          >
            Keep Mine — Overwrite Server
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onResolve('keep_server')}
          >
            Keep Server — Discard Mine
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => onResolve('skip')}
          >
            Skip — Sync Later
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
