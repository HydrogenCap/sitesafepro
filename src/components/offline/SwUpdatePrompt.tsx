import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export function SwUpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r && 'sync' in (r as any)) {
        (r as any).sync?.register('ssp-queue-sync').catch(() => {});
      }
    },
    onRegisterError(err) {
      console.warn('[SW] Registration failed:', err);
    },
  });

  if (!needRefresh) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50
        bg-primary text-primary-foreground rounded-lg shadow-lg
        flex items-center gap-3 px-4 py-2.5 text-sm font-medium
        animate-in slide-in-from-bottom-4"
    >
      <span>App update available</span>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => updateServiceWorker(true)}
        className="h-7 text-xs"
      >
        <RefreshCw className="h-3.5 w-3.5 mr-1" />
        Reload
      </Button>
    </div>
  );
}
