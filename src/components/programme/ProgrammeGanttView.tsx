import { useMemo, useState } from "react";
import { Gantt, Task, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import { ProgrammeTask, ProgrammeDependency, useUpdateProgrammeTask } from "@/hooks/useProgrammeTasks";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut } from "lucide-react";

const VIEW_MODES: { label: string; mode: ViewMode }[] = [
  { label: "Day", mode: ViewMode.Day },
  { label: "Week", mode: ViewMode.Week },
  { label: "Month", mode: ViewMode.Month },
  { label: "Year", mode: ViewMode.Year },
];

interface Props {
  tasks: ProgrammeTask[];
  dependencies: ProgrammeDependency[];
  projectId: string;
}

export const ProgrammeGanttView = ({ tasks, dependencies, projectId }: Props) => {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Week);
  const updateTask = useUpdateProgrammeTask();

  const ganttTasks: Task[] = useMemo(() => {
    if (tasks.length === 0) return [];

    // Build dependency lookup
    const depMap = new Map<string, string[]>();
    dependencies.forEach((d) => {
      const existing = depMap.get(d.to_task_id) || [];
      existing.push(d.from_task_id);
      depMap.set(d.to_task_id, existing);
    });

    return tasks.map((t) => ({
      id: t.id,
      name: t.title,
      start: new Date(t.planned_start),
      end: new Date(t.planned_finish),
      progress: t.progress,
      type: t.task_type === "milestone" ? "milestone" : t.task_type === "summary" ? "project" : "task",
      project: t.parent_id ?? undefined,
      dependencies: depMap.get(t.id) || [],
      isDisabled: false,
      styles: {
        progressColor:
          t.status === "delayed" ? "hsl(0 84% 60%)" :
          t.status === "at_risk" ? "hsl(38 92% 50%)" :
          t.status === "complete" ? "hsl(160 84% 39%)" :
          "hsl(174 78% 26%)",
        progressSelectedColor: "hsl(174 78% 22%)",
        backgroundColor:
          t.status === "delayed" ? "hsl(0 84% 60% / 0.2)" :
          t.status === "at_risk" ? "hsl(38 92% 50% / 0.2)" :
          "hsl(174 78% 26% / 0.15)",
        backgroundSelectedColor: "hsl(174 78% 26% / 0.3)",
      },
    }));
  }, [tasks, dependencies]);

  const handleDateChange = async (task: Task) => {
    updateTask.mutate({
      id: task.id,
      projectId,
      planned_start: task.start.toISOString().split("T")[0],
      planned_finish: task.end.toISOString().split("T")[0],
    });
  };

  const handleProgressChange = async (task: Task) => {
    const newStatus = task.progress >= 100 ? "complete" : task.progress > 0 ? "in_progress" : "not_started";
    updateTask.mutate({
      id: task.id,
      projectId,
      progress: task.progress,
      status: newStatus as any,
    });
  };

  if (ganttTasks.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        Add tasks to see the Gantt chart.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {VIEW_MODES.map((vm) => (
            <Button
              key={vm.label}
              variant={viewMode === vm.mode ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs px-3"
              onClick={() => setViewMode(vm.mode)}
            >
              {vm.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: "hsl(174 78% 26%)" }} /> On track</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: "hsl(38 92% 50%)" }} /> At risk</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: "hsl(0 84% 60%)" }} /> Delayed</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: "hsl(160 84% 39%)" }} /> Complete</span>
          </div>
        </div>
      </div>

      {/* Gantt chart */}
      <div className="border border-border rounded-xl overflow-hidden bg-card">
        <Gantt
          tasks={ganttTasks}
          viewMode={viewMode}
          onDateChange={handleDateChange}
          onProgressChange={handleProgressChange}
          listCellWidth=""
          columnWidth={viewMode === ViewMode.Day ? 60 : viewMode === ViewMode.Week ? 150 : viewMode === ViewMode.Month ? 200 : 300}
          barCornerRadius={4}
          barFill={60}
          todayColor="hsl(174 78% 26% / 0.08)"
          rowHeight={42}
          fontSize="12"
          headerHeight={50}
        />
      </div>
    </div>
  );
};
