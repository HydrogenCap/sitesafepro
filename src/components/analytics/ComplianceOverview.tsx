import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  FileText, 
  Shield,
  Clock
} from "lucide-react";

interface ComplianceItem {
  category: string;
  label: string;
  total: number;
  approved: number;
  pending: number;
  expired: number;
}

const categoryLabels: Record<string, string> = {
  rams: "RAMS",
  method_statement: "Method Statements",
  safety_plan: "Safety Plans",
  coshh: "COSHH Assessments",
  induction: "Inductions",
  permit: "Permits to Work",
  inspection: "Inspections",
  certificate: "Certificates",
  insurance: "Insurance Documents",
};

export default function ComplianceOverview() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [compliance, setCompliance] = useState<ComplianceItem[]>([]);
  const [overallScore, setOverallScore] = useState(0);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Get organisation ID
      const { data: memberData } = await supabase
        .from("organisation_members")
        .select("organisation_id")
        .eq("profile_id", user?.id)
        .eq("status", "active")
        .single();

      if (!memberData) return;

      // Fetch documents grouped by category and status
      const { data: documents, error } = await supabase
        .from("documents")
        .select("category, status")
        .eq("organisation_id", memberData.organisation_id);

      if (error) throw error;

      // Aggregate by category
      const categoryStats: Record<string, { total: number; approved: number; pending: number; expired: number }> = {};

      documents?.forEach((doc) => {
        if (!categoryStats[doc.category]) {
          categoryStats[doc.category] = { total: 0, approved: 0, pending: 0, expired: 0 };
        }
        categoryStats[doc.category].total++;
        if (doc.status === "approved") categoryStats[doc.category].approved++;
        if (doc.status === "pending") categoryStats[doc.category].pending++;
        if (doc.status === "expired") categoryStats[doc.category].expired++;
      });

      const complianceData: ComplianceItem[] = Object.entries(categoryStats)
        .map(([category, stats]) => ({
          category,
          label: categoryLabels[category] || category,
          ...stats,
        }))
        .sort((a, b) => b.total - a.total);

      setCompliance(complianceData);

      // Calculate overall compliance score
      const totalDocs = documents?.length || 0;
      const approvedDocs = documents?.filter((d) => d.status === "approved").length || 0;
      const score = totalDocs > 0 ? Math.round((approvedDocs / totalDocs) * 100) : 0;
      setOverallScore(score);
    } catch (error) {
      console.error("Error fetching compliance data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (score: number) => {
    if (score >= 80) return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
    if (score >= 50) return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    return <XCircle className="h-5 w-5 text-destructive" />;
  };

  const getStatusBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-emerald-500/10 text-emerald-600 border-0">Compliant</Badge>;
    if (score >= 50) return <Badge className="bg-amber-500/10 text-amber-600 border-0">Needs Attention</Badge>;
    return <Badge variant="destructive">Non-Compliant</Badge>;
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Overall Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Overall Compliance Score
          </CardTitle>
          <CardDescription>
            Based on document approval status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-6">
            <div className="relative">
              <svg className="h-32 w-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  className="text-muted"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${(overallScore / 100) * 352} 352`}
                  className={
                    overallScore >= 80
                      ? "text-emerald-500"
                      : overallScore >= 50
                      ? "text-amber-500"
                      : "text-destructive"
                  }
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold">{overallScore}%</span>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              {getStatusIcon(overallScore)}
              {getStatusBadge(overallScore)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Compliance by Category
          </CardTitle>
          <CardDescription>
            Document status across categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          {compliance.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mb-4" />
              <p>No documents uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {compliance.slice(0, 5).map((item) => {
                const score = item.total > 0 ? Math.round((item.approved / item.total) * 100) : 0;
                return (
                  <div key={item.category} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {item.approved}/{item.total}
                        </span>
                        {item.pending > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {item.pending}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Progress 
                      value={score} 
                      className={`h-2 ${
                        score >= 80 ? "[&>div]:bg-emerald-500" : 
                        score >= 50 ? "[&>div]:bg-amber-500" : 
                        "[&>div]:bg-destructive"
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
