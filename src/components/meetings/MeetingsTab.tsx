import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useMeetingMinutes, type MeetingMinutes } from "@/hooks/useMeetingMinutes";
import { MeetingsTable } from "./MeetingsTable";
import { AddMeetingDialog } from "./AddMeetingDialog";
import { MeetingDetailDialog } from "./MeetingDetailDialog";

interface Props {
  projectId: string;
  organisationId: string;
}

export function MeetingsTab({ projectId, organisationId }: Props) {
  const { meetings, isLoading, addMeeting, updateMeeting, deleteMeeting } = useMeetingMinutes(projectId);
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<MeetingMinutes | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Meeting Minutes</h3>
          <p className="text-sm text-muted-foreground">Record and distribute minutes for project meetings.</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Minutes
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      ) : (
        <MeetingsTable
          meetings={meetings}
          onView={setSelected}
          onDelete={(id) => deleteMeeting.mutate(id)}
        />
      )}

      <AddMeetingDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSubmit={(data) => addMeeting.mutate(data)}
        isLoading={addMeeting.isPending}
      />

      <MeetingDetailDialog
        meeting={selected}
        open={!!selected}
        onOpenChange={(o) => { if (!o) setSelected(null); }}
        onUpdate={(data) => {
          updateMeeting.mutate(data);
          // Update local state optimistically
          if (selected && data.id === selected.id) {
            setSelected({ ...selected, ...data } as MeetingMinutes);
          }
        }}
      />
    </div>
  );
}
