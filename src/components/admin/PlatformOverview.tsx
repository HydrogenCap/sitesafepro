import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, Building2, CheckCircle, Clock, XCircle,
  CreditCard, TrendingUp, AlertCircle, Ban, Zap, AlertTriangle, ShieldAlert,
} from "lucide-react";
import type { PlatformStats } from "@/types/admin";

function StatCard({ icon, label, value, sub, color, alert }: {
  icon: React.ReactNode; label: string; value: number | string;
  sub?: string; color: string; alert?: boolean;
}) {
  return (
    <Card className={alert ? "border-destructive/40" : ""}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-0.5 tabular-nums">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg flex-shrink-0 ${color}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function HealthBadge({ score }: { score: number }) {
  const color = score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-amber-500" : "bg-red-500";
  const textColor = score >= 70 ? "text-emerald-700" : score >= 40 ? "text-amber-700" : "text-red-700";
  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      <div className="flex-1 max-w-[52px] bg-muted rounded-full h-1.5 overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-semibold tabular-nums ${textColor}`}>{score}</span>
    </div>
  );
}

interface PlatformOverviewProps {
  stats: PlatformStats;
  riddorCount: number;
}

export function PlatformOverview({ stats, riddorCount }: PlatformOverviewProps) {
  return (
    <>
      {/* Stats — Users */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={<Building2 className="h-4 w-4 text-primary" />} label="Organisations" value={stats.totalOrgs} color="bg-primary/10" />
        <StatCard icon={<Users className="h-4 w-4 text-blue-600" />} label="Total Users" value={stats.totalUsers} color="bg-blue-500/10" />
        <StatCard icon={<CheckCircle className="h-4 w-4 text-emerald-600" />} label="Active Users" value={stats.activeUsers} color="bg-emerald-500/10" />
        <StatCard icon={<Clock className="h-4 w-4 text-amber-600" />} label="Pending Invites" value={stats.pendingInvites} color="bg-amber-500/10" />
        <StatCard icon={<XCircle className="h-4 w-4 text-destructive" />} label="Deactivated" value={stats.deactivatedUsers} color="bg-destructive/10" />
      </div>

      {/* Stats — Revenue */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={<TrendingUp className="h-4 w-4 text-emerald-600" />} label="Est. MRR" value={`£${stats.mrr.toLocaleString()}`} sub="active + past_due" color="bg-emerald-500/10" />
        <StatCard icon={<CreditCard className="h-4 w-4 text-blue-600" />} label="Active Subs" value={stats.activeSubscriptions} color="bg-blue-500/10" />
        <StatCard icon={<Zap className="h-4 w-4 text-amber-600" />} label="On Trial" value={stats.trialing} color="bg-amber-500/10" />
        <StatCard icon={<AlertCircle className="h-4 w-4 text-red-600" />} label="Past Due" value={stats.pastDue} color="bg-red-500/10" alert={stats.pastDue > 0} />
        <StatCard icon={<Ban className="h-4 w-4 text-muted-foreground" />} label="Cancelled" value={stats.cancelled} color="bg-muted" />
      </div>

      {/* Alert banners */}
      {stats.pastDue > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-800">
          <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400">
            <strong>{stats.pastDue} organisation{stats.pastDue !== 1 ? "s" : ""}</strong> have past-due subscriptions. Check Stripe.
          </p>
        </div>
      )}
      {riddorCount > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
          <ShieldAlert className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400">
            <strong>{riddorCount} open RIDDOR-reportable incident{riddorCount !== 1 ? "s" : ""}</strong> across the platform.
          </p>
        </div>
      )}
    </>
  );
}
