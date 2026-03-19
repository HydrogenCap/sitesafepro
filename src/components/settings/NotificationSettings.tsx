import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { Bell, Mail, MessageSquare, Save, Loader2, FileText, AlertTriangle, ClipboardCheck, HardHat, FileWarning } from "lucide-react";

interface NotificationPreference {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  emailKey: string;
  pushKey?: string;
  whatsappKey: string;
  email: boolean;
  push?: boolean;
  whatsapp: boolean;
}

export default function NotificationSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { organisation } = useSubscription();
  
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  
  const [preferences, setPreferences] = useState<NotificationPreference[]>([
    {
      id: "document_ack",
      label: "Document Acknowledgement",
      description: "Notifications when documents require your signature",
      icon: FileText,
      emailKey: "document_ack_email",
      pushKey: "document_ack_push",
      whatsappKey: "document_ack_whatsapp",
      email: true,
      push: true,
      whatsapp: true,
    },
    {
      id: "action_assigned",
      label: "Corrective Action Assigned",
      description: "When a corrective action is assigned to you",
      icon: ClipboardCheck,
      emailKey: "action_assigned_email",
      pushKey: "action_assigned_push",
      whatsappKey: "action_assigned_whatsapp",
      email: true,
      push: true,
      whatsapp: true,
    },
    {
      id: "action_overdue",
      label: "Action Overdue",
      description: "Daily reminder for overdue corrective actions",
      icon: AlertTriangle,
      emailKey: "action_overdue_email",
      pushKey: "action_overdue_push",
      whatsappKey: "action_overdue_whatsapp",
      email: true,
      push: true,
      whatsapp: true,
    },
    {
      id: "rams_issued",
      label: "RAMS Issued",
      description: "When new RAMS require your signature",
      icon: FileWarning,
      emailKey: "rams_issued_email",
      whatsappKey: "rams_issued_whatsapp",
      email: true,
      whatsapp: true,
    },
    {
      id: "permit_expiring",
      label: "Permit Expiring",
      description: "Reminders when permits are about to expire",
      icon: HardHat,
      emailKey: "permit_expiring_email",
      pushKey: "permit_expiring_push",
      whatsappKey: "permit_expiring_whatsapp",
      email: true,
      push: true,
      whatsapp: true,
    },
    {
      id: "induction_reminder",
      label: "Site Induction Reminder",
      description: "Reminders to complete site inductions",
      icon: HardHat,
      emailKey: "induction_reminder_email",
      whatsappKey: "induction_reminder_whatsapp",
      email: true,
      whatsapp: true,
    },
  ]);

  useEffect(() => {
    if (user && organisation?.id) {
      fetchPreferences();
      checkWhatsAppEnabled();
    }
  }, [user, organisation?.id]);

  const checkWhatsAppEnabled = async () => {
    if (!organisation?.id) return;
    
    const { data } = await supabase
      .from("organisations")
      .select("whatsapp_enabled")
      .eq("id", organisation.id)
      .single();
    
    setWhatsappEnabled(data?.whatsapp_enabled || false);
  };

  const fetchPreferences = async () => {
    if (!user || !organisation?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("profile_id", user.id)
        .eq("organisation_id", organisation.id)
        .single();

      if (data) {
        setPreferences((prev) =>
          prev.map((pref) => ({
            ...pref,
            email: data[pref.emailKey] ?? true,
            push: pref.pushKey ? (data[pref.pushKey] ?? true) : undefined,
            whatsapp: data[pref.whatsappKey] ?? true,
          }))
        );
      }
    } catch (error) {
      // No preferences yet, use defaults
    } finally {
      setLoading(false);
    }
  };

  const togglePreference = (id: string, channel: "email" | "push" | "whatsapp") => {
    setPreferences((prev) =>
      prev.map((pref) =>
        pref.id === id ? { ...pref, [channel]: !pref[channel] } : pref
      )
    );
  };

  const handleSave = async () => {
    if (!user || !organisation?.id) return;
    
    setSaving(true);
    
    try {
      const prefsToSave: Record<string, boolean> = {};
      preferences.forEach((pref) => {
        prefsToSave[pref.emailKey] = pref.email;
        if (pref.pushKey) {
          prefsToSave[pref.pushKey] = pref.push ?? true;
        }
        prefsToSave[pref.whatsappKey] = pref.whatsapp;
      });

      const { error } = await supabase
        .from("notification_preferences")
        .upsert({
          profile_id: user.id,
          organisation_id: organisation.id,
          ...prefsToSave,
        }, { onConflict: "profile_id,organisation_id" });

      if (error) throw error;
      
      toast({
        title: "Preferences saved",
        description: "Your notification preferences have been updated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save preferences",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Choose how you want to be notified about safety-related activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Header Row */}
            <div className="flex items-center justify-end gap-4 sm:gap-8 text-sm font-medium text-muted-foreground">
              <div className="flex items-center gap-2 w-16 sm:w-20 justify-center">
                <Mail className="h-4 w-4" />
                <span className="hidden sm:inline">Email</span>
              </div>
              <div className="flex items-center gap-2 w-16 sm:w-20 justify-center">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Push</span>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`flex items-center gap-2 w-16 sm:w-20 justify-center ${!whatsappEnabled ? 'opacity-50' : ''}`}>
                    <MessageSquare className="h-4 w-4 text-green-600" />
                    <span className="hidden sm:inline">WhatsApp</span>
                  </div>
                </TooltipTrigger>
                {!whatsappEnabled && (
                  <TooltipContent>
                    <p>WhatsApp not enabled for organisation</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </div>

            {/* Preference Rows */}
            <div className="space-y-4">
              {preferences.map((pref) => {
                const Icon = pref.icon;
                return (
                  <div
                    key={pref.id}
                    className="flex items-center justify-between py-4 border-b last:border-0"
                  >
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="p-2 rounded-full bg-muted shrink-0">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <Label className="text-base font-medium">
                          {pref.label}
                        </Label>
                        <p className="text-sm text-muted-foreground truncate">
                          {pref.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 sm:gap-8 shrink-0">
                      <div className="w-16 sm:w-20 flex justify-center">
                        <Switch
                          checked={pref.email}
                          onCheckedChange={() => togglePreference(pref.id, "email")}
                        />
                      </div>
                      <div className="w-16 sm:w-20 flex justify-center">
                        {pref.pushKey ? (
                          <Switch
                            checked={pref.push}
                            onCheckedChange={() => togglePreference(pref.id, "push")}
                          />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                      <div className="w-16 sm:w-20 flex justify-center">
                        <Switch
                          checked={pref.whatsapp}
                          onCheckedChange={() => togglePreference(pref.id, "whatsapp")}
                          disabled={!whatsappEnabled}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-6">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Preferences
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp Info */}
      {!whatsappEnabled && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <MessageSquare className="h-8 w-8 text-green-600 shrink-0" />
              <div>
                <h3 className="font-semibold">WhatsApp Notifications</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Get critical safety alerts delivered instantly via WhatsApp. Ask your organisation admin to enable WhatsApp in Settings → Integrations.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
