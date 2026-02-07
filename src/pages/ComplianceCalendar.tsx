import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, isToday, differenceInDays } from "date-fns";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  AlertTriangle,
  XCircle,
  Building2,
  FileCheck,
  Clock,
} from "lucide-react";
import { COMPLIANCE_DOC_LABELS, type ComplianceDocType } from "@/types/contractor";

interface ExpiringDoc {
  id: string;
  doc_type: ComplianceDocType;
  expiry_date: string;
  reference_number: string | null;
  contractor_company_id: string | null;
  contractor_name?: string;
  profile_id: string | null;
  operative_name?: string;
}

const ComplianceCalendar = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filterType, setFilterType] = useState<string>("all");

  // Fetch compliance docs with expiry dates
  const { data: expiringDocs = [], isLoading } = useQuery({
    queryKey: ["compliance-calendar"],
    queryFn: async () => {
      const { data: docs, error } = await supabase
        .from("contractor_compliance_docs")
        .select(`
          id,
          doc_type,
          expiry_date,
          reference_number,
          contractor_company_id,
          profile_id,
          contractor_companies:contractor_company_id(company_name),
          contractor_operatives:profile_id(full_name)
        `)
        .not("expiry_date", "is", null)
        .order("expiry_date", { ascending: true });

      if (error) throw error;

      return (docs || []).map((doc: any) => ({
        id: doc.id,
        doc_type: doc.doc_type,
        expiry_date: doc.expiry_date,
        reference_number: doc.reference_number,
        contractor_company_id: doc.contractor_company_id,
        contractor_name: doc.contractor_companies?.company_name,
        profile_id: doc.profile_id,
        operative_name: doc.contractor_operatives?.full_name,
      })) as ExpiringDoc[];
    },
  });

  // Filter docs to show 3 months around current month
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get unique doc types for filter
  const docTypes = useMemo(() => {
    const types = new Set(expiringDocs.map((d) => d.doc_type));
    return Array.from(types);
  }, [expiringDocs]);

  // Filter docs by type
  const filteredDocs = useMemo(() => {
    if (filterType === "all") return expiringDocs;
    return expiringDocs.filter((d) => d.doc_type === filterType);
  }, [expiringDocs, filterType]);

  // Get docs for a specific day
  const getDocsForDay = (date: Date) => {
    return filteredDocs.filter((doc) =>
      isSameDay(new Date(doc.expiry_date), date)
    );
  };

  // Get status color
  const getStatusForDate = (date: Date): "expired" | "urgent" | "warning" | "ok" | null => {
    const docs = getDocsForDay(date);
    if (docs.length === 0) return null;

    const today = new Date();
    const daysUntil = differenceInDays(date, today);

    if (daysUntil < 0) return "expired";
    if (daysUntil <= 7) return "urgent";
    if (daysUntil <= 30) return "warning";
    return "ok";
  };

  // Summary stats
  const stats = useMemo(() => {
    const today = new Date();
    return {
      expired: filteredDocs.filter((d) => new Date(d.expiry_date) < today).length,
      within7Days: filteredDocs.filter((d) => {
        const days = differenceInDays(new Date(d.expiry_date), today);
        return days >= 0 && days <= 7;
      }).length,
      within30Days: filteredDocs.filter((d) => {
        const days = differenceInDays(new Date(d.expiry_date), today);
        return days > 7 && days <= 30;
      }).length,
      total: filteredDocs.length,
    };
  }, [filteredDocs]);

  // Upcoming expiries list
  const upcomingExpiries = useMemo(() => {
    const today = new Date();
    return filteredDocs
      .filter((d) => {
        const expiryDate = new Date(d.expiry_date);
        return differenceInDays(expiryDate, today) <= 60;
      })
      .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime())
      .slice(0, 15);
  }, [filteredDocs]);

  const getDocLabel = (docType: ComplianceDocType) => {
    return COMPLIANCE_DOC_LABELS[docType]?.label || docType;
  };

  const getExpiryBadge = (expiryDate: string) => {
    const days = differenceInDays(new Date(expiryDate), new Date());
    if (days < 0) {
      return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Expired</Badge>;
    }
    if (days <= 7) {
      return <Badge className="bg-destructive/10 text-destructive border-destructive/20">{days}d left</Badge>;
    }
    if (days <= 30) {
      return <Badge className="bg-warning/10 text-warning border-warning/20">{days}d left</Badge>;
    }
    return <Badge variant="outline">{days}d left</Badge>;
  };

  if (isLoading) {
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
      <div className="p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Compliance Calendar</h1>
            <p className="text-sm text-muted-foreground">
              Track document expiry dates across all contractors
            </p>
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="All Document Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Document Types</SelectItem>
              {docTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {getDocLabel(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-card rounded-xl border p-6 ${stats.expired > 0 ? "border-destructive/50 animate-pulse" : "border-border"}`}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.expired}</p>
                <p className="text-sm text-muted-foreground">Expired</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-xl border border-border p-6"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.within7Days}</p>
                <p className="text-sm text-muted-foreground">Within 7 Days</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-xl border border-border p-6"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.within30Days}</p>
                <p className="text-sm text-muted-foreground">Within 30 Days</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card rounded-xl border border-border p-6"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Tracked</p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold text-foreground">
                {format(currentMonth, "MMMM yyyy")}
              </h2>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Add empty cells for days before the month starts */}
              {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              {daysInMonth.map((day) => {
                const docsForDay = getDocsForDay(day);
                const status = getStatusForDate(day);

                return (
                  <motion.div
                    key={day.toISOString()}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`
                      aspect-square p-1 rounded-lg border transition-all relative group
                      ${isToday(day) ? "border-primary bg-primary/5" : "border-transparent"}
                      ${!isSameMonth(day, currentMonth) ? "opacity-30" : ""}
                      ${status === "expired" ? "bg-destructive/10" : ""}
                      ${status === "urgent" ? "bg-destructive/5" : ""}
                      ${status === "warning" ? "bg-warning/5" : ""}
                      ${docsForDay.length > 0 ? "cursor-pointer hover:bg-muted" : ""}
                    `}
                  >
                    <span
                      className={`
                        text-sm font-medium block text-center
                        ${isToday(day) ? "text-primary" : "text-foreground"}
                      `}
                    >
                      {format(day, "d")}
                    </span>
                    {docsForDay.length > 0 && (
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {status === "expired" && (
                          <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
                        )}
                        {status === "urgent" && (
                          <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
                        )}
                        {status === "warning" && (
                          <div className="h-1.5 w-1.5 rounded-full bg-warning" />
                        )}
                        {status === "ok" && (
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        )}
                        {docsForDay.length > 1 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{docsForDay.length - 1}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Tooltip on hover */}
                    {docsForDay.length > 0 && (
                      <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48">
                        <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
                          <p className="text-xs font-medium text-foreground mb-1">
                            {format(day, "d MMM yyyy")}
                          </p>
                          {docsForDay.slice(0, 3).map((doc) => (
                            <div key={doc.id} className="text-xs text-muted-foreground">
                              • {getDocLabel(doc.doc_type)}
                              {doc.contractor_name && (
                                <span className="block pl-2 text-muted-foreground/70">
                                  {doc.contractor_name}
                                </span>
                              )}
                            </div>
                          ))}
                          {docsForDay.length > 3 && (
                            <p className="text-xs text-muted-foreground">
                              +{docsForDay.length - 3} more
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 mt-6 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-destructive" />
                <span className="text-xs text-muted-foreground">Expired/Urgent</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-warning" />
                <span className="text-xs text-muted-foreground">Within 30 days</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-primary" />
                <span className="text-xs text-muted-foreground">Future</span>
              </div>
            </div>
          </div>

          {/* Upcoming Expiries List */}
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Upcoming Expiries</h3>
            </div>

            {upcomingExpiries.length === 0 ? (
              <div className="text-center py-8">
                <FileCheck className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No expiries in the next 60 days
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {upcomingExpiries.map((doc) => (
                  <Link
                    key={doc.id}
                    to={doc.contractor_company_id ? `/contractors/${doc.contractor_company_id}` : "#"}
                    className="block p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/50 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground line-clamp-1">
                        {getDocLabel(doc.doc_type)}
                      </span>
                      {getExpiryBadge(doc.expiry_date)}
                    </div>
                    {doc.contractor_name && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        <span>{doc.contractor_name}</span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Expires: {format(new Date(doc.expiry_date), "d MMM yyyy")}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ComplianceCalendar;
