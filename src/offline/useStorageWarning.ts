import { useEffect, useState } from 'react';

interface StorageEstimate {
  usedMB: number;
  quotaMB: number;
  percentUsed: number;
  isWarning: boolean;
  isCritical: boolean;
}

const WARNING_THRESHOLD = 80; // percent
const CRITICAL_THRESHOLD = 95; // percent

export function useStorageWarning(): StorageEstimate | null {
  const [estimate, setEstimate] = useState<StorageEstimate | null>(null);

  useEffect(() => {
    if (!navigator.storage?.estimate) return;

    const check = async () => {
      try {
        const { usage = 0, quota = 0 } = await navigator.storage.estimate();
        const usedMB = Math.round(usage / (1024 * 1024));
        const quotaMB = Math.round(quota / (1024 * 1024));
        const percentUsed = quota > 0 ? Math.round((usage / quota) * 100) : 0;

        setEstimate({
          usedMB,
          quotaMB,
          percentUsed,
          isWarning: percentUsed >= WARNING_THRESHOLD && percentUsed < CRITICAL_THRESHOLD,
          isCritical: percentUsed >= CRITICAL_THRESHOLD,
        });
      } catch {
        // Storage API not available
      }
    };

    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, []);

  return estimate;
}
