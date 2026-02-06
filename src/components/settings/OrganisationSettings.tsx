import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Building2, MapPin, Phone, Palette, Save, Globe } from "lucide-react";

interface Organisation {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  logo_url: string | null;
  primary_colour: string | null;
}

export default function OrganisationSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (user) {
      fetchOrganisation();
    }
  }, [user]);

  const fetchOrganisation = async () => {
    try {
      // Get user's organisation membership
      const { data: memberData, error: memberError } = await supabase
        .from("organisation_members")
        .select("organisation_id, role")
        .eq("profile_id", user?.id)
        .eq("status", "active")
        .single();

      if (memberError) throw memberError;

      setIsOwner(memberData.role === "owner");

      // Get organisation details
      const { data: orgData, error: orgError } = await supabase
        .from("organisations")
        .select("id, name, slug, address, phone, logo_url, primary_colour")
        .eq("id", memberData.organisation_id)
        .single();

      if (orgError) throw orgError;
      setOrganisation(orgData);
    } catch (error: any) {
      console.error("Error fetching organisation:", error);
      toast({
        title: "Error",
        description: "Failed to load organisation details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!organisation || !isOwner) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("organisations")
        .update({
          name: organisation.name,
          address: organisation.address,
          phone: organisation.phone,
          primary_colour: organisation.primary_colour,
        })
        .eq("id", organisation.id);

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: "Organisation details have been updated",
      });
    } catch (error: any) {
      console.error("Error saving organisation:", error);
      toast({
        title: "Error",
        description: "Failed to save organisation settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !organisation) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Logo must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${organisation.id}/logo.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("documents")
        .getPublicUrl(filePath);

      // Update organisation
      const { error: updateError } = await supabase
        .from("organisations")
        .update({ logo_url: urlData.publicUrl })
        .eq("id", organisation.id);

      if (updateError) throw updateError;

      setOrganisation((prev) => prev ? { ...prev, logo_url: urlData.publicUrl } : null);

      toast({
        title: "Logo updated",
        description: "Your organisation logo has been updated",
      });
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload logo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
          <p className="text-muted-foreground">
            Only organisation owners can modify these settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Logo & Branding */}
      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>
            Customize your organisation's appearance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Upload */}
          <div className="flex items-start gap-6">
            <div className="h-24 w-24 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center overflow-hidden bg-muted">
              {organisation?.logo_url ? (
                <img
                  src={organisation.logo_url}
                  alt="Organisation logo"
                  className="h-full w-full object-contain"
                />
              ) : (
                <Building2 className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
            <div>
              <Label htmlFor="logo-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted transition-colors">
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  <span>{uploading ? "Uploading..." : "Upload logo"}</span>
                </div>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                  disabled={uploading}
                />
              </Label>
              <p className="text-sm text-muted-foreground mt-2">
                Recommended: 512x512px PNG or SVG. Max 5MB.
              </p>
            </div>
          </div>

          {/* Brand Colour */}
          <div className="space-y-2">
            <Label htmlFor="primaryColour">Brand Colour</Label>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Palette className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="primaryColour"
                  value={organisation?.primary_colour || "#0F766E"}
                  onChange={(e) => setOrganisation((prev) => prev ? { ...prev, primary_colour: e.target.value } : null)}
                  className="pl-10 w-40"
                  placeholder="#0F766E"
                />
              </div>
              <input
                type="color"
                value={organisation?.primary_colour || "#0F766E"}
                onChange={(e) => setOrganisation((prev) => prev ? { ...prev, primary_colour: e.target.value } : null)}
                className="h-10 w-10 rounded border cursor-pointer"
              />
              <div
                className="h-10 w-24 rounded border"
                style={{ backgroundColor: organisation?.primary_colour || "#0F766E" }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              This colour will be used in QR codes and visitor check-in pages
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Organisation Details */}
      <Card>
        <CardHeader>
          <CardTitle>Organisation Details</CardTitle>
          <CardDescription>
            Basic information about your organisation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organisation Name</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="orgName"
                  value={organisation?.name || ""}
                  onChange={(e) => setOrganisation((prev) => prev ? { ...prev, name: e.target.value } : null)}
                  className="pl-10"
                  placeholder="Company Ltd"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="orgSlug">URL Slug</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="orgSlug"
                  value={organisation?.slug || ""}
                  disabled
                  className="pl-10 bg-muted"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                URL slug cannot be changed
              </p>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="orgAddress">Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="orgAddress"
                  value={organisation?.address || ""}
                  onChange={(e) => setOrganisation((prev) => prev ? { ...prev, address: e.target.value } : null)}
                  className="pl-10"
                  placeholder="123 Business Street, London, EC1A 1BB"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="orgPhone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="orgPhone"
                  value={organisation?.phone || ""}
                  onChange={(e) => setOrganisation((prev) => prev ? { ...prev, phone: e.target.value } : null)}
                  className="pl-10"
                  placeholder="+44 20 7946 0958"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
