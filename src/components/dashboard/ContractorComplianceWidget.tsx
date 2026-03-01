import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { HardHat, ChevronRight, AlertTriangle, ShieldCheck, ShieldAlert, Clock } from "lucide-react";
import { differenceInDays } from "date-fns";

interface ContractorSummary {
  id: string;
  company_name: string;
  compliance_score: number | null;
  compliance_status: string | null;
  required_doc_types: string[];
}

interface ExpiringContractorDoc {
  id: string;
  doc_type: string;
  expiry_date: string;
  contractor_name: string;
  contractor_id: string;
}

export function ContractorComplianceWidget() {
  const { organisation } = useSubscription();
  const [contractors, setContractors] = useState<ContractorSummary[]>([]);
  const [expiringDocs, setExpiringDocs] = useState<ExpiringContractorDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organisation?.id) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [contractorRes, docsRes] = await Promise.all([
          supabase
            .from("contractor_companies")
            .select("id, company_name, compliance_score, compliance_status, required_doc_types")
            .eq("organisation_id", organisation.id)
            .eq("is_active", true)
            .order("compliance_score", { ascending: true, nullsFirst: true }),
          supabase
            .from("contractor_compliance_docs")
            .select("id, doc_type, expiry_date, contractor_company_id, contractor_companies!inner(company_name)")
            .eq("organisation_id", organisation.id)
            .eq("is_current", true)
            .not("expiry_date", "is", null)
            .lte("expiry_date", new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
            .order("expiry_date", { ascending: true }),
        ]);

        if (contractorRes.data) {
          setContractors(contractorRes.data as ContractorSummary[]);
        }

        if (docsRes.data) {
          setExpiringDocs(
            docsRes.data.map((d: any) => ({
              id: d.id,
              doc_type: d.doc_type,
              expiry_date: d.expiry_date,
              contractor_name: d.contractor_companies?.company_name || "Unknown",
              contractor_id: d.contractor_company_id,
            }))
          );
        }
      } catch (err) {
        console.error("Error fetching contractor compliance:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [organisation?.id]);

  if (loading) {
    return (
      <div className="bg-card rounded-xl p-6 border border-border animate-pulse">
        <div className="h-6 w-48 bg-muted rounded mb-4" />
        <div className="h-24 w-full bg-muted rounded" />
      </div>
    );
  }

  if (contractors.length === 0) return null;

  const compliantCount = contractors.filter((c) => c.compliance_status === "compliant").length;
  const expiringSoonCount = contractors.filter((c) => c.compliance_status === "expiring_soon").length;
  const expiredCount = contractors.filter((c) => c.compliance_status === "expired").length;
  const incompleteCount = contractors.filter(
    (c) => c.compliance_status === "incomplete" || !c.compliance_status
  ).length;
  const avgScore = contractors.length > 0
    ? Math.round(contractors.reduce((sum, c) => sum + (c.compliance_score || 0), 0) / contractors.length)
    : 0;

  const statusColor = avgScore >= 80 ? "text-green-600" : avgScore >= 50 ? "text-accent" : "text-destructive";

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <HardHat className="h-5 w-5 text-primary" />
              Contractor Compliance
            </CardTitle>
            <Link
              to="/contractors"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Average Score */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-muted-foreground">Average Compliance Score</span>
                <span className={`text-lg font-bold ${statusColor}`}>{avgScore}%</span>
              </div>
              <Progress value={avgScore} className="h-2" />
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg bg-green-500/10 p-3 text-center">
              <ShieldCheck className="h-4 w-4 text-green-600 mx-auto mb-1" />
              <p className="text-xl font-bold text-foreground">{compliantCount}</p>
              <p className="text-xs text-muted-foreground">Compliant</p>
            </div>
            <div className="rounded-lg bg-accent/10 p-3 text-center">
              <Clock className="h-4 w-4 text-accent mx-auto mb-1" />
              <p className="text-xl font-bold text-foreground">{expiringSoonCount}</p>
              <p className="text-xs text-muted-foreground">Expiring Soon</p>
            </div>
            <div className="rounded-lg bg-destructive/10 p-3 text-center">
              <ShieldAlert className="h-4 w-4 text-destructive mx-auto mb-1" />
              <p className="text-xl font-bold text-foreground">{expiredCount}</p>
              <p className="text-xs text-muted-foreground">Expired</p>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <AlertTriangle className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
              <p className="text-xl font-bold text-foreground">{incompleteCount}</p>
              <p className="text-xs text-muted-foreground">Incomplete</p>
            </div>
          </div>

          {/* Expiring Docs List */}
          {expiringDocs.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Documents expiring within 30 days
              </p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {expiringDocs.slice(0, 5).map((doc) => {
                  const days = differenceInDays(new Date(doc.expiry_date), new Date());
                  return (
                    <Link
                      key={doc.id}
                      to={`/contractors/${doc.contractor_id}`}
                      className="flex items-center justify-between p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {doc.contractor_name}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {doc.doc_type.replace(/_/g, " ")}
                        </p>
                      </div>
                      <Badge
                        className={`text-xs ${
                          days <= 0
                            ? "bg-destructive/10 text-destructive"
                            : days <= 7
                            ? "bg-destructive/10 text-destructive"
                            : "bg-accent/10 text-accent"
                        }`}
                      >
                        {days <= 0 ? "Expired" : `${days}d left`}
                      </Badge>
                    </Link>
                  );
                })}
                {expiringDocs.length > 5 && (
                  <Link to="/contractors" className="block text-center">
                    <Button variant="ghost" size="sm" className="text-xs w-full">
                      +{expiringDocs.length - 5} more
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
