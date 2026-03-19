import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateProgrammeTask } from "@/hooks/useProgrammeTasks";
import { useAuth } from "@/contexts/AuthContext";

const TRADES = [
  "groundworks", "structure", "envelope", "mep", "finishes",
  "demolition", "piling", "steelwork", "roofing", "cladding",
  "plastering", "joinery", "decoration", "landscaping", "other",
];

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  organisationId: string;
}

export const AddTaskDialog = ({ open, onOpenChange, projectId, organisationId }: AddTaskDialogProps) => {
  const { user } = useAuth();
  const createTask = useCreateProgrammeTask();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taskType, setTaskType] = useState<"task" | "milestone" | "summary">("task");
  const [trade, setTrade] = useState("");
  const [plannedStart, setPlannedStart] = useState("");
  const [plannedFinish, setPlannedFinish] = useState("");

  const handleSubmit = () => {
    if (!title || !plannedStart || !plannedFinish) return;
    createTask.mutate(
      {
        project_id: projectId,
        organisation_id: organisationId,
        title,
        description: description || null,
        task_type: taskType,
        trade: trade || null,
        planned_start: plannedStart,
        planned_finish: taskType === "milestone" ? plannedStart : plannedFinish,
        created_by: user?.id || null,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setTitle("");
          setDescription("");
          setTaskType("task");
          setTrade("");
          setPlannedStart("");
          setPlannedFinish("");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Programme Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Groundworks — Strip foundations" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <Select value={taskType} onValueChange={(v) => setTaskType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="milestone">Milestone</SelectItem>
                  <SelectItem value="summary">Summary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Trade</Label>
              <Select value={trade} onValueChange={setTrade}>
                <SelectTrigger><SelectValue placeholder="Select trade" /></SelectTrigger>
                <SelectContent>
                  {TRADES.map((t) => (
                    <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Planned Start *</Label>
              <Input type="date" value={plannedStart} onChange={(e) => setPlannedStart(e.target.value)} />
            </div>
            {taskType !== "milestone" && (
              <div>
                <Label>Planned Finish *</Label>
                <Input type="date" value={plannedFinish} onChange={(e) => setPlannedFinish(e.target.value)} />
              </div>
            )}
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional notes..." rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!title || !plannedStart || (taskType !== "milestone" && !plannedFinish) || createTask.isPending}>
            {createTask.isPending ? "Adding..." : "Add Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
