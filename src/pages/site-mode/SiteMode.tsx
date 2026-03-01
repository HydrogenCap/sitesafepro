import { Link } from 'react-router-dom';
import { Camera, FileText, AlertTriangle, CheckSquare, PenLine, RefreshCw, ArrowLeft, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QueueStatusChip } from '@/components/offline/QueueStatusChip';
import { OfflineBanner } from '@/components/offline/OfflineBanner';
import { useSync } from '@/offline/SyncContext';
import { useNetworkStatus } from '@/offline/useNetworkStatus';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';

const CAPTURE_ACTIONS = [
  { to: 'incident', icon: ShieldAlert, label: 'Incident', color: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' },
  { to: 'photo', icon: Camera, label: 'Photo', color: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
  { to: 'note', icon: FileText, label: 'Note', color: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  { to: 'hazard', icon: AlertTriangle, label: 'Hazard', color: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300' },
  { to: 'action', icon: CheckSquare, label: 'Action', color: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' },
  { to: 'signature', icon: PenLine, label: 'Signature', color: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300' },
] as const;

export default function SiteMode() {
  const { triggerSync, syncState, counts } = useSync();
  const { isOnline } = useNetworkStatus();
  const isSyncing = syncState === 'syncing';

  return (
    <DashboardLayout>
      <OfflineBanner />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Site Mode</h1>
              <p className="text-sm text-muted-foreground">Capture offline · Sync when ready</p>
            </div>
          </div>
          <Button
            size="sm" variant="outline"
            onClick={() => triggerSync()}
            disabled={isSyncing || !isOnline}
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing…' : 'Sync Now'}
          </Button>
        </div>

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Capture
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {CAPTURE_ACTIONS.map(({ to, icon: Icon, label, color }) => (
              <Link
                key={to}
                to={`/site-mode/${to}`}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl p-4 ${color} hover:opacity-80 transition-opacity`}
              >
                <Icon className="h-7 w-7" />
                <span className="text-xs font-semibold">{label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* I3: Persistent failed sync alert */}
        {counts.failed > 0 && (
          <section className="rounded-xl border border-destructive bg-destructive/10 p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-destructive">
                  {counts.failed} item{counts.failed > 1 ? 's' : ''} need{counts.failed === 1 ? 's' : ''} your attention
                </p>
                <p className="text-xs text-muted-foreground">
                  These captures failed to sync and may need to be retried or resolved.
                </p>
              </div>
              <Link to="/site-mode/queue" className="text-xs text-primary font-semibold whitespace-nowrap">
                Review →
              </Link>
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Queue
            </h2>
            <Link to="/site-mode/queue" className="text-xs text-primary font-medium">View all →</Link>
          </div>
          <QueueStatusChip counts={counts} />
        </section>
      </div>
    </DashboardLayout>
  );
}
