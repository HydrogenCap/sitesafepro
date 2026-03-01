import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Save, ShieldCheck } from "lucide-react";
import { useCompliancePresets, useUpsertPreset, useDeletePreset, type CompliancePreset } from "@/hooks/useCompliancePresets";
import { TRADES, COMPLIANCE_DOC_LABELS, type ComplianceDocType } from "@/types/contractor";

function PresetEditor({
  preset,
  onSave,
  onDelete,
  saving,
}: {
  preset: Partial<CompliancePreset> & { trade_category: string };
  onSave: (p: Partial<CompliancePreset> & { trade_category: string }) => void;
  onDelete?: () => void;
  saving: boolean;
}) {
  const [selected, setSelected] = useState<string[]>(preset.required_doc_types ?? []);
  const [minPL, setMinPL] = useState(preset.min_public_liability ?? "");
  const [minEL, setMinEL] = useState(preset.min_employers_liability ?? "");
  const [warningDays, setWarningDays] = useState(String(preset.expiry_warning_days ?? 30));

  const toggle = (docType: string) => {
    setSelected((prev) =>
      prev.includes(docType) ? prev.filter((d) => d !== docType) : [...prev, docType]
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

  const tradeLabel = TRADES.find((t) => t.value === preset.trade_category)?.label ?? preset.trade_category;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{tradeLabel}</CardTitle>
          </div>
          <div className="flex gap-2">
            {onDelete && (
              <Button variant="ghost" size="icon" onClick={onDelete}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>
        <CardDescription>
          {selected.length} document{selected.length !== 1 ? "s" : ""} required
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Coverage Minimums */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Min Public Liability (£)</Label>
            <Input
              placeholder="e.g. 5,000,000"
              value={minPL}
              onChange={(e) => setMinPL(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Min Employers Liability (£)</Label>
            <Input
              placeholder="e.g. 10,000,000"
              value={minEL}
              onChange={(e) => setMinEL(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Expiry Warning (days)</Label>
            <Input
              type="number"
              min={1}
              max={90}
              value={warningDays}
              onChange={(e) => setWarningDays(e.target.value)}
            />
          </div>
        </div>

        <Separator />

        {/* Document Checklist */}
        <div className="space-y-4">
          {Object.entries(groupedDocs).map(([category, docs]) => (
            <div key={category}>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">{category}</h4>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {docs.map((doc) => (
                  <div key={doc.key} className="flex items-center gap-2">
                    <Checkbox
                      id={`${preset.trade_category}-${doc.key}`}
                      checked={selected.includes(doc.key)}
                      onCheckedChange={() => toggle(doc.key)}
                    />
                    <Label
                      htmlFor={`${preset.trade_category}-${doc.key}`}
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

        <div className="flex justify-end">
          <Button
            onClick={() =>
              onSave({
                ...preset,
                required_doc_types: selected,
                min_public_liability: minPL || null,
                min_employers_liability: minEL || null,
                expiry_warning_days: Number(warningDays) || 30,
              })
            }
            disabled={saving}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving…" : "Save Preset"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ContractorComplianceSettings() {
  const { data: presets, isLoading } = useCompliancePresets();
  const upsertPreset = useUpsertPreset();
  const deletePreset = useDeletePreset();
  const [addTrade, setAddTrade] = useState("");

  const usedTrades = (presets ?? []).map((p) => p.trade_category);
  const availableTrades = TRADES.filter((t) => !usedTrades.includes(t.value));

  const handleAdd = () => {
    if (!addTrade) return;
    upsertPreset.mutate({
      trade_category: addTrade,
      required_doc_types: ["public_liability", "employers_liability", "cscs_card"],
      expiry_warning_days: 30,
    });
    setAddTrade("");
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Contractor Compliance Presets</CardTitle>
          <CardDescription>
            Define the default required documents, minimum insurance cover, and expiry warning thresholds
            for each trade category. When you invite a contractor, these presets are applied automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs">Add trade preset</Label>
              <Select value={addTrade} onValueChange={setAddTrade}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a trade…" />
                </SelectTrigger>
                <SelectContent>
                  {availableTrades.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAdd} disabled={!addTrade || upsertPreset.isPending}>
              <Plus className="h-4 w-4 mr-2" />
              Add Preset
            </Button>
          </div>
        </CardContent>
      </Card>

      {(presets ?? []).length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">
              No compliance presets configured yet. Add a trade above to get started.
            </p>
          </CardContent>
        </Card>
      )}

      {(presets ?? []).map((preset) => (
        <PresetEditor
          key={preset.id}
          preset={preset}
          onSave={(p) => upsertPreset.mutate(p)}
          onDelete={() => deletePreset.mutate(preset.id)}
          saving={upsertPreset.isPending}
        />
      ))}
    </div>
  );
}
