import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Download,
  ClipboardCheck,
  Calendar,
  Building,
  MapPin,
  User,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Minus,
  ImageIcon,
  Loader2,
  Camera,
  Upload,
} from "lucide-react";
import { format } from "date-fns";

const INSPECTION_TYPES: Record<string, string> = {
  scaffold: "Scaffold Inspection",
  excavation: "Excavation Inspection",
  lifting_equipment: "Lifting Equipment",
  electrical: "Electrical Inspection",
  fire_safety: "Fire Safety",
  housekeeping: "Housekeeping",
  ppe_compliance: "PPE Compliance",
  general_site: "General Site",
};

const RESULT_CONFIG: Record<string, { label: string; variant: "default" | "destructive" | "outline" | "secondary"; icon: typeof CheckCircle }> = {
  pass: { label: "Pass", variant: "default", icon: CheckCircle },
  fail: { label: "Fail", variant: "destructive", icon: XCircle },
  requires_action: { label: "Requires Action", variant: "outline", icon: AlertTriangle },
  not_applicable: { label: "N/A", variant: "secondary", icon: Minus },
};

export default function InspectionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [exporting, setExporting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const { data: inspection, isLoading } = useQuery({
    queryKey: ["inspection", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inspections")
        .select(`
          *,
          project:projects(name),
          inspector:profiles!inspections_inspector_id_fkey(full_name, email)
        `)
        .eq("id", id!)
        .single();

      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });

  const { data: checklistItems = [] } = useQuery({
    queryKey: ["inspection-items", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inspection_items")
        .select("*")
        .eq("inspection_id", id!)
        .order("item_number", { ascending: true });

      if (error) throw error;
      return data as any[];
    },
    enabled: !!id,
  });

  const handleExportPdf = async () => {
    if (!inspection) return;
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("export-inspection-pdf", {
        body: { inspectionId: inspection.id },
      });

      if (error) throw error;

      if (data?.html) {
        // Open HTML in new window for print/save as PDF
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(data.html);
          printWindow.document.close();
          setTimeout(() => printWindow.print(), 500);
        }
      }

      toast({ title: "PDF ready", description: "Use your browser's print dialog to save as PDF." });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !inspection) return;
    setUploading(true);
    try {
      const newPaths: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${inspection.organisation_id}/inspections/${inspection.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("documents").upload(path, file);
        if (uploadError) throw uploadError;
        newPaths.push(path);
      }

      const existingPhotos: string[] = inspection.photos ?? [];
      const { error: updateError } = await supabase
        .from("inspections")
        .update({ photos: [...existingPhotos, ...newPaths] } as any)
        .eq("id", inspection.id);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ["inspection", id] });
      toast({ title: "Photos uploaded", description: `${newPaths.length} photo(s) added successfully.` });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!inspection) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Inspection not found</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate("/inspections")}>
                Back to Inspections
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const resultConfig = inspection.overall_result ? RESULT_CONFIG[inspection.overall_result] : null;
  const ResultIcon = resultConfig?.icon ?? ClipboardCheck;
  const photos: string[] = inspection.photos ?? [];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/inspections")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold">{inspection.title}</h1>
                {resultConfig && (
                  <Badge variant={resultConfig.variant} className="text-sm">
                    {resultConfig.label}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground mt-1">
                {inspection.inspection_number} • {INSPECTION_TYPES[inspection.inspection_type] ?? inspection.inspection_type}
              </p>
            </div>
          </div>
          <Button onClick={handleExportPdf} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Export PDF
          </Button>
        </div>

        {/* Details Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Inspection Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {inspection.project && (
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Project</p>
                  <p className="font-medium">{inspection.project.name}</p>
                </div>
              </div>
            )}
            {inspection.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{inspection.location}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Inspection Date</p>
                <p className="font-medium">{format(new Date(inspection.inspection_date), "dd MMM yyyy")}</p>
              </div>
            </div>
            {inspection.next_inspection_date && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Next Inspection Due</p>
                  <p className="font-medium">{format(new Date(inspection.next_inspection_date), "dd MMM yyyy")}</p>
                </div>
              </div>
            )}
            {inspection.inspector && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Inspector</p>
                  <p className="font-medium">{inspection.inspector.full_name}</p>
                </div>
              </div>
            )}
            {inspection.completed_at && (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="font-medium">{format(new Date(inspection.completed_at), "dd MMM yyyy HH:mm")}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Description */}
        {inspection.description && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{inspection.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Checklist */}
        {checklistItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Inspection Checklist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {checklistItems.map((item: any, index: number) => {
                const itemResult = item.result ? RESULT_CONFIG[item.result] : null;
                const ItemIcon = itemResult?.icon ?? Minus;
                return (
                  <div key={item.id} className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0">
                    <div className="mt-0.5">
                      <ItemIcon
                        className={`h-5 w-5 ${
                          item.result === "pass"
                            ? "text-green-600"
                            : item.result === "fail"
                            ? "text-destructive"
                            : item.result === "requires_action"
                            ? "text-yellow-600"
                            : "text-muted-foreground"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {item.item_number}. {item.question}
                      </p>
                      {itemResult && (
                        <Badge variant={itemResult.variant} className="mt-1 text-xs">
                          {itemResult.label}
                        </Badge>
                      )}
                      {item.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Photos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Photos ({photos.length})
              </span>
              <div className="flex gap-2">
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handlePhotoUpload(e.target.files)}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handlePhotoUpload(e.target.files)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Camera className="h-4 w-4 mr-1" />
                  Camera
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                  Upload
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {photos.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {photos.map((photoPath, index) => (
                  <PhotoThumbnail key={index} path={photoPath} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">
                No photos yet. Use the buttons above to add photos.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        {inspection.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Additional Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{inspection.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Corrective Actions */}
        {inspection.corrective_actions && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Corrective Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{inspection.corrective_actions}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

function PhotoThumbnail({ path }: { path: string }) {
  const isFullUrl = path.startsWith("http://") || path.startsWith("https://");

  const { data: url } = useQuery({
    queryKey: ["photo-url", path],
    queryFn: async () => {
      if (isFullUrl) return path;
      const { data } = await supabase.storage.from("documents").createSignedUrl(path, 3600);
      return data?.signedUrl ?? null;
    },
  });

  if (!url) {
    return (
      <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
        <ImageIcon className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <img
        src={url}
        alt="Inspection photo"
        className="aspect-square rounded-lg object-cover border hover:opacity-80 transition-opacity cursor-pointer"
        loading="lazy"
      />
    </a>
  );
}
