import { ProgrammeTask } from "@/hooks/useProgrammeTasks";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { Trash2, Diamond, BarChart3, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATUS_STYLES: Record<string, string> = {
  not_started: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/10 text-primary",
  complete: "bg-success/10 text-success",
  delayed: "bg-destructive/10 text-destructive",
  at_risk: "bg-warning/10 text-warning",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  task: <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />,
  milestone: <Diamond className="h-3.5 w-3.5 text-accent" />,
  summary: <ListChecks className="h-3.5 w-3.5 text-primary" />,
};

interface Props {
  tasks: ProgrammeTask[];
  onDelete: (id: string) => void;
}

export const ProgrammeTaskList = ({ tasks, onDelete }: Props) => {
  const duration = (start: string, finish: string) => {
    const d = differenceInCalendarDays(parseISO(finish), parseISO(start));
    return `${d}d`;
  };

  const baselineVariance = (task: ProgrammeTask) => {
    if (!task.baseline_finish) return null;
    const plannedEnd = parseISO(task.planned_finish);
    const baseEnd = parseISO(task.baseline_finish);
    const diff = differenceInCalendarDays(plannedEnd, baseEnd);
    if (diff === 0) return <span className="text-muted-foreground">On time</span>;
    if (diff > 0) return <span className="text-destructive">+{diff}d late</span>;
    return <span className="text-success">{diff}d early</span>;
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No tasks yet. Add your first programme task to get started.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">#</TableHead>
            <TableHead>Task</TableHead>
            <TableHead>Trade</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Planned Start</TableHead>
            <TableHead>Planned Finish</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Variance</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task, i) => (
            <TableRow key={task.id}>
              <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {TYPE_ICONS[task.task_type]}
                  <span className="font-medium text-sm">{task.title}</span>
                </div>
              </TableCell>
              <TableCell className="text-sm capitalize">{task.trade || "—"}</TableCell>
              <TableCell className="text-sm">{duration(task.planned_start, task.planned_finish)}</TableCell>
              <TableCell className="text-sm">{new Date(task.planned_start).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</TableCell>
              <TableCell className="text-sm">{new Date(task.planned_finish).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2 min-w-[100px]">
                  <Progress value={task.progress} className="h-2 flex-1" />
                  <span className="text-xs text-muted-foreground w-8">{task.progress}%</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className={`text-xs ${STATUS_STYLES[task.status] || ""}`}>
                  {task.status.replace("_", " ")}
                </Badge>
              </TableCell>
              <TableCell className="text-xs">{baselineVariance(task) || "—"}</TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(task.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
