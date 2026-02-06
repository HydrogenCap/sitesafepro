import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { format, subDays, eachDayOfInterval, startOfDay } from "date-fns";

interface SiteVisitsChartProps {
  dateRange: string;
}

interface ChartData {
  date: string;
  visits: number;
  checkouts: number;
}

export default function SiteVisitsChart({ dateRange }: SiteVisitsChartProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ChartData[]>([]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, dateRange]);

  const fetchData = async () => {
    try {
      const daysAgo = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
      const startDate = subDays(new Date(), daysAgo);

      // Get organisation ID
      const { data: memberData } = await supabase
        .from("organisation_members")
        .select("organisation_id")
        .eq("profile_id", user?.id)
        .eq("status", "active")
        .maybeSingle();

      if (!memberData) return;

      // Fetch visits
      const { data: visits, error } = await supabase
        .from("site_visits")
        .select("checked_in_at, checked_out_at")
        .eq("organisation_id", memberData.organisation_id)
        .gte("checked_in_at", startDate.toISOString());

      if (error) throw error;

      // Generate date range
      const days = eachDayOfInterval({
        start: startDate,
        end: new Date(),
      });

      // Aggregate data by day
      const chartData: ChartData[] = days.map((day) => {
        const dayStart = startOfDay(day);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const dayVisits = visits?.filter((v) => {
          const checkinDate = new Date(v.checked_in_at);
          return checkinDate >= dayStart && checkinDate < dayEnd;
        }).length || 0;

        const dayCheckouts = visits?.filter((v) => {
          if (!v.checked_out_at) return false;
          const checkoutDate = new Date(v.checked_out_at);
          return checkoutDate >= dayStart && checkoutDate < dayEnd;
        }).length || 0;

        return {
          date: format(day, dateRange === "7d" ? "EEE" : "MMM d"),
          visits: dayVisits,
          checkouts: dayCheckouts,
        };
      });

      setData(chartData);
    } catch (error) {
      console.error("Error fetching visits data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Site Visits Over Time</CardTitle>
        <CardDescription>
          Check-ins and check-outs across all your sites
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                className="text-xs fill-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                className="text-xs fill-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))", 
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Area
                type="monotone"
                dataKey="visits"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorVisits)"
                name="Check-ins"
              />
              <Area
                type="monotone"
                dataKey="checkouts"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={2}
                strokeDasharray="5 5"
                fill="transparent"
                name="Check-outs"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
