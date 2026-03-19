import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Download, Search, Filter, FlaskConical } from 'lucide-react';
import { useCOSHH } from '@/hooks/useCOSHH';
import { useSubscription } from '@/hooks/useSubscription';
import { COSHHSummaryCards } from './COSHHSummaryCards';
import { SubstancesTable } from './SubstancesTable';
import { CommonSubstancesPrompt, COMMON_SUBSTANCES } from './CommonSubstances';
import { AddSubstanceDialog } from './AddSubstanceDialog';
import { SubstanceDetailPanel } from './SubstanceDetailPanel';
import { SDSUploadDialog } from './SDSUploadDialog';
import { generateCOSHHPDF } from '@/lib/coshh-pdf';
import type { COSHHSubstance, COSHHFormData, SubstanceType } from '@/types/coshh';
import { SUBSTANCE_TYPE_LABELS } from '@/types/coshh';

interface COSHHTabProps {
  projectId: string;
  projectName: string;
  organisationName?: string;
  projectAddress?: string;
}

export const COSHHTab = ({
  projectId,
  projectName,
  organisationName,
  projectAddress,
}: COSHHTabProps) => {
  // All hooks MUST be called before any conditional returns
  const { canAccess, loading: subscriptionLoading } = useSubscription();
  const {
    substances,
    loading,
    totalCount,
    healthSurveillanceCount,
    missingSdsCount,
    addSubstance,
    updateSubstance,
    removeSubstance,
    deleteSubstance,
    linkSDS,
  } = useCOSHH(projectId);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingSubstance, setEditingSubstance] = useState<COSHHSubstance | null>(null);
  const [viewingSubstance, setViewingSubstance] = useState<COSHHSubstance | null>(null);
  const [sdsUploadSubstance, setSDSUploadSubstance] = useState<COSHHSubstance | null>(null);
  const [initialFormData, setInitialFormData] = useState<Partial<COSHHFormData> | undefined>();
  const [isExporting, setIsExporting] = useState(false);

  // Check tier access (Professional+)
  const hasCOSHHAccess = canAccess('coshh_register');

  // Show upgrade prompt if no access - AFTER all hooks are called
  if (!hasCOSHHAccess) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 mx-auto mb-4 flex items-center justify-center">
          <FlaskConical className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          COSHH Register
        </h3>
        <p className="text-muted-foreground mb-4 max-w-md mx-auto">
          Track hazardous substances on site with a digital COSHH register. 
          Available on Professional and Enterprise plans.
        </p>
        <Button onClick={() => toast.info('Upgrade to Professional to access COSHH Register')}>
          Upgrade to Professional
        </Button>
      </div>
    );
  }

  // Filter substances
  const filteredSubstances = substances.filter((s) => {
    const matchesSearch =
      searchQuery === '' ||
      s.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.manufacturer && s.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = typeFilter === 'all' || s.substance_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleAddSubmit = async (data: COSHHFormData): Promise<boolean> => {
    if (editingSubstance) {
      return updateSubstance(editingSubstance.id, data);
    }
    return addSubstance(data);
  };

  const handleQuickAdd = (data: Partial<COSHHFormData>) => {
    setInitialFormData(data);
    setEditingSubstance(null);
    setAddDialogOpen(true);
  };

  const handleEdit = (substance: COSHHSubstance) => {
    setEditingSubstance(substance);
    setInitialFormData(undefined);
    setAddDialogOpen(true);
  };

  const handleView = (substance: COSHHSubstance) => {
    setViewingSubstance(substance);
  };

  const handleUploadSDS = (substance: COSHHSubstance) => {
    setSDSUploadSubstance(substance);
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await generateCOSHHPDF({
        substances,
        projectName,
        organisationName: organisationName || 'Organisation',
        projectAddress: projectAddress || '',
      });
      toast.success('COSHH Register exported');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">COSHH Register</h2>
          <p className="text-sm text-muted-foreground">
            Control of Substances Hazardous to Health
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportPDF}
            disabled={isExporting || substances.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button onClick={() => {
            setEditingSubstance(null);
            setInitialFormData(undefined);
            setAddDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Substance
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <COSHHSummaryCards
        totalCount={totalCount}
        healthSurveillanceCount={healthSurveillanceCount}
        missingSdsCount={missingSdsCount}
      />

      {substances.length === 0 ? (
        <CommonSubstancesPrompt onQuickAdd={handleQuickAdd} />
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search substances..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(SUBSTANCE_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <SubstancesTable
            substances={filteredSubstances}
            onView={handleView}
            onEdit={handleEdit}
            onUploadSDS={handleUploadSDS}
            onRemove={removeSubstance}
            onDelete={deleteSubstance}
          />
        </>
      )}

      {/* Add/Edit Dialog */}
      <AddSubstanceDialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) {
            setEditingSubstance(null);
            setInitialFormData(undefined);
          }
        }}
        onSubmit={handleAddSubmit}
        initialData={initialFormData}
        editingSubstance={editingSubstance}
      />

      {/* View Detail Panel */}
      <SubstanceDetailPanel
        substance={viewingSubstance}
        open={!!viewingSubstance}
        onOpenChange={(open) => !open && setViewingSubstance(null)}
        onEdit={() => {
          if (viewingSubstance) {
            handleEdit(viewingSubstance);
            setViewingSubstance(null);
          }
        }}
        onUploadSDS={() => {
          if (viewingSubstance) {
            handleUploadSDS(viewingSubstance);
            setViewingSubstance(null);
          }
        }}
      />

      {/* SDS Upload Dialog */}
      <SDSUploadDialog
        substance={sdsUploadSubstance}
        open={!!sdsUploadSubstance}
        onOpenChange={(open) => !open && setSDSUploadSubstance(null)}
        projectId={projectId}
        onUploaded={(documentId) => {
          if (sdsUploadSubstance) {
            linkSDS(sdsUploadSubstance.id, documentId);
            setSDSUploadSubstance(null);
          }
        }}
      />
    </div>
  );
};
