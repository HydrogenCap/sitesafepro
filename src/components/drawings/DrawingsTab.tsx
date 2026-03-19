import { useState } from "react";
import { motion } from "framer-motion";
import { useDrawings, useRFIs } from "@/hooks/useDrawings";
import { useAuth } from "@/contexts/AuthContext";
import { DrawingsTable } from "./DrawingsTable";
import { RFIsTable } from "./RFIsTable";
import { AddDrawingDialog } from "./AddDrawingDialog";
import { AddRFIDialog } from "./AddRFIDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Ruler, MessageSquareText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  projectId: string;
  organisationId: string;
}

export function DrawingsTab({ projectId, organisationId }: Props) {
  const { user } = useAuth();
  const { drawingsQuery, addDrawing } = useDrawings(projectId);
  const { rfisQuery, addRFI } = useRFIs(projectId);

  const [addDrawingOpen, setAddDrawingOpen] = useState(false);
  const [addRFIOpen, setAddRFIOpen] = useState(false);
  const [disciplineFilter, setDisciplineFilter] = useState("");
  const [drawingStatusFilter, setDrawingStatusFilter] = useState("");
  const [rfiStatusFilter, setRfiStatusFilter] = useState("");

  const drawings = drawingsQuery.data || [];
  const rfis = rfisQuery.data || [];
  const openRFIs = rfis.filter((r) => !["closed", "void"].includes(r.status)).length;

  const nextRFINumber = `RFI-${String((rfis.length || 0) + 1).padStart(3, "0")}`;

  const handleAddDrawing = (data: any) => {
    addDrawing.mutate(
      {
        ...data,
        project_id: projectId,
        organisation_id: organisationId,
        created_by: user?.id,
      },
      { onSuccess: () => setAddDrawingOpen(false) }
    );
  };

  const handleAddRFI = (data: any) => {
    addRFI.mutate(
      {
        ...data,
        project_id: projectId,
        organisation_id: organisationId,
        raised_by: user?.id,
      },
      { onSuccess: () => setAddRFIOpen(false) }
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Tabs defaultValue="drawings" className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <TabsList>
            <TabsTrigger value="drawings" className="flex items-center gap-1.5">
              <Ruler className="h-3.5 w-3.5" />
              Drawings
              <Badge variant="secondary" className="ml-1 text-xs">{drawings.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="rfis" className="flex items-center gap-1.5">
              <MessageSquareText className="h-3.5 w-3.5" />
              RFIs
              {openRFIs > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">{openRFIs}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="drawings">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex gap-2">
              <Select value={disciplineFilter} onValueChange={setDisciplineFilter}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="All disciplines" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Disciplines</SelectItem>
                  <SelectItem value="architectural">Architectural</SelectItem>
                  <SelectItem value="structural">Structural</SelectItem>
                  <SelectItem value="mechanical">Mechanical</SelectItem>
                  <SelectItem value="electrical">Electrical</SelectItem>
                  <SelectItem value="civil">Civil</SelectItem>
                  <SelectItem value="landscape">Landscape</SelectItem>
                </SelectContent>
              </Select>
              <Select value={drawingStatusFilter} onValueChange={setDrawingStatusFilter}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="preliminary">Preliminary</SelectItem>
                  <SelectItem value="information">Information</SelectItem>
                  <SelectItem value="coordination">Coordination</SelectItem>
                  <SelectItem value="construction">IFC</SelectItem>
                  <SelectItem value="as_built">As Built</SelectItem>
                  <SelectItem value="superseded">Superseded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setAddDrawingOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Drawing
            </Button>
          </div>
          <DrawingsTable
            drawings={drawings}
            disciplineFilter={disciplineFilter === "all" ? "" : disciplineFilter}
            statusFilter={drawingStatusFilter === "all" ? "" : drawingStatusFilter}
          />
        </TabsContent>

        <TabsContent value="rfis">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <Select value={rfiStatusFilter} onValueChange={setRfiStatusFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="pending_response">Pending Response</SelectItem>
                <SelectItem value="answered">Answered</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="void">Void</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setAddRFIOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Raise RFI
            </Button>
          </div>
          <RFIsTable
            rfis={rfis}
            statusFilter={rfiStatusFilter === "all" ? "" : rfiStatusFilter}
          />
        </TabsContent>
      </Tabs>

      <AddDrawingDialog
        open={addDrawingOpen}
        onOpenChange={setAddDrawingOpen}
        onSubmit={handleAddDrawing}
        isLoading={addDrawing.isPending}
      />
      <AddRFIDialog
        open={addRFIOpen}
        onOpenChange={setAddRFIOpen}
        onSubmit={handleAddRFI}
        nextNumber={nextRFINumber}
        isLoading={addRFI.isPending}
      />
    </motion.div>
  );
}
