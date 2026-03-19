import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useUpdateContractor } from "@/hooks/useContractors";
import { COMPLIANCE_DOC_LABELS, ComplianceDocType } from "@/types/contractor";
import { ClipboardCheck } from "lucide-react";

interface Props {
  contractorId: string;
  currentDocs: string[];
}

export function EditRequiredDocsDialog({ contractorId, currentDocs }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ComplianceDocType[]>([]);
  const updateContractor = useUpdateContractor();

  useEffect(() => {
    if (open) {
      setSelected(currentDocs as ComplianceDocType[]);
    }
  }, [open, currentDocs]);

  const toggle = (docType: ComplianceDocType) => {
    setSelected((prev) =>
      prev.includes(docType)
        ? prev.filter((d) => d !== docType)
        : [...prev, docType]
    );
  };

  const groupedDocs = Object.entries(COMPLIANCE_DOC_LABELS).reduce(
    (acc, [key, value]) => {
      if (!acc[value.category]) acc[value.category] = [];
      acc[value.category].push({ key: key as ComplianceDocType, ...value });
      return acc;
    },
    {} as Record<string, { key: ComplianceDocType; label: string; category: string }[]>
  );

  const handleSave = () => {
    updateContractor.mutate(
      { id: contractorId, data: { required_doc_types: selected } as any },
      { onSuccess: () => setOpen(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ClipboardCheck className="h-4 w-4 mr-2" />
          Edit Requirements
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Required Compliance Documents</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">
          Select which documents this contractor must provide. These create the compliance checklist.
        </p>

        <div className="space-y-6">
          {Object.entries(groupedDocs).map(([category, docs]) => (
            <div key={category}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                {category}
              </h3>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {docs.map((doc) => (
                  <div key={doc.key} className="flex items-center space-x-3">
                    <Checkbox
                      id={`edit-${doc.key}`}
                      checked={selected.includes(doc.key)}
                      onCheckedChange={() => toggle(doc.key)}
                    />
                    <Label
                      htmlFor={`edit-${doc.key}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {doc.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={updateContractor.isPending}>
            {updateContractor.isPending ? "Saving…" : "Save Requirements"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
