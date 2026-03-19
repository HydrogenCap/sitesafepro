import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Project {
  id: string;
  name: string;
}

interface TeamMember {
  id: string;
  full_name: string;
}

interface ActionFiltersProps {
  projects: Project[];
  teamMembers: TeamMember[];
  filters: {
    project: string;
    priority: string;
    status: string;
    source: string;
    assignedTo: string;
    search: string;
  };
  onFilterChange: (key: string, value: string) => void;
}

export const ActionFilters = ({
  projects,
  teamMembers,
  filters,
  onFilterChange,
}: ActionFiltersProps) => {
  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search actions..."
          value={filters.search}
          onChange={(e) => onFilterChange("search", e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={filters.project} onValueChange={(v) => onFilterChange("project", v)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All Projects" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Projects</SelectItem>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.priority} onValueChange={(v) => onFilterChange("priority", v)}>
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priorities</SelectItem>
          <SelectItem value="critical">Critical</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="low">Low</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.status} onValueChange={(v) => onFilterChange("status", v)}>
        <SelectTrigger className="w-[170px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="open">Open</SelectItem>
          <SelectItem value="in_progress">In Progress</SelectItem>
          <SelectItem value="awaiting_verification">Awaiting Verification</SelectItem>
          <SelectItem value="closed">Closed</SelectItem>
          <SelectItem value="overdue">Overdue</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.source} onValueChange={(v) => onFilterChange("source", v)}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Source" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sources</SelectItem>
          <SelectItem value="inspection">Inspection</SelectItem>
          <SelectItem value="incident">Incident</SelectItem>
          <SelectItem value="audit">Audit</SelectItem>
          <SelectItem value="toolbox_talk">Toolbox Talk</SelectItem>
          <SelectItem value="observation">Observation</SelectItem>
          <SelectItem value="near_miss">Near Miss</SelectItem>
          <SelectItem value="client_request">Client Request</SelectItem>
          <SelectItem value="other">Other</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.assignedTo} onValueChange={(v) => onFilterChange("assignedTo", v)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Assigned To" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Assignees</SelectItem>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {teamMembers.map((member) => (
            <SelectItem key={member.id} value={member.id}>
              {member.full_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
