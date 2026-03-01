import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ContractorOperative, CSCS_CARD_TYPES, TRADES } from "@/types/contractor";
import { Users, Mail, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { AddOperativeDialog } from "./AddOperativeDialog";
import { EditOperativeDialog } from "./EditOperativeDialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useDeleteOperative } from "@/hooks/useContractors";

interface Props {
  contractorId: string;
  operatives: ContractorOperative[];
}

export const ContractorOperativesTab = ({ contractorId, operatives }: Props) => {
  const [editingOperative, setEditingOperative] = useState<ContractorOperative | null>(null);
  const [deletingOperative, setDeletingOperative] = useState<ContractorOperative | null>(null);
  const deleteOperative = useDeleteOperative();

  const getCSCSBadge = (type: string | null) => {
    const cscs = CSCS_CARD_TYPES.find((c) => c.value === type);
    if (!cscs) return null;
    return <Badge className={`${cscs.color} text-white`}>{cscs.label}</Badge>;
  };

  const handleDelete = () => {
    if (!deletingOperative) return;
    deleteOperative.mutate(
      { id: deletingOperative.id, contractorCompanyId: contractorId },
      { onSettled: () => setDeletingOperative(null) }
    );
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
    <>
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
                  <span>{TRADES.find(t => t.value === op.trade)?.label ?? op.trade}</span>
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
                <Button variant="ghost" size="icon" onClick={() => setEditingOperative(op)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeletingOperative(op)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingOperative && (
        <EditOperativeDialog
          operative={editingOperative}
          open={!!editingOperative}
          onOpenChange={(open) => { if (!open) setEditingOperative(null); }}
        />
      )}

      <ConfirmDialog
        open={!!deletingOperative}
        onOpenChange={(open) => { if (!open) setDeletingOperative(null); }}
        title="Remove Operative"
        description={`Are you sure you want to remove ${deletingOperative?.full_name}? This action cannot be undone.`}
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </>
  );
};
