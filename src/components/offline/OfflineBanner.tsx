import { useState } from 'react';
import { WifiOff, X } from 'lucide-react';
import { useNetworkStatus } from '@/offline/useNetworkStatus';
import { cn } from '@/lib/utils';

export function OfflineBanner() {
  const { isOnline } = useNetworkStatus();
  const [dismissed, setDismissed] = useState(false);

  if (isOnline || dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'w-full bg-amber-500 text-white text-sm font-medium',
        'flex items-center justify-between px-4 py-2 z-50'
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
  );
}
