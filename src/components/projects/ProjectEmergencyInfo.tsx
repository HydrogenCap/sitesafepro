import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Ambulance,
  Flame,
  Shield,
  Phone,
  MapPin,
  Edit,
  HeartPulse,
  Users,
} from "lucide-react";
import { toast } from "sonner";

interface EmergencyInfo {
  nearest_ae_name?: string | null;
  nearest_ae_address?: string | null;
  nearest_ae_distance?: string | null;
  nearest_fire_station_name?: string | null;
  nearest_fire_station_address?: string | null;
  nearest_police_station_name?: string | null;
  nearest_police_station_address?: string | null;
  site_emergency_number?: string | null;
  first_aider_name?: string | null;
  fire_warden_name?: string | null;
}

interface Props {
  projectId: string;
  emergencyInfo: EmergencyInfo;
  onUpdate: () => void;
}

export const ProjectEmergencyInfo = ({ projectId, emergencyInfo, onUpdate }: Props) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EmergencyInfo>(emergencyInfo);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({
          nearest_ae_name: form.nearest_ae_name || null,
          nearest_ae_address: form.nearest_ae_address || null,
          nearest_ae_distance: form.nearest_ae_distance || null,
          nearest_fire_station_name: form.nearest_fire_station_name || null,
          nearest_fire_station_address: form.nearest_fire_station_address || null,
          nearest_police_station_name: form.nearest_police_station_name || null,
          nearest_police_station_address: form.nearest_police_station_address || null,
          site_emergency_number: form.site_emergency_number || null,
          first_aider_name: form.first_aider_name || null,
          fire_warden_name: form.fire_warden_name || null,
        })
        .eq("id", projectId);

      if (error) throw error;
      toast.success("Emergency information updated");
      setDialogOpen(false);
      onUpdate();
    } catch (error) {
      console.error("Error saving emergency info:", error);
      toast.error("Failed to save emergency information");
    } finally {
      setSaving(false);
    }
  };

  const hasAnyInfo = 
    emergencyInfo.nearest_ae_name || 
    emergencyInfo.nearest_fire_station_name || 
    emergencyInfo.nearest_police_station_name ||
    emergencyInfo.site_emergency_number ||
    emergencyInfo.first_aider_name ||
    emergencyInfo.fire_warden_name;

  const EmergencyCard = ({
    icon: Icon,
    title,
    name,
    address,
    distance,
    iconColor,
  }: {
    icon: any;
    title: string;
    name?: string | null;
    address?: string | null;
    distance?: string | null;
    iconColor: string;
  }) => {
    if (!name && !address) return null;
    return (
      <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${iconColor}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          {name && <p className="text-sm text-muted-foreground">{name}</p>}
          {address && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" />
              {address}
            </p>
          )}
          {distance && (
            <p className="text-xs text-muted-foreground mt-0.5">{distance}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl p-6 shadow-sm border border-border"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Emergency Information</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" onClick={() => setForm(emergencyInfo)}>
              <Edit className="h-4 w-4 mr-2" />
              {hasAnyInfo ? "Edit" : "Add"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Emergency Information</DialogTitle>
              <DialogDescription>
                Configure emergency contacts and nearest emergency services for this site.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Site Emergency */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Phone className="h-4 w-4 text-destructive" />
                  Site Emergency
                </h4>
                <div className="grid gap-3">
                  <div>
                    <Label htmlFor="site_emergency_number">Emergency Number</Label>
                    <Input
                      id="site_emergency_number"
                      value={form.site_emergency_number || ""}
                      onChange={(e) => setForm({ ...form, site_emergency_number: e.target.value })}
                      placeholder="e.g. 07700 900000"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="first_aider_name">First Aider</Label>
                      <Input
                        id="first_aider_name"
                        value={form.first_aider_name || ""}
                        onChange={(e) => setForm({ ...form, first_aider_name: e.target.value })}
                        placeholder="Name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="fire_warden_name">Fire Warden</Label>
                      <Input
                        id="fire_warden_name"
                        value={form.fire_warden_name || ""}
                        onChange={(e) => setForm({ ...form, fire_warden_name: e.target.value })}
                        placeholder="Name"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* A&E */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Ambulance className="h-4 w-4 text-destructive" />
                  Nearest A&E
                </h4>
                <div className="grid gap-3">
                  <div>
                    <Label htmlFor="nearest_ae_name">Hospital Name</Label>
                    <Input
                      id="nearest_ae_name"
                      value={form.nearest_ae_name || ""}
                      onChange={(e) => setForm({ ...form, nearest_ae_name: e.target.value })}
                      placeholder="e.g. Royal London Hospital"
                    />
                  </div>
                  <div>
                    <Label htmlFor="nearest_ae_address">Address</Label>
                    <Input
                      id="nearest_ae_address"
                      value={form.nearest_ae_address || ""}
                      onChange={(e) => setForm({ ...form, nearest_ae_address: e.target.value })}
                      placeholder="Full address"
                    />
                  </div>
                  <div>
                    <Label htmlFor="nearest_ae_distance">Distance/Time</Label>
                    <Input
                      id="nearest_ae_distance"
                      value={form.nearest_ae_distance || ""}
                      onChange={(e) => setForm({ ...form, nearest_ae_distance: e.target.value })}
                      placeholder="e.g. 2.5 miles / 8 mins by car"
                    />
                  </div>
                </div>
              </div>

              {/* Fire Station */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Flame className="h-4 w-4 text-warning" />
                  Nearest Fire Station
                </h4>
                <div className="grid gap-3">
                  <div>
                    <Label htmlFor="nearest_fire_station_name">Station Name</Label>
                    <Input
                      id="nearest_fire_station_name"
                      value={form.nearest_fire_station_name || ""}
                      onChange={(e) => setForm({ ...form, nearest_fire_station_name: e.target.value })}
                      placeholder="e.g. Whitechapel Fire Station"
                    />
                  </div>
                  <div>
                    <Label htmlFor="nearest_fire_station_address">Address</Label>
                    <Input
                      id="nearest_fire_station_address"
                      value={form.nearest_fire_station_address || ""}
                      onChange={(e) => setForm({ ...form, nearest_fire_station_address: e.target.value })}
                      placeholder="Full address"
                    />
                  </div>
                </div>
              </div>

              {/* Police Station */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Nearest Police Station
                </h4>
                <div className="grid gap-3">
                  <div>
                    <Label htmlFor="nearest_police_station_name">Station Name</Label>
                    <Input
                      id="nearest_police_station_name"
                      value={form.nearest_police_station_name || ""}
                      onChange={(e) => setForm({ ...form, nearest_police_station_name: e.target.value })}
                      placeholder="e.g. Bethnal Green Police Station"
                    />
                  </div>
                  <div>
                    <Label htmlFor="nearest_police_station_address">Address</Label>
                    <Input
                      id="nearest_police_station_address"
                      value={form.nearest_police_station_address || ""}
                      onChange={(e) => setForm({ ...form, nearest_police_station_address: e.target.value })}
                      placeholder="Full address"
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {hasAnyInfo ? (
        <div className="grid gap-3 md:grid-cols-2">
          {/* Site emergency contacts */}
          {(emergencyInfo.site_emergency_number || emergencyInfo.first_aider_name || emergencyInfo.fire_warden_name) && (
            <div className="flex items-start gap-3 p-3 bg-destructive/10 rounded-lg md:col-span-2">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-destructive/20">
                <Phone className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1 grid gap-2 sm:grid-cols-3">
                {emergencyInfo.site_emergency_number && (
                  <div>
                    <p className="text-xs text-muted-foreground">Site Emergency</p>
                    <p className="text-sm font-semibold text-foreground">{emergencyInfo.site_emergency_number}</p>
                  </div>
                )}
                {emergencyInfo.first_aider_name && (
                  <div className="flex items-center gap-2">
                    <HeartPulse className="h-4 w-4 text-destructive" />
                    <div>
                      <p className="text-xs text-muted-foreground">First Aider</p>
                      <p className="text-sm font-medium text-foreground">{emergencyInfo.first_aider_name}</p>
                    </div>
                  </div>
                )}
                {emergencyInfo.fire_warden_name && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-warning" />
                    <div>
                      <p className="text-xs text-muted-foreground">Fire Warden</p>
                      <p className="text-sm font-medium text-foreground">{emergencyInfo.fire_warden_name}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <EmergencyCard
            icon={Ambulance}
            title="Nearest A&E"
            name={emergencyInfo.nearest_ae_name}
            address={emergencyInfo.nearest_ae_address}
            distance={emergencyInfo.nearest_ae_distance}
            iconColor="bg-destructive/10 text-destructive"
          />
          <EmergencyCard
            icon={Flame}
            title="Fire Station"
            name={emergencyInfo.nearest_fire_station_name}
            address={emergencyInfo.nearest_fire_station_address}
            iconColor="bg-warning/10 text-warning"
          />
          <EmergencyCard
            icon={Shield}
            title="Police Station"
            name={emergencyInfo.nearest_police_station_name}
            address={emergencyInfo.nearest_police_station_address}
            iconColor="bg-primary/10 text-primary"
          />
        </div>
      ) : (
        <div className="text-center py-6 text-muted-foreground">
          <Ambulance className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No emergency information configured</p>
          <p className="text-xs mt-1">Add nearest A&E, fire station, and emergency contacts</p>
        </div>
      )}
    </motion.div>
  );
};
