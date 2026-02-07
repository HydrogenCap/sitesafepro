import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, X, AlertTriangle } from 'lucide-react';
import { GHSPictogramSelector } from './GHSPictograms';
import type { 
  COSHHSubstance, 
  COSHHFormData, 
  SubstanceType, 
  HazardPictogram,
  RouteOfExposure,
} from '@/types/coshh';
import {
  SUBSTANCE_TYPE_LABELS,
  ROUTE_OF_EXPOSURE_LABELS,
  PPE_TYPE_LABELS,
  COMMON_CONTROL_MEASURES,
  COMMON_HAZARD_STATEMENTS,
  COMMON_PRECAUTIONARY_STATEMENTS,
  DEFAULT_FIRST_AID,
} from '@/types/coshh';

const formSchema = z.object({
  product_name: z.string().min(1, 'Product name is required'),
  manufacturer: z.string().optional(),
  substance_type: z.string().min(1, 'Substance type is required'),
  quantity_on_site: z.string().optional(),
  hazard_pictograms: z.array(z.string()),
  hazard_statements: z.array(z.string()),
  precautionary_statements: z.array(z.string()),
  route_of_exposure: z.array(z.string()),
  health_effects: z.string().optional(),
  control_measures: z.array(z.string()),
  ppe_required: z.array(z.string()),
  workplace_exposure_limit: z.string().optional(),
  health_surveillance_required: z.boolean(),
  health_surveillance_details: z.string().optional(),
  storage_location: z.string().optional(),
  storage_requirements: z.string().optional(),
  first_aid_measures: z.string().optional(),
  spill_procedure: z.string().optional(),
  fire_fighting_measures: z.string().optional(),
});

interface AddSubstanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: COSHHFormData) => Promise<boolean>;
  initialData?: Partial<COSHHFormData>;
  editingSubstance?: COSHHSubstance | null;
}

