import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Bell, Mail, MessageSquare, Shield, FileText, Users, Save, Loader2 } from "lucide-react";

interface NotificationPreference {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  email: boolean;
  push: boolean;
}

export default function NotificationSettings() {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([
    {
      id: "site_visits",
      label: "Site Check-ins",
      description: "Get notified when someone checks in or out of your sites",
      icon: Users,
      email: true,
      push: true,
    },
    {
      id: "documents",
      label: "Document Updates",
      description: "Notifications for document uploads, approvals, and expirations",
      icon: FileText,
      email: true,
      push: false,
    },
    {
      id: "team",
      label: "Team Activity",
      description: "Updates about team member invitations and role changes",
      icon: Users,
      email: true,
      push: false,
    },
    {
      id: "security",
      label: "Security Alerts",
      description: "Important security notifications and login alerts",
      icon: Shield,
      email: true,
      push: true,
    },
    {
      id: "marketing",
      label: "Product Updates",
      description: "News about new features and product improvements",
      icon: MessageSquare,
      email: false,
      push: false,
    },
  ]);

  const togglePreference = (id: string, channel: "email" | "push") => {
    setPreferences((prev) =>
      prev.map((pref) =>
        pref.id === id ? { ...pref, [channel]: !pref[channel] } : pref
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    // In a real app, this would save to the database
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    toast({
      title: "Preferences saved",
      description: "Your notification preferences have been updated",
    });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Choose how you want to be notified about activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Header Row */}
            <div className="flex items-center justify-end gap-8 text-sm font-medium text-muted-foreground">
              <div className="flex items-center gap-2 w-20 justify-center">
                <Mail className="h-4 w-4" />
                <span>Email</span>
              </div>
              <div className="flex items-center gap-2 w-20 justify-center">
                <Bell className="h-4 w-4" />
                <span>Push</span>
              </div>
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
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-full bg-muted">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <Label htmlFor={`${pref.id}-email`} className="text-base font-medium">
                          {pref.label}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {pref.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="w-20 flex justify-center">
                        <Switch
                          id={`${pref.id}-email`}
                          checked={pref.email}
                          onCheckedChange={() => togglePreference(pref.id, "email")}
                        />
                      </div>
                      <div className="w-20 flex justify-center">
                        <Switch
                          id={`${pref.id}-push`}
                          checked={pref.push}
                          onCheckedChange={() => togglePreference(pref.id, "push")}
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

      {/* Email Digest */}
      <Card>
        <CardHeader>
          <CardTitle>Email Digest</CardTitle>
          <CardDescription>
            Receive a summary of activity instead of individual emails
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Weekly Summary</p>
              <p className="text-sm text-muted-foreground">
                Get a weekly email with all your site activity
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
