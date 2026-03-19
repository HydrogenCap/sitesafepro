import { useState } from "react";
import { motion } from "framer-motion";
import { useProgrammeTasks, useDeleteProgrammeTask } from "@/hooks/useProgrammeTasks";
import { ProgrammeGanttView } from "./ProgrammeGanttView";
import { ProgrammeTaskList } from "./ProgrammeTaskList";
import { AddTaskDialog } from "./AddTaskDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, BarChart3, Table2, Loader2 } from "lucide-react";

interface Props {
  projectId: string;
  organisationId: string;
}

export const ProgrammeTab = ({ projectId, organisationId }: Props) => {
  const [addOpen, setAddOpen] = useState(false);
  const { tasksQuery, dependenciesQuery } = useProgrammeTasks(projectId);
  const deleteTask = useDeleteProgrammeTask();

  const tasks = tasksQuery.data || [];
  const deps = dependenciesQuery.data || [];
  const loading = tasksQuery.isLoading;

  const handleDelete = (id: string) => {
    deleteTask.mutate({ id, projectId });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Programme</h3>
          <p className="text-sm text-muted-foreground">{tasks.length} task{tasks.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      <Tabs defaultValue="gantt" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="gantt" className="flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Gantt View
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-1.5">
            <Table2 className="h-3.5 w-3.5" />
            Task List
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gantt">
          <ProgrammeGanttView tasks={tasks} dependencies={deps} projectId={projectId} />
        </TabsContent>

        <TabsContent value="list">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <ProgrammeTaskList tasks={tasks} onDelete={handleDelete} />
          </div>
        </TabsContent>
      </Tabs>

      <AddTaskDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        projectId={projectId}
        organisationId={organisationId}
      />
    </motion.div>
  );
};
