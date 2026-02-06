import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { QrCode, Plus, Copy, ExternalLink, Users, Clock, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface Project {
  id: string;
  name: string;
}

interface AccessCode {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  created_at: string;
  project: Project;
}

interface SiteVisit {
  id: string;
  visitor_name: string;
  visitor_company: string | null;
  visitor_email: string | null;
  purpose: string | null;
  checked_in_at: string;
  checked_out_at: string | null;
  has_signed_induction: boolean;
  site_access_code_id: string;
  project: Project;
}

export default function SiteAccess() {
  const { user } = useAuth();
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [visits, setVisits] = useState<SiteVisit[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newCodeName, setNewCodeName] = useState("Main Entrance");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch projects
      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select("id, name")
        .eq("status", "active");

      if (projectsError) throw projectsError;
      setProjects(projectsData || []);

      // Fetch access codes
      const { data: codesData, error: codesError } = await supabase
        .from("site_access_codes")
        .select(`
          id,
          code,
          name,
          is_active,
          created_at,
          project:projects(id, name)
        `)
        .order("created_at", { ascending: false });

      if (codesError) throw codesError;
      setAccessCodes(codesData as AccessCode[] || []);

      // Fetch recent visits
      const { data: visitsData, error: visitsError } = await supabase
        .from("site_visits")
        .select(`
          id,
          visitor_name,
          visitor_company,
          visitor_email,
          purpose,
          checked_in_at,
          checked_out_at,
          has_signed_induction,
          site_access_code_id,
          project:projects(id, name)
        `)
        .order("checked_in_at", { ascending: false })
        .limit(100);

      if (visitsError) throw visitsError;
      setVisits(visitsData as SiteVisit[] || []);
    } catch (error: any) {
      toast.error("Failed to load site access data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const createAccessCode = async () => {
    if (!selectedProjectId) {
      toast.error("Please select a project");
      return;
    }

    try {
      const { data: orgData } = await supabase
        .from("organisation_members")
        .select("organisation_id")
        .eq("profile_id", user?.id)
        .eq("status", "active")
        .maybeSingle();

      if (!orgData) {
        toast.error("Could not find your organisation");
        return;
      }

      const { data, error } = await supabase
        .from("site_access_codes")
        .insert({
          project_id: selectedProjectId,
          organisation_id: orgData.organisation_id,
          name: newCodeName,
          created_by: user?.id,
        })
        .select(`
          id,
          code,
          name,
          is_active,
          created_at,
          project:projects(id, name)
        `)
        .single();

      if (error) throw error;

      setAccessCodes([data as AccessCode, ...accessCodes]);
      setCreateDialogOpen(false);
      setNewCodeName("Main Entrance");
      setSelectedProjectId("");
      toast.success("Access code created successfully");
    } catch (error: any) {
      toast.error("Failed to create access code");
      console.error(error);
    }
  };

  const toggleCodeStatus = async (codeId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("site_access_codes")
        .update({ is_active: !isActive })
        .eq("id", codeId);

      if (error) throw error;

      setAccessCodes(accessCodes.map(code => 
        code.id === codeId ? { ...code, is_active: !isActive } : code
      ));
      toast.success(`Access code ${!isActive ? "activated" : "deactivated"}`);
    } catch (error: any) {
      toast.error("Failed to update access code");
      console.error(error);
    }
  };

  const deleteAccessCode = async (codeId: string) => {
    try {
      const { error } = await supabase
        .from("site_access_codes")
        .delete()
        .eq("id", codeId);

      if (error) throw error;

      setAccessCodes(accessCodes.filter(code => code.id !== codeId));
      toast.success("Access code deleted");
    } catch (error: any) {
      toast.error("Failed to delete access code");
      console.error(error);
    }
  };

  const copyCheckInUrl = (code: string) => {
    const url = `${window.location.origin}/check-in/${code}`;
    navigator.clipboard.writeText(url);
    toast.success("Check-in URL copied to clipboard");
  };

  const checkOutVisitor = async (visitId: string) => {
    try {
      const { error } = await supabase
        .from("site_visits")
        .update({ checked_out_at: new Date().toISOString() })
        .eq("id", visitId);

      if (error) throw error;

      setVisits(visits.map(visit => 
        visit.id === visitId ? { ...visit, checked_out_at: new Date().toISOString() } : visit
      ));
      toast.success("Visitor checked out");
    } catch (error: any) {
      toast.error("Failed to check out visitor");
      console.error(error);
    }
  };

  const activeVisits = visits.filter(v => !v.checked_out_at);
  const completedVisits = visits.filter(v => v.checked_out_at);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Site Access</h1>
            <p className="text-muted-foreground">
              Manage QR codes and track site visitors
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Access Code
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Access Code</DialogTitle>
                <DialogDescription>
                  Generate a QR code for site check-in
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="project">Project</Label>
                  <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Access Point Name</Label>
                  <Input
                    id="name"
                    value={newCodeName}
                    onChange={(e) => setNewCodeName(e.target.value)}
                    placeholder="e.g., Main Entrance, Gate 2"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createAccessCode}>Create Code</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <QrCode className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{accessCodes.length}</p>
                  <p className="text-sm text-muted-foreground">Access Codes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <Users className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeVisits.length}</p>
                  <p className="text-sm text-muted-foreground">On Site Now</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <Clock className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{visits.length}</p>
                  <p className="text-sm text-muted-foreground">Total Visits</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-accent/10 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {accessCodes.filter(c => c.is_active).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Active Codes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="codes" className="space-y-4">
          <TabsList>
            <TabsTrigger value="codes">Access Codes</TabsTrigger>
            <TabsTrigger value="onsite">On Site ({activeVisits.length})</TabsTrigger>
            <TabsTrigger value="history">Visit History</TabsTrigger>
          </TabsList>

          {/* Access Codes Tab */}
          <TabsContent value="codes">
            <Card>
              <CardHeader>
                <CardTitle>QR Access Codes</CardTitle>
                <CardDescription>
                  Visitors scan these codes to check in at your sites
                </CardDescription>
              </CardHeader>
              <CardContent>
                {accessCodes.length === 0 ? (
                  <div className="text-center py-12">
                    <QrCode className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No access codes yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Create your first QR code for site check-in
                    </p>
                    <Button onClick={() => setCreateDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Access Code
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {accessCodes.map(code => (
                      <Card key={code.id} className="relative">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="font-semibold">{code.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {code.project.name}
                              </p>
                            </div>
                            <Badge variant={code.is_active ? "default" : "secondary"}>
                              {code.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>

                          {/* QR Code Placeholder */}
                          <div className="bg-muted rounded-lg p-4 flex items-center justify-center mb-4">
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                                `${window.location.origin}/check-in/${code.code}`
                              )}`}
                              alt="QR Code"
                              className="rounded"
                            />
                          </div>

                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => copyCheckInUrl(code.code)}
                            >
                              <Copy className="h-4 w-4 mr-1" />
                              Copy Link
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => window.open(`/check-in/${code.code}`, "_blank")}
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              Preview
                            </Button>
                          </div>

                          <div className="flex gap-2 mt-2">
                            <Button
                              variant={code.is_active ? "secondary" : "default"}
                              size="sm"
                              className="flex-1"
                              onClick={() => toggleCodeStatus(code.id, code.is_active)}
                            >
                              {code.is_active ? "Deactivate" : "Activate"}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteAccessCode(code.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* On Site Tab */}
          <TabsContent value="onsite">
            <Card>
              <CardHeader>
                <CardTitle>Currently On Site</CardTitle>
                <CardDescription>
                  Visitors who have checked in but not yet checked out
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activeVisits.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No visitors on site</h3>
                    <p className="text-muted-foreground">
                      Active visitors will appear here when they check in
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Visitor</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Checked In</TableHead>
                        <TableHead>Induction</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeVisits.map(visit => (
                        <TableRow key={visit.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{visit.visitor_name}</p>
                              {visit.visitor_email && (
                                <p className="text-sm text-muted-foreground">
                                  {visit.visitor_email}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{visit.visitor_company || "-"}</TableCell>
                          <TableCell>{visit.project.name}</TableCell>
                          <TableCell>
                            {format(new Date(visit.checked_in_at), "HH:mm, dd MMM")}
                          </TableCell>
                          <TableCell>
                            {visit.has_signed_induction ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => checkOutVisitor(visit.id)}
                            >
                              Check Out
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Visit History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Visit History</CardTitle>
                <CardDescription>
                  Complete record of all site visits
                </CardDescription>
              </CardHeader>
              <CardContent>
                {completedVisits.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No visit history</h3>
                    <p className="text-muted-foreground">
                      Completed visits will appear here
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Visitor</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Purpose</TableHead>
                        <TableHead>Check In</TableHead>
                        <TableHead>Check Out</TableHead>
                        <TableHead>Duration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {completedVisits.map(visit => {
                        const checkIn = new Date(visit.checked_in_at);
                        const checkOut = visit.checked_out_at ? new Date(visit.checked_out_at) : null;
                        const duration = checkOut 
                          ? Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60))
                          : null;

                        return (
                          <TableRow key={visit.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{visit.visitor_name}</p>
                                {visit.visitor_email && (
                                  <p className="text-sm text-muted-foreground">
                                    {visit.visitor_email}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{visit.visitor_company || "-"}</TableCell>
                            <TableCell>{visit.project.name}</TableCell>
                            <TableCell>{visit.purpose || "-"}</TableCell>
                            <TableCell>
                              {format(checkIn, "HH:mm, dd MMM")}
                            </TableCell>
                            <TableCell>
                              {checkOut ? format(checkOut, "HH:mm, dd MMM") : "-"}
                            </TableCell>
                            <TableCell>
                              {duration !== null ? (
                                duration < 60 
                                  ? `${duration} min` 
                                  : `${Math.floor(duration / 60)}h ${duration % 60}m`
                              ) : "-"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
