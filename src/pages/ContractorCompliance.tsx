import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend, AreaChart, Area,
} from "recharts";
import {
  ShieldCheck, ShieldAlert, AlertTriangle, Clock, HardHat,
  ChevronLeft, FileText, TrendingUp, Users, ArrowRight,
} from "lucide-react";
import { differenceInDays, format, addDays } from "date-fns";
import { TRADES, COMPLIANCE_DOC_LABELS } from "@/types/contractor";

interface ContractorRow {
  id: string;
  company_name: string;
  compliance_score: number | null;
  compliance_status: string | null;
  primary_trade: string;
  required_doc_types: string[];
}

interface ComplianceDoc {
  id: string;
  doc_type: string;
  expiry_date: string | null;
  status: string;
  contractor_company_id: string;
  is_current: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  compliant: "hsl(160, 84%, 39%)",
  expiring_soon: "hsl(38, 92%, 50%)",
  expired: "hsl(0, 84%, 60%)",
  incomplete: "hsl(215, 16%, 47%)",
};

const STATUS_LABELS: Record<string, string> = {
  compliant: "Compliant",
  expiring_soon: "Expiring Soon",
  expired: "Expired",
  incomplete: "Incomplete",
};

const ContractorCompliance = () => {
  const { organisation } = useSubscription();
  const [contractors, setContractors] = useState<ContractorRow[]>([]);
  const [docs, setDocs] = useState<ComplianceDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [tradeFilter, setTradeFilter] = useState("all");

  useEffect(() => {
    if (!organisation?.id) return;

    const fetch = async () => {
      const [cRes, dRes] = await Promise.all([
        supabase
          .from("contractor_companies")
          .select("id, company_name, compliance_score, compliance_status, primary_trade, required_doc_types")
          .eq("organisation_id", organisation.id)
          .eq("is_active", true),
        supabase
          .from("contractor_compliance_docs")
          .select("id, doc_type, expiry_date, status, contractor_company_id, is_current")
          .eq("organisation_id", organisation.id)
          .eq("is_current", true),
      ]);
      setContractors((cRes.data || []) as ContractorRow[]);
      setDocs((dRes.data || []) as ComplianceDoc[]);
      setLoading(false);
    };
    fetch();
  }, [organisation?.id]);

  const filtered = useMemo(
    () => tradeFilter === "all" ? contractors : contractors.filter((c) => c.primary_trade === tradeFilter),
    [contractors, tradeFilter]
  );

  // --- Chart data ---
  const pieData = useMemo(() => {
    const counts: Record<string, number> = { compliant: 0, expiring_soon: 0, expired: 0, incomplete: 0 };
    filtered.forEach((c) => {
      const s = c.compliance_status || "incomplete";
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ name: STATUS_LABELS[k] || k, value: v, fill: STATUS_COLORS[k] || "#888" }));
  }, [filtered]);

  const tradeBarData = useMemo(() => {
    const map: Record<string, { trade: string; avg: number; count: number; sum: number }> = {};
    filtered.forEach((c) => {
      const label = TRADES.find((t) => t.value === c.primary_trade)?.label || c.primary_trade;
      if (!map[label]) map[label] = { trade: label, avg: 0, count: 0, sum: 0 };
      map[label].sum += c.compliance_score || 0;
      map[label].count += 1;
    });
    return Object.values(map)
      .map((d) => ({ ...d, avg: d.count > 0 ? Math.round(d.sum / d.count) : 0 }))
      .sort((a, b) => a.avg - b.avg);
  }, [filtered]);

  const expiryTimeline = useMemo(() => {
    const today = new Date();
    const buckets = [
      { label: "Expired", min: -Infinity, max: 0, count: 0 },
      { label: "0-7 days", min: 0, max: 7, count: 0 },
      { label: "8-14 days", min: 8, max: 14, count: 0 },
      { label: "15-30 days", min: 15, max: 30, count: 0 },
      { label: "31-60 days", min: 31, max: 60, count: 0 },
      { label: "60+ days", min: 61, max: Infinity, count: 0 },
    ];
    const filteredIds = new Set(filtered.map((c) => c.id));
    docs
      .filter((d) => d.expiry_date && filteredIds.has(d.contractor_company_id))
      .forEach((d) => {
        const days = differenceInDays(new Date(d.expiry_date!), today);
        const bucket = buckets.find((b) => days >= b.min && days <= b.max);
        if (bucket) bucket.count += 1;
      });
    return buckets;
  }, [docs, filtered]);

  // At-risk contractors (expired/expiring_soon sorted by score)
  const atRiskContractors = useMemo(
    () =>
      filtered
        .filter((c) => c.compliance_status === "expired" || c.compliance_status === "expiring_soon")
        .sort((a, b) => (a.compliance_score || 0) - (b.compliance_score || 0))
        .slice(0, 8),
    [filtered]
  );

  // Upcoming expiring docs with contractor name
  const upcomingExpiries = useMemo(() => {
    const today = new Date();
    const filteredIds = new Set(filtered.map((c) => c.id));
    const contractorMap = Object.fromEntries(filtered.map((c) => [c.id, c.company_name]));
    return docs
      .filter(
        (d) =>
          d.expiry_date &&
          filteredIds.has(d.contractor_company_id) &&
          differenceInDays(new Date(d.expiry_date), today) <= 60
      )
      .map((d) => ({
        ...d,
        contractor_name: contractorMap[d.contractor_company_id] || "Unknown",
        days_left: differenceInDays(new Date(d.expiry_date!), today),
      }))
      .sort((a, b) => a.days_left - b.days_left)
      .slice(0, 10);
  }, [docs, filtered]);

  const avgScore = filtered.length > 0
    ? Math.round(filtered.reduce((s, c) => s + (c.compliance_score || 0), 0) / filtered.length)
    : 0;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/contractors">
                <ChevronLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Compliance Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Cross-contractor compliance overview &middot; {filtered.length} contractor{filtered.length !== 1 && "s"}
              </p>
            </div>
          </div>
          <Select value={tradeFilter} onValueChange={setTradeFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Trades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Trades</SelectItem>
              {TRADES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: "Average Score", value: `${avgScore}%`, icon: TrendingUp, color: "text-primary" },
            { label: "Compliant", value: filtered.filter((c) => c.compliance_status === "compliant").length, icon: ShieldCheck, color: "text-success" },
            { label: "Expiring Soon", value: filtered.filter((c) => c.compliance_status === "expiring_soon").length, icon: Clock, color: "text-warning" },
            { label: "Expired", value: filtered.filter((c) => c.compliance_status === "expired").length, icon: ShieldAlert, color: "text-destructive" },
            { label: "Incomplete", value: filtered.filter((c) => !c.compliance_status || c.compliance_status === "incomplete").length, icon: AlertTriangle, color: "text-muted-foreground" },
          ].map((kpi, i) => (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Status pie */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} stroke="none" />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-12">No data</p>
              )}
            </CardContent>
          </Card>

          {/* Score by trade bar chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Score by Trade</CardTitle>
            </CardHeader>
            <CardContent>
              {tradeBarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={tradeBarData} layout="vertical" margin={{ left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="trade" width={100} tick={{ fontSize: 11 }} />
                    <RechartsTooltip formatter={(v: number) => `${v}%`} />
                    <Bar dataKey="avg" fill="hsl(174, 78%, 26%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-12">No data</p>
              )}
            </CardContent>
          </Card>

          {/* Expiry timeline area */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Document Expiry Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={expiryTimeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <RechartsTooltip />
                  <Bar
                    dataKey="count"
                    fill="hsl(25, 95%, 53%)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Bottom section: at-risk + upcoming expiries */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* At-risk contractors */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldAlert className="h-4 w-4 text-destructive" />
                At-Risk Contractors
              </CardTitle>
            </CardHeader>
            <CardContent>
              {atRiskContractors.length > 0 ? (
                <div className="space-y-2">
                  {atRiskContractors.map((c) => (
                    <Link
                      key={c.id}
                      to={`/contractors/${c.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                          <HardHat className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{c.company_name}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {TRADES.find((t) => t.value === c.primary_trade)?.label || c.primary_trade}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-20">
                          <Progress value={c.compliance_score || 0} className="h-1.5" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground w-8 text-right">
                          {c.compliance_score || 0}%
                        </span>
                        <Badge
                          className={`text-xs ${
                            c.compliance_status === "expired"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-warning/10 text-warning"
                          }`}
                        >
                          {c.compliance_status === "expired" ? "Expired" : "Expiring"}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ShieldCheck className="h-8 w-8 text-success mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">All contractors are compliant</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming document expiries */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-warning" />
                Upcoming Document Expiries
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingExpiries.length > 0 ? (
                <div className="space-y-2">
                  {upcomingExpiries.map((d) => (
                    <Link
                      key={d.id}
                      to={`/contractors/${d.contractor_company_id}`}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{d.contractor_name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {(COMPLIANCE_DOC_LABELS as any)[d.doc_type]?.label || d.doc_type.replace(/_/g, " ")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {d.expiry_date && (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(d.expiry_date), "dd MMM yyyy")}
                          </span>
                        )}
                        <Badge
                          className={`text-xs ${
                            d.days_left <= 0
                              ? "bg-destructive/10 text-destructive"
                              : d.days_left <= 7
                              ? "bg-destructive/10 text-destructive"
                              : d.days_left <= 30
                              ? "bg-warning/10 text-warning"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {d.days_left <= 0 ? "Expired" : `${d.days_left}d`}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ShieldCheck className="h-8 w-8 text-success mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No documents expiring within 60 days</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ContractorCompliance;
