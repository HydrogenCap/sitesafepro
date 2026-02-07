import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  FileText,
  MapPin,
  Package,
  Shield,
  HeartPulse,
  AlertTriangle,
  Flame,
  Droplets,
  CheckCircle,
} from 'lucide-react';
import { GHSPictogramGrid } from './GHSPictograms';
import { PPEIconGrid } from './PPEIcons';
import type { COSHHSubstance } from '@/types/coshh';
import { SUBSTANCE_TYPE_LABELS, ROUTE_OF_EXPOSURE_LABELS, PPE_TYPE_LABELS } from '@/types/coshh';

interface SubstanceDetailPanelProps {
  substance: COSHHSubstance | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onUploadSDS: () => void;
}

export const SubstanceDetailPanel = ({
  substance,
  open,
  onOpenChange,
  onEdit,
  onUploadSDS,
}: SubstanceDetailPanelProps) => {
  if (!substance) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {substance.product_name}
            {substance.health_surveillance_required && (
              <Badge variant="destructive" className="text-xs">
                <HeartPulse className="h-3 w-3 mr-1" />
                Health Surveillance
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            {substance.manufacturer && `${substance.manufacturer} • `}
            {SUBSTANCE_TYPE_LABELS[substance.substance_type]}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 pb-6">
            {/* Hazard Pictograms */}
            {substance.hazard_pictograms.length > 0 && (
              <section>
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Flame className="h-4 w-4 text-amber-500" />
                  Hazard Classification
                </h4>
                <GHSPictogramGrid pictograms={substance.hazard_pictograms} size="md" maxDisplay={9} />
              </section>
            )}

            {/* Hazard Statements */}
            {substance.hazard_statements.length > 0 && (
              <section>
                <h4 className="text-sm font-semibold text-foreground mb-2">Hazard Statements</h4>
                <ul className="space-y-1">
                  {substance.hazard_statements.map((stmt, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                      {stmt}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Routes of Exposure */}
            {substance.route_of_exposure.length > 0 && (
              <section>
                <h4 className="text-sm font-semibold text-foreground mb-2">Routes of Exposure</h4>
                <div className="flex flex-wrap gap-2">
                  {substance.route_of_exposure.map((route) => (
                    <Badge key={route} variant="outline">
                      {ROUTE_OF_EXPOSURE_LABELS[route as keyof typeof ROUTE_OF_EXPOSURE_LABELS]}
                    </Badge>
                  ))}
                </div>
              </section>
            )}

            {/* Health Effects */}
            {substance.health_effects && (
              <section>
                <h4 className="text-sm font-semibold text-foreground mb-2">Health Effects</h4>
                <p className="text-sm text-muted-foreground">{substance.health_effects}</p>
              </section>
            )}

            <Separator />

            {/* Control Measures */}
            {substance.control_measures.length > 0 && (
              <section>
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Control Measures
                </h4>
                <ul className="space-y-2">
                  {substance.control_measures.map((measure, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <CheckCircle className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
                      {measure}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* PPE Required */}
            {substance.ppe_required.length > 0 && (
              <section>
                <h4 className="text-sm font-semibold text-foreground mb-2">PPE Required</h4>
                <div className="flex flex-wrap gap-2">
                  {substance.ppe_required.map((ppe) => (
                    <Badge key={ppe} variant="secondary">
                      {PPE_TYPE_LABELS[ppe as keyof typeof PPE_TYPE_LABELS] || ppe}
                    </Badge>
                  ))}
                </div>
              </section>
            )}

            {/* Workplace Exposure Limit */}
            {substance.workplace_exposure_limit && (
              <section>
                <h4 className="text-sm font-semibold text-foreground mb-2">Workplace Exposure Limit</h4>
                <p className="text-sm text-muted-foreground font-mono bg-muted px-3 py-2 rounded">
                  {substance.workplace_exposure_limit}
                </p>
              </section>
            )}

            {/* Health Surveillance */}
            {substance.health_surveillance_required && substance.health_surveillance_details && (
              <section className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-red-600 mb-2 flex items-center gap-2">
                  <HeartPulse className="h-4 w-4" />
                  Health Surveillance Required
                </h4>
                <p className="text-sm text-muted-foreground">{substance.health_surveillance_details}</p>
              </section>
            )}

            <Separator />

            {/* Storage */}
            <section>
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                Storage
              </h4>
              {substance.storage_location && (
                <div className="mb-2">
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="text-sm flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    {substance.storage_location}
                  </p>
                </div>
              )}
              {substance.storage_requirements && (
                <div>
                  <p className="text-xs text-muted-foreground">Requirements</p>
                  <p className="text-sm text-muted-foreground">{substance.storage_requirements}</p>
                </div>
              )}
              {substance.quantity_on_site && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground">Quantity on Site</p>
                  <p className="text-sm">{substance.quantity_on_site}</p>
                </div>
              )}
            </section>

            <Separator />

            {/* Emergency Procedures */}
            <section>
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Droplets className="h-4 w-4 text-red-500" />
                Emergency Procedures
              </h4>
              
              {substance.first_aid_measures && (
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground font-medium mb-1">First Aid</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {substance.first_aid_measures}
                  </p>
                </div>
              )}
              
              {substance.spill_procedure && (
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Spill Procedure</p>
                  <p className="text-sm text-muted-foreground">{substance.spill_procedure}</p>
                </div>
              )}
              
              {substance.fire_fighting_measures && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Fire Fighting</p>
                  <p className="text-sm text-muted-foreground">{substance.fire_fighting_measures}</p>
                </div>
              )}
            </section>

            <Separator />

            {/* Safety Data Sheet */}
            <section>
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Safety Data Sheet (SDS)
              </h4>
              {substance.sds_available ? (
                <div className="flex items-center gap-2">
                  <Badge className="bg-success/10 text-success border-success/30">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    SDS Available
                  </Badge>
                  <Button variant="outline" size="sm">
                    View SDS
                  </Button>
                </div>
              ) : (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-600">SDS Missing</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        A Safety Data Sheet is legally required for this substance under COSHH Regulations.
                      </p>
                      <Button size="sm" className="mt-3" onClick={onUploadSDS}>
                        Upload SDS
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={onEdit}>
            Edit Substance
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