export const AddSubstanceDialog = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  editingSubstance,
}: AddSubstanceDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newHazardStatement, setNewHazardStatement] = useState('');
  const [newPrecautionaryStatement, setNewPrecautionaryStatement] = useState('');
  const [newControlMeasure, setNewControlMeasure] = useState('');

  const defaultValues: Partial<COSHHFormData> = editingSubstance 
    ? {
        product_name: editingSubstance.product_name,
        manufacturer: editingSubstance.manufacturer || '',
        substance_type: editingSubstance.substance_type,
        quantity_on_site: editingSubstance.quantity_on_site || '',
        hazard_pictograms: editingSubstance.hazard_pictograms,
        hazard_statements: editingSubstance.hazard_statements,
        precautionary_statements: editingSubstance.precautionary_statements,
        route_of_exposure: editingSubstance.route_of_exposure,
        health_effects: editingSubstance.health_effects || '',
        control_measures: editingSubstance.control_measures,
        ppe_required: editingSubstance.ppe_required,
        workplace_exposure_limit: editingSubstance.workplace_exposure_limit || '',
        health_surveillance_required: editingSubstance.health_surveillance_required,
        health_surveillance_details: editingSubstance.health_surveillance_details || '',
        storage_location: editingSubstance.storage_location || '',
        storage_requirements: editingSubstance.storage_requirements || '',
        first_aid_measures: editingSubstance.first_aid_measures || '',
        spill_procedure: editingSubstance.spill_procedure || '',
        fire_fighting_measures: editingSubstance.fire_fighting_measures || '',
      }
    : {
        product_name: '',
        manufacturer: '',
        substance_type: '' as SubstanceType,
        quantity_on_site: '',
        hazard_pictograms: [],
        hazard_statements: [],
        precautionary_statements: [],
        route_of_exposure: [],
        health_effects: '',
        control_measures: [],
        ppe_required: [],
        workplace_exposure_limit: '',
        health_surveillance_required: false,
        health_surveillance_details: '',
        storage_location: '',
        storage_requirements: '',
        first_aid_measures: DEFAULT_FIRST_AID,
        spill_procedure: '',
        fire_fighting_measures: '',
        ...initialData,
      };

  const form = useForm<COSHHFormData>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const handleSubmit = async (data: COSHHFormData) => {
    setIsSubmitting(true);
    try {
      const success = await onSubmit(data);
      if (success) {
        onOpenChange(false);
        form.reset();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const addToArrayField = (
    fieldName: keyof Pick<COSHHFormData, 'hazard_statements' | 'precautionary_statements' | 'control_measures'>,
    value: string,
    setter: (val: string) => void
  ) => {
    if (!value.trim()) return;
    const current = form.getValues(fieldName) || [];
    if (!current.includes(value)) {
      form.setValue(fieldName, [...current, value]);
    }
    setter('');
  };

  const removeFromArrayField = (
    fieldName: keyof Pick<COSHHFormData, 'hazard_statements' | 'precautionary_statements' | 'control_measures'>,
    value: string
  ) => {
    const current = form.getValues(fieldName) || [];
    form.setValue(fieldName, current.filter(v => v !== value));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle>
            {editingSubstance ? 'Edit Substance' : 'Add Substance to COSHH Register'}
          </SheetTitle>
          <SheetDescription>
            Record hazardous substance details for compliance with COSHH Regulations 2002
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 pb-6">
              <Accordion type="multiple" defaultValue={['product', 'hazards', 'controls', 'storage']} className="space-y-4">
                {/* Section 1: Product Information */}
                <AccordionItem value="product" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-sm font-semibold">
                    Product Information
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <FormField
                      control={form.control}
                      name="product_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. White Spirit" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="manufacturer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Manufacturer</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Dulux" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="substance_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Substance Type *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(SUBSTANCE_TYPE_LABELS).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="quantity_on_site"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity on Site</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. 5 litres, 2 x 25kg bags" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* Section 2: Hazard Classification */}
                <AccordionItem value="hazards" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-sm font-semibold">
                    Hazard Classification
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <FormField
                      control={form.control}
                      name="hazard_pictograms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>GHS Hazard Pictograms</FormLabel>
                          <FormDescription>
                            Select all applicable hazard symbols (found on product label/SDS)
                          </FormDescription>
                          <FormControl>
                            <GHSPictogramSelector
                              selected={field.value as HazardPictogram[]}
                              onChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="hazard_statements"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hazard Statements (H-statements)</FormLabel>
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <Select 
                                value="" 
                                onValueChange={(val) => addToArrayField('hazard_statements', val, setNewHazardStatement)}
                              >
                                <SelectTrigger className="flex-1">
                                  <SelectValue placeholder="Add common H-statement" />
                                </SelectTrigger>
                                <SelectContent>
                                  {COMMON_HAZARD_STATEMENTS.map((stmt) => (
                                    <SelectItem key={stmt} value={stmt}>{stmt}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex gap-2">
                              <Input
                                placeholder="Or type custom H-statement"
                                value={newHazardStatement}
                                onChange={(e) => setNewHazardStatement(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addToArrayField('hazard_statements', newHazardStatement, setNewHazardStatement);
                                  }
                                }}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => addToArrayField('hazard_statements', newHazardStatement, setNewHazardStatement)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {(field.value || []).map((stmt) => (
                                <Badge key={stmt} variant="secondary" className="text-xs">
                                  {stmt}
                                  <button
                                    type="button"
                                    onClick={() => removeFromArrayField('hazard_statements', stmt)}
                                    className="ml-1 hover:text-destructive"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="precautionary_statements"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Precautionary Statements (P-statements)</FormLabel>
                          <div className="space-y-2">
                            <Select 
                              value="" 
                              onValueChange={(val) => addToArrayField('precautionary_statements', val, setNewPrecautionaryStatement)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Add common P-statement" />
                              </SelectTrigger>
                              <SelectContent>
                                {COMMON_PRECAUTIONARY_STATEMENTS.map((stmt) => (
                                  <SelectItem key={stmt} value={stmt}>{stmt}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="flex flex-wrap gap-2">
                              {(field.value || []).map((stmt) => (
                                <Badge key={stmt} variant="secondary" className="text-xs">
                                  {stmt}
                                  <button
                                    type="button"
                                    onClick={() => removeFromArrayField('precautionary_statements', stmt)}
                                    className="ml-1 hover:text-destructive"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="route_of_exposure"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Routes of Exposure</FormLabel>
                          <div className="grid grid-cols-2 gap-3">
                            {Object.entries(ROUTE_OF_EXPOSURE_LABELS).map(([value, label]) => (
                              <div key={value} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`exposure-${value}`}
                                  checked={(field.value || []).includes(value as RouteOfExposure)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      field.onChange([...(field.value || []), value]);
                                    } else {
                                      field.onChange((field.value || []).filter((v) => v !== value));
                                    }
                                  }}
                                />
                                <label htmlFor={`exposure-${value}`} className="text-sm">
                                  {label}
                                </label>
                              </div>
                            ))}
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="health_effects"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Health Effects</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe what happens if exposed..."
                              rows={3}
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* Section 3: Control Measures */}
                <AccordionItem value="controls" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-sm font-semibold">
                    Control Measures & PPE
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <FormField
                      control={form.control}
                      name="control_measures"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Control Measures</FormLabel>
                          <div className="space-y-2">
                            <Select 
                              value="" 
                              onValueChange={(val) => addToArrayField('control_measures', val, setNewControlMeasure)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Add common control measure" />
                              </SelectTrigger>
                              <SelectContent>
                                {COMMON_CONTROL_MEASURES.map((measure) => (
                                  <SelectItem key={measure} value={measure}>{measure}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div className="flex gap-2">
                              <Input
                                placeholder="Or type custom control measure"
                                value={newControlMeasure}
                                onChange={(e) => setNewControlMeasure(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addToArrayField('control_measures', newControlMeasure, setNewControlMeasure);
                                  }
                                }}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => addToArrayField('control_measures', newControlMeasure, setNewControlMeasure)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="space-y-1">
                              {(field.value || []).map((measure, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                                  <span className="text-sm flex-1">{measure}</span>
                                  <button
                                    type="button"
                                    onClick={() => removeFromArrayField('control_measures', measure)}
                                    className="text-muted-foreground hover:text-destructive"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ppe_required"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>PPE Required</FormLabel>
                          <div className="grid grid-cols-2 gap-3">
                            {Object.entries(PPE_TYPE_LABELS).map(([value, label]) => (
                              <div key={value} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`ppe-${value}`}
                                  checked={(field.value || []).includes(value)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      field.onChange([...(field.value || []), value]);
                                    } else {
                                      field.onChange((field.value || []).filter((v: string) => v !== value));
                                    }
                                  }}
                                />
                                <label htmlFor={`ppe-${value}`} className="text-sm">
                                  {label}
                                </label>
                              </div>
                            ))}
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="workplace_exposure_limit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Workplace Exposure Limit (WEL)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. 0.1 mg/m³ (8hr TWA)" {...field} />
                          </FormControl>
                          <FormDescription>
                            Enter the WEL if applicable (found in EH40)
                          </FormDescription>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="health_surveillance_required"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Health Surveillance Required</FormLabel>
                            <FormDescription>
                              Toggle if workers need health monitoring for this substance
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {form.watch('health_surveillance_required') && (
                      <FormField
                        control={form.control}
                        name="health_surveillance_details"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Health Surveillance Details</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="e.g. Respiratory surveillance, skin checks..."
                                rows={2}
                                {...field}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    )}
                  </AccordionContent>
                </AccordionItem>

                {/* Section 4: Storage & Emergency */}
                <AccordionItem value="storage" className="border rounded-lg px-4">
                  <AccordionTrigger className="text-sm font-semibold">
                    Storage & Emergency Procedures
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <FormField
                      control={form.control}
                      name="storage_location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Storage Location on Site</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. COSHH cabinet, welfare unit" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="storage_requirements"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Storage Requirements</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="e.g. Store in cool, dry place away from ignition sources"
                              rows={2}
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="first_aid_measures"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Aid Measures</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="First aid procedures for skin, eyes, inhalation, ingestion..."
                              rows={4}
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="spill_procedure"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Spill Procedure</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Steps to take in case of spillage..."
                              rows={2}
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="fire_fighting_measures"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fire Fighting Measures</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Suitable extinguishing media and precautions..."
                              rows={2}
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* SDS Warning */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-600">Safety Data Sheet Required</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    After adding this substance, remember to upload the Safety Data Sheet (SDS) from the manufacturer.
                    This is a legal requirement under COSHH Regulations.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingSubstance ? 'Update Substance' : 'Add Substance'}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
