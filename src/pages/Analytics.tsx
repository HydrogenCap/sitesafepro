import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  FileText, 
  FolderOpen,
  Calendar,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Loader2
} from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import SiteVisitsChart from "@/components/analytics/SiteVisitsChart";
import DocumentsChart from "@/components/analytics/DocumentsChart";
import ActivityChart from "@/components/analytics/ActivityChart";
import ComplianceOverview from "@/components/analytics/ComplianceOverview";

interface Stats {
  totalProjects: number;
  activeProjects: number;
  totalDocuments: number;
  pendingDocuments: number;
  totalVisits: number;
  currentlyOnSite: number;
  teamMembers: number;
}

export default function Analytics() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("7d");
  const [stats, setStats] = useState<Stats>({
    totalProjects: 0,
    activeProjects: 0,
    totalDocuments: 0,
    pendingDocuments: 0,
    totalVisits: 0,
    currentlyOnSite: 0,
    teamMembers: 0,
  });
  const [previousStats, setPreviousStats] = useState<Stats>({
    totalProjects: 0,
    activeProjects: 0,
    totalDocuments: 0,
    pendingDocuments: 0,
    totalVisits: 0,
    currentlyOnSite: 0,
    teamMembers: 0,
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchStats();
  }, [user, navigate, dateRange]);

  const fetchStats = async () => {
    try {
      const daysAgo = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
      const startDate = subDays(new Date(), daysAgo);
      const previousStartDate = subDays(startDate, daysAgo);

      // Get organisation ID
      const { data: memberData } = await supabase
        .from("organisation_members")
        .select("organisation_id")
        .eq("profile_id", user?.id)
        .eq("status", "active")
        .single();

      if (!memberData) return;
      const orgId = memberData.organisation_id;

      // Fetch current period stats
      const [
        { count: totalProjects },
        { count: activeProjects },
        { count: totalDocuments },
        { count: pendingDocuments },
        { count: totalVisits },
        { count: currentlyOnSite },
        { count: teamMembers },
      ] = await Promise.all([
        supabase.from("projects").select("*", { count: "exact", head: true }).eq("organisation_id", orgId),
        supabase.from("projects").select("*", { count: "exact", head: true }).eq("organisation_id", orgId).eq("status", "active"),
        supabase.from("documents").select("*", { count: "exact", head: true }).eq("organisation_id", orgId),
        supabase.from("documents").select("*", { count: "exact", head: true }).eq("organisation_id", orgId).eq("status", "pending"),
        supabase.from("site_visits").select("*", { count: "exact", head: true }).eq("organisation_id", orgId).gte("checked_in_at", startDate.toISOString()),
        supabase.from("site_visits").select("*", { count: "exact", head: true }).eq("organisation_id", orgId).is("checked_out_at", null),
        supabase.from("organisation_members").select("*", { count: "exact", head: true }).eq("organisation_id", orgId).eq("status", "active"),
      ]);

      // Fetch previous period visits for comparison
      const { count: previousVisits } = await supabase
        .from("site_visits")
        .select("*", { count: "exact", head: true })
        .eq("organisation_id", orgId)
        .gte("checked_in_at", previousStartDate.toISOString())
        .lt("checked_in_at", startDate.toISOString());

      setStats({
        totalProjects: totalProjects || 0,
        activeProjects: activeProjects || 0,
        totalDocuments: totalDocuments || 0,
        pendingDocuments: pendingDocuments || 0,
        totalVisits: totalVisits || 0,
        currentlyOnSite: currentlyOnSite || 0,
        teamMembers: teamMembers || 0,
      });

      setPreviousStats({
        ...previousStats,
        totalVisits: previousVisits || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const visitChange = calculateChange(stats.totalVisits, previousStats.totalVisits);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground">
              Insights and metrics across your organisation
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Site Visits
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalVisits}</div>
              <div className="flex items-center text-xs mt-1">
                {visitChange >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-destructive" />
                )}
                <span className={visitChange >= 0 ? "text-emerald-500" : "text-destructive"}>
                  {Math.abs(visitChange)}%
                </span>
                <span className="text-muted-foreground ml-1">vs previous period</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Currently On Site
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.currentlyOnSite}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Active visitors right now
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Documents
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDocuments}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.pendingDocuments} pending approval
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Projects
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeProjects}</div>
              <p className="text-xs text-muted-foreground mt-1">
                of {stats.totalProjects} total projects
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Tabs */}
        <Tabs defaultValue="visits" className="space-y-4">
          <TabsList>
            <TabsTrigger value="visits">Site Visits</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
          </TabsList>

          <TabsContent value="visits">
            <SiteVisitsChart dateRange={dateRange} />
          </TabsContent>

          <TabsContent value="documents">
            <DocumentsChart dateRange={dateRange} />
          </TabsContent>

          <TabsContent value="activity">
            <ActivityChart dateRange={dateRange} />
          </TabsContent>

          <TabsContent value="compliance">
            <ComplianceOverview />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
