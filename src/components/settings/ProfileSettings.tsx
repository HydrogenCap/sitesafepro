import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { Loader2, Upload, User, Mail, Phone, Save, MessageSquare } from "lucide-react";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  whatsapp_number: string | null;
  whatsapp_opted_in: boolean;
  whatsapp_opted_in_at: string | null;
}

export default function ProfileSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { organisation } = useSubscription();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orgWhatsappEnabled, setOrgWhatsappEnabled] = useState(false);
  useEffect(() => {
    if (user) {
      fetchProfile();
    }
    if (organisation?.id) {
      checkOrgWhatsapp();
    }
  }, [user, organisation?.id]);

  const checkOrgWhatsapp = async () => {
    if (!organisation?.id) return;
    const { data } = await supabase
      .from("organisations")
      .select("whatsapp_enabled")
      .eq("id", organisation.id)
      .single();
    setOrgWhatsappEnabled(data?.whatsapp_enabled || false);
  };

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      const updateData: Record<string, unknown> = {
        full_name: profile.full_name,
        phone: profile.phone,
        whatsapp_number: profile.whatsapp_number,
        whatsapp_opted_in: profile.whatsapp_opted_in,
      };
      
      // Set opt-in timestamp when opting in
      if (profile.whatsapp_opted_in && !profile.whatsapp_opted_in_at) {
        updateData.whatsapp_opted_in_at = new Date().toISOString();
      } else if (!profile.whatsapp_opted_in) {
        updateData.whatsapp_opted_in_at = null;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", user?.id);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully",
      });
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "Failed to save profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Avatar must be less than 2MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("documents")
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: urlData.publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setProfile((prev) => prev ? { ...prev, avatar_url: urlData.publicUrl } : null);

      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated",
      });
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload avatar",
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

  return (
    <div className="space-y-6">
      {/* Avatar Section */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
          <CardDescription>
            Upload a photo to personalize your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="text-2xl">
                {profile?.full_name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <Label htmlFor="avatar-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted transition-colors">
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  <span>{uploading ? "Uploading..." : "Upload new photo"}</span>
                </div>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                />
              </Label>
              <p className="text-sm text-muted-foreground mt-2">
                JPG, PNG or GIF. Max 2MB.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Info Section */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>
            Update your personal details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  value={profile?.full_name || ""}
                  onChange={(e) => setProfile((prev) => prev ? { ...prev, full_name: e.target.value } : null)}
                  className="pl-10"
                  placeholder="Your full name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  value={profile?.email || ""}
                  disabled
                  className="pl-10 bg-muted"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={profile?.phone || ""}
                  onChange={(e) => setProfile((prev) => prev ? { ...prev, phone: e.target.value } : null)}
                  className="pl-10"
                  placeholder="+44 7700 900000"
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

      {/* WhatsApp Opt-In Section */}
      {orgWhatsappEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-600" />
              WhatsApp Notifications
            </CardTitle>
            <CardDescription>
              Receive safety alerts and document requests via WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="whatsappNumber"
                  value={profile?.whatsapp_number || profile?.phone || ""}
                  onChange={(e) => setProfile((prev) => prev ? { ...prev, whatsapp_number: e.target.value } : null)}
                  className="pl-10"
                  placeholder="+44 7700 900000"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Include country code (e.g., +44 for UK)
              </p>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/50">
              <Switch
                id="whatsapp-optin"
                checked={profile?.whatsapp_opted_in || false}
                onCheckedChange={(checked) => 
                  setProfile((prev) => prev ? { 
                    ...prev, 
                    whatsapp_opted_in: checked,
                    whatsapp_number: prev.whatsapp_number || prev.phone 
                  } : null)
                }
              />
              <div className="space-y-1">
                <Label htmlFor="whatsapp-optin" className="font-medium cursor-pointer">
                  I agree to receive WhatsApp notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  You'll receive safety alerts including document signature requests, corrective action 
                  assignments, overdue reminders, and permit expiry notifications. You can opt out at any time.
                </p>
              </div>
            </div>

            {profile?.whatsapp_opted_in && profile?.whatsapp_opted_in_at && (
              <p className="text-xs text-muted-foreground">
                Opted in on {new Date(profile.whatsapp_opted_in_at).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
