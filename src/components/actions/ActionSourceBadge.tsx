import { Badge } from "@/components/ui/badge";

interface ActionSourceBadgeProps {
  source: string;
}

export const ActionSourceBadge = ({ source }: ActionSourceBadgeProps) => {
  const sourceLabels: Record<string, string> = {
    inspection: "Inspection",
    incident: "Incident",
    audit: "Audit",
    toolbox_talk: "Toolbox Talk",
    observation: "Observation",
    near_miss: "Near Miss",
    client_request: "Client Request",
    other: "Other",
  };

  return (
    <Badge variant="secondary" className="text-xs font-normal">
      {sourceLabels[source] || source}
    </Badge>
  );
};
