import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Bell, Loader2, AlertTriangle, Clock, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BulkReminderDialogProps {
  expiringCount: number;
  expiredCount: number;
}

export function BulkReminderDialog({ expiringCount, expiredCount }: BulkReminderDialogProps) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [reminderType, setReminderType] = useState<string>("all");

  const handleSendReminders = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("bulk-contractor-reminder", {
        body: { reminder_type: reminderType },
      });

      if (error) throw error;

      if (data.sent > 0) {
        toast.success(`Sent ${data.sent} reminder${data.sent === 1 ? "" : "s"} successfully`);
      } else {
        toast.info(data.message || "No reminders needed to be sent");
      }
      setOpen(false);
    } catch (error: any) {
      console.error("Error sending reminders:", error);
      toast.error("Failed to send reminders");
    } finally {
      setSending(false);
    }
  };

  const totalNeedingReminders = expiringCount + expiredCount;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={totalNeedingReminders === 0}>
          <Bell className="h-4 w-4 mr-2" />
          Send Reminders
          {totalNeedingReminders > 0 && (
            <span className="ml-2 bg-destructive text-destructive-foreground text-xs rounded-full px-2">
              {totalNeedingReminders}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Send Bulk Reminders
          </DialogTitle>
          <DialogDescription>
            Send compliance reminder emails to contractors with expiring or expired documents.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <RadioGroup value={reminderType} onValueChange={setReminderType} className="space-y-3">
            <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="all" id="all" />
              <Label htmlFor="all" className="flex-1 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>All non-compliant contractors</span>
                  </div>
                  <span className="text-sm font-medium">{totalNeedingReminders}</span>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="expiring" id="expiring" />
              <Label htmlFor="expiring" className="flex-1 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-warning" />
                    <span>Expiring soon only</span>
                  </div>
                  <span className="text-sm font-medium text-warning">{expiringCount}</span>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="expired" id="expired" />
              <Label htmlFor="expired" className="flex-1 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span>Expired / incomplete only</span>
                  </div>
                  <span className="text-sm font-medium text-destructive">{expiredCount}</span>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSendReminders} disabled={sending || totalNeedingReminders === 0}>
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Bell className="h-4 w-4 mr-2" />
                Send Reminders
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
