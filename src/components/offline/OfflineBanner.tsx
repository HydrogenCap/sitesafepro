import { useState } from 'react';
import { WifiOff, HardDrive, X } from 'lucide-react';
import { useNetworkStatus } from '@/offline/useNetworkStatus';
import { useStorageWarning } from '@/offline/useStorageWarning';
import { cn } from '@/lib/utils';

export function OfflineBanner() {
  const { isOnline } = useNetworkStatus();
  const storage = useStorageWarning();
  const [dismissed, setDismissed] = useState(false);
  const [storageDismissed, setStorageDismissed] = useState(false);

  const showOffline = !isOnline && !dismissed;
  const showStorage = storage && (storage.isWarning || storage.isCritical) && !storageDismissed;

  if (!showOffline && !showStorage) return null;

  return (
    <div className="w-full z-50 space-y-0">
      {showOffline && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            'w-full bg-warning text-warning-foreground text-sm font-medium',
            'flex items-center justify-between px-4 py-2'
          )}
        >
          <span className="flex items-center gap-2">
            <WifiOff className="h-4 w-4 flex-shrink-0" />
            You're offline — captures saved locally
          </span>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss offline notice"
            className="ml-4 hover:opacity-70 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {showStorage && (
        <div
          role="alert"
          className={cn(
            'w-full text-sm font-medium flex items-center justify-between px-4 py-2',
            storage.isCritical
              ? 'bg-destructive text-destructive-foreground'
              : 'bg-warning text-warning-foreground'
          )}
        >
          <span className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 flex-shrink-0" />
            {storage.isCritical
              ? `Storage nearly full (${storage.percentUsed}% used — ${storage.usedMB}MB / ${storage.quotaMB}MB). Sync items now to free space.`
              : `Storage at ${storage.percentUsed}% (${storage.usedMB}MB / ${storage.quotaMB}MB). Consider syncing soon.`
            }
          </span>
          <button
            onClick={() => setStorageDismissed(true)}
            aria-label="Dismiss storage warning"
            className="ml-4 hover:opacity-70 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
