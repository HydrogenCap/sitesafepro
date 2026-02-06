import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, subDays, eachDayOfInterval, startOfDay } from "date-fns";

interface ActivityChartProps {
  dateRange: string;
}

interface ChartData {
  date: string;
  documents: number;
  visits: number;
  team: number;
}

export default function ActivityChart({ dateRange }: ActivityChartProps) {
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
        .single();

      if (!memberData) return;

      // Fetch activity logs
      const { data: activities, error } = await supabase
        .from("activity_logs")
        .select("activity_type, created_at")
        .eq("organisation_id", memberData.organisation_id)
        .gte("created_at", startDate.toISOString());

      if (error) throw error;

      // Generate date range
      const days = eachDayOfInterval({
        start: startDate,
        end: new Date(),
      });

      // Aggregate data by day and type
      const chartData: ChartData[] = days.map((day) => {
        const dayStart = startOfDay(day);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const dayActivities = activities?.filter((a) => {
          const actDate = new Date(a.created_at);
          return actDate >= dayStart && actDate < dayEnd;
        }) || [];

        const documents = dayActivities.filter((a) => 
          a.activity_type.startsWith("document_")
        ).length;

        const visits = dayActivities.filter((a) => 
          a.activity_type.startsWith("site_visit_")
        ).length;

        const team = dayActivities.filter((a) => 
          a.activity_type.startsWith("member_")
        ).length;

        return {
          date: format(day, dateRange === "7d" ? "EEE" : "MMM d"),
          documents,
          visits,
          team,
        };
      });

      setData(chartData);
    } catch (error) {
      console.error("Error fetching activity data:", error);
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
        <CardTitle>Activity by Type</CardTitle>
        <CardDescription>
          Breakdown of activity across different categories
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
              <Legend />
              <Bar 
                dataKey="documents" 
                name="Documents" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="visits" 
                name="Site Visits" 
                fill="hsl(142, 71%, 45%)" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="team" 
                name="Team" 
                fill="hsl(262, 83%, 58%)" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
