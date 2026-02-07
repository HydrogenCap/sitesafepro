import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import {
  useContractor,
  useContractorComplianceDocs,
  useContractorOperatives,
  useContractorProjects,
  useUpdateContractor,
} from "@/hooks/useContractors";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  HardHat,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Shield,
  Users,
  FolderOpen,
  Activity,
  Phone,
  Mail,
  MapPin,
  Globe,
  Star,
  Edit,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TRADES } from "@/types/contractor";
import { ContractorComplianceTab } from "@/components/contractors/ContractorComplianceTab";
import { ContractorOperativesTab } from "@/components/contractors/ContractorOperativesTab";
import { ContractorProjectsTab } from "@/components/contractors/ContractorProjectsTab";
import { RequestDocumentsDialog } from "@/components/contractors/RequestDocumentsDialog";

const ContractorDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: contractor, isLoading } = useContractor(id);
  const { data: complianceDocs = [] } = useContractorComplianceDocs(id);
  const { data: operatives = [] } = useContractorOperatives(id);
  const { data: projects = [] } = useContractorProjects(id);
  const updateContractor = useUpdateContractor();
  const [activeTab, setActiveTab] = useState("compliance");

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!contractor) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <p>Contractor not found</p>
        </div>
      </DashboardLayout>
    );
  }

  const getComplianceIcon = (status: string) => {
    switch (status) {
      case "compliant":
        return <CheckCircle2 className="h-6 w-6 text-success" />;
      case "expiring_soon":
        return <AlertTriangle className="h-6 w-6 text-warning" />;
      case "expired":
      case "incomplete":
        return <XCircle className="h-6 w-6 text-destructive" />;
      default:
        return <AlertTriangle className="h-6 w-6 text-muted-foreground" />;
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

  const handleApprove = () => {
    if (!id) return;
    updateContractor.mutate({
      id,
      data: {
        is_approved: !contractor.is_approved,
        approved_at: !contractor.is_approved ? new Date().toISOString() : null,
      },
    });
  };

  const tradeLabel = TRADES.find((t) => t.value === contractor.primary_trade)?.label || contractor.primary_trade;

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/contractors")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contractors
          </Button>

          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-xl bg-secondary flex items-center justify-center">
                <HardHat className="h-8 w-8 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-foreground">
                    {contractor.company_name}
                  </h1>
                  {getComplianceIcon(contractor.compliance_status)}
                </div>
                {contractor.trading_name && (
                  <p className="text-sm text-muted-foreground mb-2">
                    t/a {contractor.trading_name}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{tradeLabel}</Badge>
                  {getComplianceBadge(contractor.compliance_status)}
                  {contractor.is_approved ? (
                    <Badge variant="outline" className="border-success/30 text-success">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Approved
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-warning/30 text-warning">
                      Awaiting Approval
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <RequestDocumentsDialog
                contractorId={id!}
                contractorName={contractor.company_name}
                contactEmail={contractor.primary_contact_email || undefined}
                contactName={contractor.primary_contact_name || undefined}
              />
              <Button variant="outline" onClick={handleApprove}>
                {contractor.is_approved ? "Revoke Approval" : "Approve Contractor"}
              </Button>
              <Button variant="outline" asChild>
                <Link to={`/contractors/${id}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Assign to Project</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">
                    Deactivate
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Contact Info Card */}
        <div className="grid gap-6 lg:grid-cols-3 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl border border-border p-6 lg:col-span-2"
          >
            <h3 className="font-semibold mb-4">Contact Information</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {contractor.primary_contact_name && (
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{contractor.primary_contact_name}</span>
                </div>
              )}
              {contractor.primary_contact_email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`mailto:${contractor.primary_contact_email}`}
                    className="text-primary hover:underline"
                  >
                    {contractor.primary_contact_email}
                  </a>
                </div>
              )}
              {contractor.primary_contact_phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`tel:${contractor.primary_contact_phone}`}
                    className="hover:underline"
                  >
                    {contractor.primary_contact_phone}
                  </a>
                </div>
              )}
              {contractor.website && (
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={contractor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {contractor.website}
                  </a>
                </div>
              )}
              {contractor.office_address && (
                <div className="flex items-start gap-3 sm:col-span-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span>{contractor.office_address}</span>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-xl border border-border p-6"
          >
            <h3 className="font-semibold mb-4">Company Details</h3>
            <div className="space-y-3 text-sm">
              {contractor.company_registration_number && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Company No.</span>
                  <span className="font-medium">{contractor.company_registration_number}</span>
                </div>
              )}
              {contractor.vat_number && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VAT No.</span>
                  <span className="font-medium">{contractor.vat_number}</span>
                </div>
              )}
              {contractor.tax_status && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax Status</span>
                  <span className="font-medium capitalize">
                    {contractor.tax_status.replace("_", " ")}
                  </span>
                </div>
              )}
              {contractor.internal_rating && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Rating</span>
                  <div className="flex items-center gap-0.5">
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
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="compliance" className="gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Compliance</span>
              <Badge variant="secondary" className="ml-1">
                {complianceDocs.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="operatives" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Operatives</span>
              <Badge variant="secondary" className="ml-1">
                {operatives.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="projects" className="gap-2">
              <FolderOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Projects</span>
              <Badge variant="secondary" className="ml-1">
                {projects.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Activity</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="compliance">
            <ContractorComplianceTab
              contractorId={id!}
              complianceDocs={complianceDocs}
            />
          </TabsContent>

          <TabsContent value="operatives">
            <ContractorOperativesTab
              contractorId={id!}
              operatives={operatives}
            />
          </TabsContent>

          <TabsContent value="projects">
            <ContractorProjectsTab
              contractorId={id!}
              projects={projects}
            />
          </TabsContent>

          <TabsContent value="activity">
            <div className="bg-card rounded-xl border border-border p-6">
              <p className="text-muted-foreground text-center py-8">
                Activity feed coming soon...
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ContractorDetail;
