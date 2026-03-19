import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

interface DocumentsChartProps {
  dateRange: string;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface StatusData {
  status: string;
  count: number;
}

const categoryLabels: Record<string, string> = {
  rams: "RAMS",
  method_statement: "Method Statement",
  safety_plan: "Safety Plan",
  coshh: "COSHH",
  induction: "Induction",
  permit: "Permit",
  inspection: "Inspection",
  certificate: "Certificate",
  insurance: "Insurance",
  other: "Other",
};

const categoryColors: Record<string, string> = {
  rams: "hsl(var(--primary))",
  method_statement: "hsl(221, 83%, 53%)",
  safety_plan: "hsl(142, 71%, 45%)",
  coshh: "hsl(38, 92%, 50%)",
  induction: "hsl(262, 83%, 58%)",
  permit: "hsl(0, 84%, 60%)",
  inspection: "hsl(199, 89%, 48%)",
  certificate: "hsl(330, 81%, 60%)",
  insurance: "hsl(160, 84%, 39%)",
  other: "hsl(var(--muted-foreground))",
};

export default function DocumentsChart({ dateRange }: DocumentsChartProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [statusData, setStatusData] = useState<StatusData[]>([]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, dateRange]);

  const fetchData = async () => {
    try {
      // Get organisation ID
      const { data: memberData } = await supabase
        .from("organisation_members")
        .select("organisation_id")
        .eq("profile_id", user?.id)
        .eq("status", "active")
        .maybeSingle();

      if (!memberData) return;

      // Fetch documents
      const { data: documents, error } = await supabase
        .from("documents")
        .select("category, status")
        .eq("organisation_id", memberData.organisation_id);

      if (error) throw error;

      // Aggregate by category
      const categoryCounts: Record<string, number> = {};
      const statusCounts: Record<string, number> = { pending: 0, approved: 0, rejected: 0 };

      documents?.forEach((doc) => {
        categoryCounts[doc.category] = (categoryCounts[doc.category] || 0) + 1;
        statusCounts[doc.status] = (statusCounts[doc.status] || 0) + 1;
      });

      const pieData: CategoryData[] = Object.entries(categoryCounts)
        .map(([key, value]) => ({
          name: categoryLabels[key] || key,
          value,
          color: categoryColors[key] || categoryColors.other,
        }))
        .sort((a, b) => b.value - a.value);

      const barData: StatusData[] = [
        { status: "Pending", count: statusCounts.pending },
        { status: "Approved", count: statusCounts.approved },
        { status: "Rejected", count: statusCounts.rejected },
      ];

      setCategoryData(pieData);
      setStatusData(barData);
    } catch (error) {
      console.error("Error fetching documents data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[250px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[250px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Documents by Category</CardTitle>
          <CardDescription>Distribution of document types</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No documents uploaded yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documents by Status</CardTitle>
          <CardDescription>Approval workflow status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                <XAxis type="number" className="text-xs fill-muted-foreground" />
                <YAxis 
                  type="category" 
                  dataKey="status" 
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
                />
                <Bar 
                  dataKey="count" 
                  fill="hsl(var(--primary))" 
                  radius={[0, 4, 4, 0]}
                  name="Documents"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
