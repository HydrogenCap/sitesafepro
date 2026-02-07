import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { startOfMonth, format, isBefore, startOfToday } from "date-fns";

interface Action {
  id: string;
  title: string;
  priority: "critical" | "high" | "medium" | "low";
  status: string;
  source: string;
  due_date: string;
  project_id: string;
  closed_at: string | null;
  created_at: string;
  projects?: { name: string };
}

interface ActionsReportChartsProps {
  actions: Action[];
}

const PRIORITY_COLORS = {
  critical: "#EF4444",
  high: "#F97316",
  medium: "#F59E0B",
  low: "#6B7280",
};

const SOURCE_COLORS = [
  "#0F766E",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#F97316",
  "#6366F1",
  "#84CC16",
];

export function ActionsReportCharts({ actions }: ActionsReportChartsProps) {
  const today = startOfToday();

  // Actions by priority
  const priorityData = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    actions.forEach((a) => {
      counts[a.priority]++;
    });
    return [
      { name: "Critical", value: counts.critical, color: PRIORITY_COLORS.critical },
      { name: "High", value: counts.high, color: PRIORITY_COLORS.high },
      { name: "Medium", value: counts.medium, color: PRIORITY_COLORS.medium },
      { name: "Low", value: counts.low, color: PRIORITY_COLORS.low },
    ].filter((d) => d.value > 0);
  }, [actions]);

  // Actions by source
  const sourceData = useMemo(() => {
    const sourceCounts: Record<string, number> = {};
    actions.forEach((a) => {
      const source = a.source.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });
    return Object.entries(sourceCounts)
      .map(([name, value], index) => ({
        name,
        value,
        color: SOURCE_COLORS[index % SOURCE_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [actions]);

  // Actions by project
  const projectData = useMemo(() => {
    const projectCounts: Record<string, { open: number; closed: number }> = {};
    actions.forEach((a) => {
      const projectName = a.projects?.name || "Unknown";
      if (!projectCounts[projectName]) {
        projectCounts[projectName] = { open: 0, closed: 0 };
      }
      if (a.status === "closed") {
        projectCounts[projectName].closed++;
      } else {
        projectCounts[projectName].open++;
      }
    });
    return Object.entries(projectCounts)
      .map(([name, counts]) => ({
        name: name.length > 15 ? name.slice(0, 15) + "..." : name,
        open: counts.open,
        closed: counts.closed,
      }))
      .sort((a, b) => b.open + b.closed - (a.open + a.closed))
      .slice(0, 8);
  }, [actions]);

  // Monthly trend
  const monthlyData = useMemo(() => {
    const months: Record<string, { raised: number; closed: number }> = {};
    
    // Get last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = format(startOfMonth(date), "MMM yy");
      months[monthKey] = { raised: 0, closed: 0 };
    }

    actions.forEach((a) => {
      const createdMonth = format(startOfMonth(new Date(a.created_at)), "MMM yy");
      if (months[createdMonth] !== undefined) {
        months[createdMonth].raised++;
      }
      if (a.closed_at) {
        const closedMonth = format(startOfMonth(new Date(a.closed_at)), "MMM yy");
        if (months[closedMonth] !== undefined) {
          months[closedMonth].closed++;
        }
      }
    });

    return Object.entries(months).map(([month, data]) => ({
      month,
      raised: data.raised,
      closed: data.closed,
    }));
  }, [actions]);

  // Summary stats
  const stats = useMemo(() => {
    const total = actions.length;
    const closed = actions.filter((a) => a.status === "closed").length;
    const open = actions.filter((a) => a.status !== "closed").length;
    const overdue = actions.filter(
      (a) =>
        a.status !== "closed" &&
        a.status !== "awaiting_verification" &&
        isBefore(new Date(a.due_date), today)
    ).length;

    // Average time to close (in days)
    const closedActions = actions.filter((a) => a.status === "closed" && a.closed_at);
    const avgCloseTime =
      closedActions.length > 0
        ? Math.round(
            closedActions.reduce((sum, a) => {
              const created = new Date(a.created_at);
              const closed = new Date(a.closed_at!);
              return sum + (closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
            }, 0) / closedActions.length
          )
        : 0;

    const closureRate = total > 0 ? Math.round((closed / total) * 100) : 0;

    return { total, closed, open, overdue, avgCloseTime, closureRate };
  }, [actions, today]);

  if (actions.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center">
        <p className="text-muted-foreground">
          No actions data available for reporting. Raise some corrective actions to see analytics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
      >
        <div className="bg-card rounded-xl p-4 border border-border">
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          <p className="text-sm text-muted-foreground">Total Actions</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <p className="text-2xl font-bold text-foreground">{stats.open}</p>
          <p className="text-sm text-muted-foreground">Open</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <p className="text-2xl font-bold text-success">{stats.closed}</p>
          <p className="text-sm text-muted-foreground">Closed</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <p className={`text-2xl font-bold ${stats.overdue > 0 ? "text-destructive" : "text-foreground"}`}>
            {stats.overdue}
          </p>
          <p className="text-sm text-muted-foreground">Overdue</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <p className="text-2xl font-bold text-foreground">{stats.avgCloseTime}d</p>
          <p className="text-sm text-muted-foreground">Avg Close Time</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <p className="text-2xl font-bold text-primary">{stats.closureRate}%</p>
          <p className="text-sm text-muted-foreground">Closure Rate</p>
        </div>
      </motion.div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Actions by Priority */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-xl p-6 border border-border"
        >
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Actions by Priority
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Actions by Source */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-xl p-6 border border-border"
        >
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Actions by Source
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {sourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Monthly Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-xl p-6 border border-border"
        >
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Actions Over Time
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="raised" name="Raised" fill="#F97316" radius={[4, 4, 0, 0]} />
                <Bar dataKey="closed" name="Closed" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Actions by Project */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card rounded-xl p-6 border border-border"
        >
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Actions by Project
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="open" name="Open" stackId="a" fill="#F97316" />
                <Bar dataKey="closed" name="Closed" stackId="a" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
