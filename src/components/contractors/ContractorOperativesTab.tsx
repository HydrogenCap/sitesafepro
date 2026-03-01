import { Badge } from "@/components/ui/badge";
import { ContractorOperative, CSCS_CARD_TYPES } from "@/types/contractor";
import { Users, Mail } from "lucide-react";
import { format } from "date-fns";
import { AddOperativeDialog } from "./AddOperativeDialog";

interface Props {
  contractorId: string;
  operatives: ContractorOperative[];
}

export const ContractorOperativesTab = ({ contractorId, operatives }: Props) => {
  const getCSCSBadge = (type: string | null) => {
    const cscs = CSCS_CARD_TYPES.find((c) => c.value === type);
    if (!cscs) return null;
    return <Badge className={`${cscs.color} text-white`}>{cscs.label}</Badge>;
  };

  if (operatives.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-12 text-center">
        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-semibold mb-2">No Operatives</h3>
        <p className="text-muted-foreground mb-4">Add operatives from this contractor company.</p>
        <AddOperativeDialog contractorId={contractorId} />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold">Operatives ({operatives.length})</h3>
        <AddOperativeDialog contractorId={contractorId} />
      </div>
      <div className="divide-y divide-border">
        {operatives.map((op) => (
          <div key={op.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{op.full_name}</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                <span>{op.trade}</span>
                {op.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{op.email}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getCSCSBadge(op.cscs_card_type)}
              {op.cscs_expiry_date && (
                <span className="text-xs text-muted-foreground">
                  Exp: {format(new Date(op.cscs_expiry_date), "MMM yyyy")}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
