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
import { Loader2, AlertTriangle, Sparkles } from 'lucide-react';
import { GHSPictogramSelector } from './GHSPictograms';
import { ArrayStatementField } from './ArrayStatementField';
import { CheckboxGroupField } from './CheckboxGroupField';
import type {
  COSHHSubstance,
  COSHHFormData,
  SubstanceType,
  HazardPictogram,
} from '@/types/coshh';
import { supabase } from '@/integrations/supabase/client';
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

const confidenceBadgeClass: Record<string, string> = {
  high: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
  low: 'bg-muted text-muted-foreground',
};

export const AddSubstanceDialog = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  editingSubstance,
}: AddSubstanceDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupConfidence, setLookupConfidence] = useState<'high' | 'medium' | 'low' | null>(null);

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

  const handleAiLookup = async () => {
    const productName = form.getValues('product_name')?.trim();
    if (!productName) {
      form.setFocus('product_name');
      return;
    }
    setIsLookingUp(true);
    setLookupConfidence(null);
    try {
      const { data, error } = await supabase.functions.invoke('coshh-ai-lookup', {
        body: { substance_name: productName },
      });
      if (error) throw error;
      if (!data.ok) throw new Error(data.error || 'Lookup failed');

      const d = data.data;
      const isNew = !editingSubstance;
      if (d.product_name && isNew) form.setValue('product_name', d.product_name);
      if (d.substance_type) form.setValue('substance_type', d.substance_type);
      if (d.hazard_pictograms?.length) form.setValue('hazard_pictograms', d.hazard_pictograms);
      if (d.hazard_statements?.length) form.setValue('hazard_statements', d.hazard_statements);
      if (d.precautionary_statements?.length) form.setValue('precautionary_statements', d.precautionary_statements);
      if (d.route_of_exposure?.length) form.setValue('route_of_exposure', d.route_of_exposure);
      if (d.health_effects) form.setValue('health_effects', d.health_effects);
      if (d.control_measures?.length) form.setValue('control_measures', d.control_measures);
      if (d.ppe_required?.length) form.setValue('ppe_required', d.ppe_required);
      if (d.workplace_exposure_limit) form.setValue('workplace_exposure_limit', d.workplace_exposure_limit);
      if (typeof d.health_surveillance_required === 'boolean') form.setValue('health_surveillance_required', d.health_surveillance_required);
      if (d.health_surveillance_details) form.setValue('health_surveillance_details', d.health_surveillance_details);
      if (d.first_aid_measures) form.setValue('first_aid_measures', d.first_aid_measures);
      if (d.spill_procedure) form.setValue('spill_procedure', d.spill_procedure);
      if (d.fire_fighting_measures) form.setValue('fire_fighting_measures', d.fire_fighting_measures);
      if (d.storage_requirements) form.setValue('storage_requirements', d.storage_requirements);
      setLookupConfidence(d.confidence ?? 'medium');
    } catch (err: any) {
      console.error('[COSHH AI]', err);
    } finally {
      setIsLookingUp(false);
    }
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
              <Accordion
                type="multiple"
                defaultValue={['product', 'hazards', 'controls', 'storage']}
                className="space-y-4"
              >
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

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAiLookup}
                        disabled={isLookingUp}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                      >
                        {isLookingUp
                          ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Looking up…</>
                          : <><Sparkles className="h-3.5 w-3.5" />AI Auto-fill</>
                        }
                      </button>
                      {lookupConfidence && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${confidenceBadgeClass[lookupConfidence]}`}>
                          {lookupConfidence} confidence
                        </span>
                      )}
                    </div>
                    {lookupConfidence && (
                      <p className="text-xs text-muted-foreground -mt-2">
                        AI-generated data pre-filled. Review all fields before saving — AI can make mistakes.
                      </p>
                    )}

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
                                <SelectItem key={value} value={value}>{label}</SelectItem>
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

                    <ArrayStatementField
                      control={form.control}
                      name="hazard_statements"
                      label="Hazard Statements (H-statements)"
                      commonOptions={COMMON_HAZARD_STATEMENTS}
                      showCustomInput
                      placeholder="Or type custom H-statement"
                      displayAs="badges"
                    />

                    <ArrayStatementField
                      control={form.control}
                      name="precautionary_statements"
                      label="Precautionary Statements (P-statements)"
                      commonOptions={COMMON_PRECAUTIONARY_STATEMENTS}
                      displayAs="badges"
                    />

                    <CheckboxGroupField
                      control={form.control}
                      name="route_of_exposure"
                      label="Routes of Exposure"
                      options={ROUTE_OF_EXPOSURE_LABELS}
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
                    <ArrayStatementField
                      control={form.control}
                      name="control_measures"
                      label="Control Measures"
                      commonOptions={COMMON_CONTROL_MEASURES}
                      showCustomInput
                      placeholder="Or type custom control measure"
                      displayAs="list"
                    />

                    <CheckboxGroupField
                      control={form.control}
                      name="ppe_required"
                      label="PPE Required"
                      options={PPE_TYPE_LABELS}
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
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
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
                    {[
                      { name: 'storage_location' as const, label: 'Storage Location on Site', placeholder: 'e.g. COSHH cabinet, welfare unit', rows: 1 },
                      { name: 'storage_requirements' as const, label: 'Storage Requirements', placeholder: 'e.g. Store in cool, dry place away from ignition sources', rows: 2 },
                      { name: 'first_aid_measures' as const, label: 'First Aid Measures', placeholder: 'First aid procedures for skin, eyes, inhalation, ingestion...', rows: 4 },
                      { name: 'spill_procedure' as const, label: 'Spill Procedure', placeholder: 'Steps to take in case of spillage...', rows: 2 },
                      { name: 'fire_fighting_measures' as const, label: 'Fire Fighting Measures', placeholder: 'Suitable extinguishing media and precautions...', rows: 2 },
                    ].map(({ name, label, placeholder, rows }) => (
                      <FormField
                        key={name}
                        control={form.control}
                        name={name}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{label}</FormLabel>
                            <FormControl>
                              {rows === 1
                                ? <Input placeholder={placeholder} {...field} />
                                : <Textarea placeholder={placeholder} rows={rows} {...field} />
                              }
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    ))}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

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
