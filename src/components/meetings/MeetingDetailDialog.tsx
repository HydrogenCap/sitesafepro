import { useState } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Send, CheckCircle } from "lucide-react";
import type { MeetingMinutes } from "@/hooks/useMeetingMinutes";

interface Props {
  meeting: MeetingMinutes | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onUpdate: (data: Partial<MeetingMinutes> & { id: string }) => void;
}

export function MeetingDetailDialog({ meeting, open, onOpenChange, onUpdate }: Props) {
  const [attendees, setAttendees] = useState<{ name: string; company: string }[]>([]);
  const [agendaItems, setAgendaItems] = useState<{ ref: string; topic: string; discussion: string; action?: string; owner?: string; due?: string }[]>([]);
  const [loaded, setLoaded] = useState<string | null>(null);

  // Sync state when meeting changes
  if (meeting && loaded !== meeting.id) {
    setAttendees(meeting.attendees || []);
    setAgendaItems(meeting.agenda_items || []);
    setLoaded(meeting.id);
  }

  if (!meeting) return null;

  const addAttendee = () => setAttendees([...attendees, { name: "", company: "" }]);
  const removeAttendee = (i: number) => setAttendees(attendees.filter((_, idx) => idx !== i));
  const updateAttendee = (i: number, field: string, value: string) => {
    const next = [...attendees];
    (next[i] as any)[field] = value;
    setAttendees(next);
  };

  const addAgendaItem = () => setAgendaItems([...agendaItems, { ref: String(agendaItems.length + 1), topic: "", discussion: "", action: "", owner: "", due: "" }]);
  const removeAgendaItem = (i: number) => setAgendaItems(agendaItems.filter((_, idx) => idx !== i));
  const updateAgendaItem = (i: number, field: string, value: string) => {
    const next = [...agendaItems];
    (next[i] as any)[field] = value;
    setAgendaItems(next);
  };

  const handleSave = () => {
    onUpdate({ id: meeting.id, attendees: attendees as any, agenda_items: agendaItems as any });
  };

  const handleIssue = () => {
    onUpdate({ id: meeting.id, attendees: attendees as any, agenda_items: agendaItems as any, status: "issued" });
  };

  const handleApprove = () => {
    onUpdate({ id: meeting.id, status: "approved" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle>Meeting #{meeting.meeting_number} — {meeting.title}</DialogTitle>
            <Badge variant={meeting.status === "issued" ? "default" : meeting.status === "approved" ? "outline" : "secondary"}>
              {meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {format(new Date(meeting.meeting_date), "dd MMMM yyyy")}
            {meeting.start_time && ` · ${meeting.start_time.slice(0, 5)}`}
            {meeting.end_time && ` – ${meeting.end_time.slice(0, 5)}`}
            {meeting.location && ` · ${meeting.location}`}
          </p>
        </DialogHeader>

        {/* Attendees */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-semibold">Attendees</Label>
            <Button type="button" variant="ghost" size="sm" onClick={addAttendee}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add
            </Button>
          </div>
          {attendees.map((a, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <Input placeholder="Name" value={a.name} onChange={(e) => updateAttendee(i, "name", e.target.value)} className="flex-1" />
              <Input placeholder="Company" value={a.company} onChange={(e) => updateAttendee(i, "company", e.target.value)} className="flex-1" />
              <Button variant="ghost" size="icon" onClick={() => removeAttendee(i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
            </div>
          ))}
          {!attendees.length && <p className="text-sm text-muted-foreground">No attendees added yet.</p>}
        </div>

        <Separator />

        {/* Agenda Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-semibold">Agenda / Discussion Items</Label>
            <Button type="button" variant="ghost" size="sm" onClick={addAgendaItem}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
            </Button>
          </div>
          {agendaItems.map((item, i) => (
            <div key={i} className="bg-muted/50 rounded-lg p-3 mb-3 space-y-2">
              <div className="flex gap-2 items-center">
                <Input placeholder="Ref" value={item.ref} onChange={(e) => updateAgendaItem(i, "ref", e.target.value)} className="w-16" />
                <Input placeholder="Topic" value={item.topic} onChange={(e) => updateAgendaItem(i, "topic", e.target.value)} className="flex-1" />
                <Button variant="ghost" size="icon" onClick={() => removeAgendaItem(i)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </div>
              <Textarea placeholder="Discussion notes..." value={item.discussion} onChange={(e) => updateAgendaItem(i, "discussion", e.target.value)} rows={2} />
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="Action required" value={item.action || ""} onChange={(e) => updateAgendaItem(i, "action", e.target.value)} />
                <Input placeholder="Owner" value={item.owner || ""} onChange={(e) => updateAgendaItem(i, "owner", e.target.value)} />
                <Input placeholder="Due date" type="date" value={item.due || ""} onChange={(e) => updateAgendaItem(i, "due", e.target.value)} />
              </div>
            </div>
          ))}
          {!agendaItems.length && <p className="text-sm text-muted-foreground">No agenda items yet. Click "Add Item" to begin.</p>}
        </div>

        {meeting.general_notes && (
          <>
            <Separator />
            <div>
              <Label className="text-sm font-semibold">General Notes</Label>
              <p className="text-sm text-muted-foreground mt-1">{meeting.general_notes}</p>
            </div>
          </>
        )}

        <Separator />

        <div className="flex justify-between pt-2">
          <div className="flex gap-2">
            {meeting.status === "draft" && (
              <Button variant="outline" onClick={handleIssue}>
                <Send className="h-4 w-4 mr-2" /> Issue Minutes
              </Button>
            )}
            {meeting.status === "issued" && (
              <Button variant="outline" onClick={handleApprove}>
                <CheckCircle className="h-4 w-4 mr-2" /> Approve
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
