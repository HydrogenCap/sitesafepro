import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import {
  MessageSquare,
  ExternalLink,
  CheckCircle,
  XCircle,
  Loader2,
  Send,
  AlertCircle,
  Settings,
  BarChart3,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

interface WhatsAppMessage {
  id: string;
  recipient_number: string;
  template_name: string;
  status: string;
  sent_at: string;
  delivered_at: string | null;
  read_at: string | null;
  error_message: string | null;
}

interface MessageStats {
  total: number;
  delivered: number;
  read: number;
  failed: number;
}

export default function WhatsAppSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { canAccess, organisation } = useSubscription();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [dailyLimit, setDailyLimit] = useState(50);
  const [isConfigured, setIsConfigured] = useState(false);
  
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [stats, setStats] = useState<MessageStats>({ total: 0, delivered: 0, read: 0, failed: 0 });

  // Check if user has Professional+ tier
  const hasAccess = canAccess('permits_to_work'); // Professional feature gate

  useEffect(() => {
    if (organisation?.id) {
      fetchSettings();
      fetchMessages();
    }
  }, [organisation?.id]);

  const fetchSettings = async () => {
    if (!organisation?.id) return;
    
    try {
      const { data, error } = await supabase
        .from("organisations")
        .select("whatsapp_enabled, whatsapp_daily_limit")
        .eq("id", organisation.id)
        .single();

      if (error) throw error;

      setWhatsappEnabled(data?.whatsapp_enabled || false);
      setDailyLimit(data?.whatsapp_daily_limit || 50);
      
      // Check if API is configured by testing the endpoint
      checkConfiguration();
    } catch (error) {
      console.error("Error fetching WhatsApp settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkConfiguration = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("send-whatsapp", {
        body: {
          recipientNumber: "test",
          templateName: "test",
          organisationId: organisation?.id,
        },
      });

      // If we get "NOT_CONFIGURED", credentials aren't set
      setIsConfigured(data?.code !== "NOT_CONFIGURED");
    } catch {
      setIsConfigured(false);
    }
  };

  const fetchMessages = async () => {
    if (!organisation?.id) return;

    try {
      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("organisation_id", organisation.id)
        .order("sent_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      setMessages(data || []);

      // Calculate stats
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: statsData } = await supabase
        .from("whatsapp_messages")
        .select("status")
        .eq("organisation_id", organisation.id)
        .gte("sent_at", thirtyDaysAgo.toISOString());

      if (statsData) {
        const stats: MessageStats = {
          total: statsData.length,
          delivered: statsData.filter((m) => m.status === "delivered" || m.status === "read").length,
          read: statsData.filter((m) => m.status === "read").length,
          failed: statsData.filter((m) => m.status === "failed").length,
        };
        setStats(stats);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const handleSave = async () => {
    if (!organisation?.id) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("organisations")
        .update({
          whatsapp_enabled: whatsappEnabled,
          whatsapp_daily_limit: dailyLimit,
        })
        .eq("id", organisation.id);

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: "WhatsApp settings have been updated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestMessage = async () => {
    if (!user?.email) return;
    
    setTesting(true);
    toast({
      title: "Test message",
      description: "To test WhatsApp, you need to configure API credentials first. See the setup guide below.",
    });
    setTesting(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "read":
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case "delivered":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "sent":
        return <CheckCircle className="h-4 w-4 text-muted-foreground" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "rate_limited":
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      default:
        return null;
    }
  };

  const formatTemplateName = (name: string) => {
    return name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (!hasAccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-600" />
            WhatsApp Notifications
          </CardTitle>
          <CardDescription>
            Send safety alerts via WhatsApp for faster response times
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Professional Feature</h3>
            <p className="text-muted-foreground mb-4">
              WhatsApp notifications are available on Professional and Enterprise plans.
            </p>
            <Button onClick={() => toast({ title: "Upgrade", description: "Visit Subscription settings to upgrade" })}>
              Upgrade to Professional
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

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
      {/* Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-600" />
            WhatsApp Business API
          </CardTitle>
          <CardDescription>
            Send safety alerts and document requests to contractors via WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isConfigured ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/50 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="space-y-2">
                  <h4 className="font-semibold text-amber-800 dark:text-amber-200">
                    API Credentials Required
                  </h4>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    To enable WhatsApp notifications, you need to set up the Meta Cloud API credentials.
                  </p>
                  <div className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                    <p>Required secrets to configure:</p>
                    <ul className="list-disc list-inside ml-2 space-y-1">
                      <li><code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">WHATSAPP_ACCESS_TOKEN</code></li>
                      <li><code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">WHATSAPP_PHONE_NUMBER_ID</code></li>
                      <li><code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">WHATSAPP_WEBHOOK_VERIFY_TOKEN</code></li>
                    </ul>
                  </div>
                  <Button variant="outline" size="sm" asChild className="mt-2">
                    <a
                      href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Setup Guide
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-900">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">
                  WhatsApp API Connected
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Your WhatsApp Business API is configured and ready to send notifications.
                </p>
              </div>
            </div>
          )}

          <Separator />

          {/* Enable Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="whatsapp-enabled" className="text-base font-medium">
                Enable WhatsApp Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Send notifications via WhatsApp when enabled
              </p>
            </div>
            <Switch
              id="whatsapp-enabled"
              checked={whatsappEnabled}
              onCheckedChange={setWhatsappEnabled}
              disabled={!isConfigured}
            />
          </div>

          {/* Daily Limit */}
          <div className="space-y-2">
            <Label htmlFor="daily-limit">Daily Message Limit</Label>
            <div className="flex items-center gap-4">
              <Input
                id="daily-limit"
                type="number"
                min={10}
                max={500}
                value={dailyLimit}
                onChange={(e) => setDailyLimit(parseInt(e.target.value) || 50)}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">
                messages per day (prevents accidental spam)
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Settings className="h-4 w-4 mr-2" />
              )}
              Save Settings
            </Button>
            {isConfigured && (
              <Button variant="outline" onClick={handleTestMessage} disabled={testing}>
                {testing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Test
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Message Stats */}
      {whatsappEnabled && messages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Message Statistics (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Sent</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-950/50">
                <p className="text-2xl font-bold text-green-600">
                  {stats.total > 0 ? Math.round((stats.delivered / stats.total) * 100) : 0}%
                </p>
                <p className="text-sm text-muted-foreground">Delivered</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-950/50">
                <p className="text-2xl font-bold text-blue-600">
                  {stats.total > 0 ? Math.round((stats.read / stats.total) * 100) : 0}%
                </p>
                <p className="text-sm text-muted-foreground">Read</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-950/50">
                <p className="text-2xl font-bold text-destructive">{stats.failed}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Message Log */}
      {whatsappEnabled && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Messages</CardTitle>
            <CardDescription>
              Log of WhatsApp notifications sent from your organisation
            </CardDescription>
          </CardHeader>
          <CardContent>
            {messages.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No messages sent yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.map((msg) => (
                    <TableRow key={msg.id}>
                      <TableCell className="font-mono text-sm">
                        {msg.recipient_number.replace(/(\d{2})(\d+)(\d{4})/, "$1****$3")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {formatTemplateName(msg.template_name)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(msg.status)}
                          <span className="capitalize">{msg.status}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(msg.sent_at), "dd MMM HH:mm")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
