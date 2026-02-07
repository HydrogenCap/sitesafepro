import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useContractors, useContractorStats } from "@/hooks/useContractors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  HardHat,
  Building2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Users,
  Phone,
  Mail,
  Star,
} from "lucide-react";
import { TRADES } from "@/types/contractor";

const Contractors = () => {
  const { data: contractors = [], isLoading } = useContractors();
  const stats = useContractorStats();
  const [searchQuery, setSearchQuery] = useState("");
  const [tradeFilter, setTradeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredContractors = contractors.filter((contractor) => {
    const matchesSearch =
      contractor.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contractor.primary_contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contractor.primary_contact_email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTrade = tradeFilter === "all" || contractor.primary_trade === tradeFilter;
    const matchesStatus = statusFilter === "all" || contractor.compliance_status === statusFilter;

    return matchesSearch && matchesTrade && matchesStatus && contractor.is_active;
  });

  const getComplianceIcon = (status: string) => {
    switch (status) {
      case "compliant":
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case "expiring_soon":
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      case "expired":
      case "incomplete":
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getComplianceBadge = (status: string) => {
    switch (status) {
      case "compliant":
        return <Badge className="bg-success/10 text-success border-success/20">Compliant</Badge>;
      case "expiring_soon":
        return <Badge className="bg-warning/10 text-warning border-warning/20">Expiring Soon</Badge>;
      case "expired":
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Expired</Badge>;
      case "incomplete":
        return <Badge className="bg-muted text-muted-foreground">Incomplete</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getTradeBadge = (trade: string) => {
    const tradeLabel = TRADES.find((t) => t.value === trade)?.label || trade;
    return (
      <Badge variant="secondary" className="font-normal">
        {tradeLabel}
      </Badge>
    );
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
            <h1 className="text-2xl font-bold text-foreground">Contractors</h1>
            <p className="text-sm text-muted-foreground">
              Manage contractor companies and compliance
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild>
              <Link to="/contractors/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Contractor
              </Link>
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl border border-border p-6"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Contractors</p>
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
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.compliant}</p>
                <p className="text-sm text-muted-foreground">Fully Compliant</p>
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
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.expiringSoon}</p>
                <p className="text-sm text-muted-foreground">Expiring Soon</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`bg-card rounded-xl border border-border p-6 ${stats.nonCompliant > 0 ? 'animate-pulse border-destructive/50' : ''}`}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.nonCompliant}</p>
                <p className="text-sm text-muted-foreground">Non-Compliant</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contractors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={tradeFilter} onValueChange={setTradeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Trades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Trades</SelectItem>
              {TRADES.map((trade) => (
                <SelectItem key={trade.value} value={trade.value}>
                  {trade.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="compliant">Compliant</SelectItem>
              <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="incomplete">Incomplete</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Contractors Grid */}
        {filteredContractors.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredContractors.map((contractor, index) => (
              <motion.div
                key={contractor.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link to={`/contractors/${contractor.id}`}>
                  <div className="bg-card rounded-xl border border-border p-6 hover:border-primary/30 hover:shadow-md transition-all group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center group-hover:bg-primary transition-colors">
                          <HardHat className="h-6 w-6 text-primary group-hover:text-primary-foreground transition-colors" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground line-clamp-1">
                            {contractor.company_name}
                          </h3>
                          {contractor.trading_name && (
                            <p className="text-xs text-muted-foreground">
                              t/a {contractor.trading_name}
                            </p>
                          )}
                        </div>
                      </div>
                      {getComplianceIcon(contractor.compliance_status)}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {getTradeBadge(contractor.primary_trade)}
                      {getComplianceBadge(contractor.compliance_status)}
                      {contractor.is_approved && (
                        <Badge variant="outline" className="border-success/30 text-success">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Approved
                        </Badge>
                      )}
                    </div>

                    {contractor.primary_contact_name && (
                      <div className="space-y-2 text-sm text-muted-foreground border-t border-border pt-4">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>{contractor.primary_contact_name}</span>
                        </div>
                        {contractor.primary_contact_email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            <span className="truncate">{contractor.primary_contact_email}</span>
                          </div>
                        )}
                        {contractor.primary_contact_phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            <span>{contractor.primary_contact_phone}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {contractor.internal_rating && (
                      <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= contractor.internal_rating!
                                ? "text-warning fill-warning"
                                : "text-muted-foreground/30"
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl border-2 border-dashed border-border p-12 text-center"
          >
            <div className="h-16 w-16 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
              <HardHat className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {searchQuery || tradeFilter !== "all" || statusFilter !== "all"
                ? "No contractors found"
                : "No contractors yet"}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {searchQuery || tradeFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Add your first contractor to start tracking compliance."}
            </p>
            {!searchQuery && tradeFilter === "all" && statusFilter === "all" && (
              <Button asChild>
                <Link to="/contractors/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Contractor
                </Link>
              </Button>
            )}
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Contractors;
