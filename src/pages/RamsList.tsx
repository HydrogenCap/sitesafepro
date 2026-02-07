import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Plus, 
  Search, 
  FileText, 
  MoreVertical, 
  Eye, 
  Pencil, 
  Copy, 
  Download, 
  Trash2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Archive
} from "lucide-react";
import { format } from "date-fns";

type RamsStatus = 'draft' | 'review' | 'approved' | 'superseded';

interface RamsRecord {
  id: string;
  rams_reference: string;
  title: string;
  status: RamsStatus;
  revision_number: number;
  assessment_date: string;
  project_id: string;
  projects: {
    name: string;
  } | null;
}

const statusConfig: Record<RamsStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ElementType }> = {
  draft: { label: "Draft", variant: "secondary", icon: Clock },
  review: { label: "Review", variant: "default", icon: AlertTriangle },
  approved: { label: "Approved", variant: "default", icon: CheckCircle2 },
  superseded: { label: "Superseded", variant: "outline", icon: Archive },
};

export default function RamsList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");

  // Fetch RAMS records
  const { data: ramsRecords, isLoading: ramsLoading } = useQuery({
    queryKey: ["rams-records", statusFilter, projectFilter],
    queryFn: async () => {
      let query = supabase
        .from("rams_records")
        .select(`
          id,
          rams_reference,
          title,
          status,
          revision_number,
          assessment_date,
          project_id,
          projects (name)
        `)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (projectFilter !== "all") {
        query = query.eq("project_id", projectFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as RamsRecord[];
    },
  });

  // Fetch projects for filter
  const { data: projects } = useQuery({
    queryKey: ["projects-for-rams-filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const filteredRecords = ramsRecords?.filter((record) =>
    record.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.rams_reference.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: RamsStatus) => {
    const config = statusConfig[status];
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">RAMS</h1>
            <p className="text-muted-foreground">
              Risk Assessments & Method Statements
            </p>
          </div>
          <Button onClick={() => navigate("/rams/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Generate RAMS
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title or reference..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="superseded">Superseded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* RAMS Table */}
        {ramsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filteredRecords && filteredRecords.length > 0 ? (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden md:table-cell">Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Rev</TableHead>
                  <TableHead className="hidden lg:table-cell">Date</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-mono text-sm">
                      {record.rams_reference}
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/rams/${record.id}`}
                        className="font-medium hover:underline"
                      >
                        {record.title}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {record.projects?.name || "—"}
                    </TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      v{record.revision_number}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {format(new Date(record.assessment_date), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/rams/${record.id}`)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          {record.status === "draft" && (
                            <DropdownMenuItem onClick={() => navigate(`/rams/${record.id}/edit`)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="h-4 w-4 mr-2" />
                            Download PDF
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <CardTitle className="mb-2">No RAMS generated yet</CardTitle>
              <CardDescription className="max-w-md mb-6">
                Create your first Risk Assessment & Method Statement using our guided builder. 
                Select from 50+ pre-loaded activities and customise for your specific site.
              </CardDescription>
              <Button onClick={() => navigate("/rams/new")}>
                <Plus className="h-4 w-4 mr-2" />
                Generate Your First RAMS
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
