import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, FileText, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

interface ExpiringDoc {
  id: string;
  name: string;
  category: string;
  expiry_date: string;
  project_name: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  rams: "RAMS",
  risk_assessment: "Risk Assessment",
  method_statement: "Method Statement",
  safety_plan: "Safety Plan",
  coshh: "COSHH",
  fire_safety: "Fire Safety",
  induction: "Induction",
  permit: "Permit",
  inspection: "Inspection",
  certificate: "Certificate",
  insurance: "Insurance",
  meeting_minutes: "Minutes",
  drawing: "Drawing",
  other: "Other",
};

export function ComplianceCalendarWidget() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState<ExpiringDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExpiring = async () => {
      const ninetyDaysFromNow = new Date();
      ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

      const { data, error } = await supabase
        .from("documents")
        .select("id, name, category, expiry_date, projects(name)")
        .not("expiry_date", "is", null)
        .lte("expiry_date", ninetyDaysFromNow.toISOString().split("T")[0])
        .order("expiry_date", { ascending: true });

      if (!error && data) {
        setDocs(
          data.map((d: any) => ({
            id: d.id,
            name: d.name,
            category: d.category,
            expiry_date: d.expiry_date,
            project_name: d.projects?.name || null,
          }))
        );
      }
      setLoading(false);
    };
    fetchExpiring();
  }, []);

  const now = new Date();
  const getDaysRemaining = (dateStr: string) => {
    return Math.ceil((new Date(dateStr).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const buckets = [
    { label: "0–30 days", docs: docs.filter((d) => getDaysRemaining(d.expiry_date) <= 30) },
    { label: "31–60 days", docs: docs.filter((d) => { const dr = getDaysRemaining(d.expiry_date); return dr > 30 && dr <= 60; }) },
    { label: "61–90 days", docs: docs.filter((d) => { const dr = getDaysRemaining(d.expiry_date); return dr > 60 && dr <= 90; }) },
  ];

  const getPillColor = (days: number) => {
    if (days <= 0) return "bg-destructive/10 text-destructive";
    if (days <= 7) return "bg-destructive/10 text-destructive";
    if (days <= 30) return "bg-accent/10 text-accent";
    return "bg-muted text-muted-foreground";
  };

  if (loading) return null;
  if (docs.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarClock className="h-5 w-5 text-primary" />
              Document Expiry Tracker
            </CardTitle>
            <button
              onClick={() => navigate("/documents")}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              View all <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {buckets.map((bucket) => (
              <div key={bucket.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {bucket.label}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {bucket.docs.length}
                  </Badge>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {bucket.docs.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-3 text-center">None</p>
                  ) : (
                    bucket.docs.map((doc) => {
                      const days = getDaysRemaining(doc.expiry_date);
                      return (
                        <button
                          key={doc.id}
                          onClick={() => navigate(`/documents/${doc.id}`)}
                          className="w-full text-left p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground truncate">
                                {doc.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {CATEGORY_LABELS[doc.category] || doc.category}
                                {doc.project_name && ` · ${doc.project_name}`}
                              </p>
                            </div>
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium whitespace-nowrap ${getPillColor(days)}`}>
                              {days <= 0 ? "Expired" : `${days}d`}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
