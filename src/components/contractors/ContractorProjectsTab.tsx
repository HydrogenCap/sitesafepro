import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FolderOpen, Plus } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  contractorId: string;
  projects: any[];
  onAssign?: () => void;
}

export const ContractorProjectsTab = ({ contractorId, projects, onAssign }: Props) => {
  if (projects.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-12 text-center">
        <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-semibold mb-2">No Project Assignments</h3>
        <p className="text-muted-foreground mb-4">Assign this contractor to projects.</p>
        <Button onClick={onAssign}><Plus className="h-4 w-4 mr-2" />Assign to Project</Button>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold">Projects ({projects.length})</h3>
        <Button size="sm" onClick={onAssign}><Plus className="h-4 w-4 mr-2" />Assign to Project</Button>
      </div>
      <div className="divide-y divide-border">
        {projects.map((pc: any) => (
          <Link key={pc.id} to={`/projects/${pc.project_id}`} className="p-4 flex items-center justify-between hover:bg-muted/50 block">
            <div>
              <p className="font-medium">{pc.projects?.name}</p>
              <p className="text-sm text-muted-foreground">{pc.scope_of_works || pc.trade}</p>
            </div>
            <Badge variant={pc.status === "active" ? "default" : "secondary"}>{pc.status}</Badge>
          </Link>
        ))}
      </div>
    </div>
  );
};
