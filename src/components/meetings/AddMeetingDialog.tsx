import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (data: any) => void;
  isLoading?: boolean;
}

const meetingTypes = [
  { value: "progress", label: "Progress Meeting" },
  { value: "design", label: "Design Team Meeting" },
  { value: "safety", label: "Safety Meeting" },
  { value: "pre_start", label: "Pre-Start Meeting" },
  { value: "handover", label: "Handover Meeting" },
  { value: "ad_hoc", label: "Ad Hoc Meeting" },
];

export function AddMeetingDialog({ open, onOpenChange, onSubmit, isLoading }: Props) {
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingType, setMeetingType] = useState("progress");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [chairperson, setChairperson] = useState("");
  const [minuteTaker, setMinuteTaker] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      meeting_date: meetingDate,
      meeting_type: meetingType,
      start_time: startTime || null,
      end_time: endTime || null,
      location: location || null,
      chairperson: chairperson || null,
      minute_taker: minuteTaker || null,
      general_notes: generalNotes || null,
    });
    // Reset
    setTitle(""); setMeetingDate(""); setMeetingType("progress");
    setStartTime(""); setEndTime(""); setLocation("");
    setChairperson(""); setMinuteTaker(""); setGeneralNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Meeting Minutes</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Progress Meeting #12" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Meeting Date *</Label>
              <Input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} required />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={meetingType} onValueChange={setMeetingType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {meetingTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Time</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <Label>End Time</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Site office / Teams" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Chairperson</Label>
              <Input value={chairperson} onChange={(e) => setChairperson(e.target.value)} />
            </div>
            <div>
              <Label>Minute Taker</Label>
              <Input value={minuteTaker} onChange={(e) => setMinuteTaker(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>General Notes</Label>
            <Textarea value={generalNotes} onChange={(e) => setGeneralNotes(e.target.value)} placeholder="Any opening remarks or standing items..." rows={3} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>Create Minutes</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
