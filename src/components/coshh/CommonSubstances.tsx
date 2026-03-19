import { Button } from '@/components/ui/button';
import { Plus, FlaskConical } from 'lucide-react';
import type { COSHHFormData, SubstanceType, HazardPictogram, RouteOfExposure } from '@/types/coshh';
import { DEFAULT_FIRST_AID } from '@/types/coshh';

interface CommonSubstance {
  name: string;
  type: SubstanceType;
  data: Partial<COSHHFormData>;
}

const COMMON_SUBSTANCES: CommonSubstance[] = [
  {
    name: 'PVA Adhesive',
    type: 'adhesive',
    data: {
      product_name: 'PVA Adhesive',
      substance_type: 'adhesive',
      hazard_pictograms: [],
      route_of_exposure: ['skin_contact', 'eye_contact'],
      control_measures: ['Avoid skin contact', 'Wash hands after use'],
      ppe_required: ['nitrile_gloves'],
      health_effects: 'May cause mild skin or eye irritation on prolonged contact',
      first_aid_measures: DEFAULT_FIRST_AID,
    },
  },
  {
    name: 'Cement / Mortar',
    type: 'cement',
    data: {
      product_name: 'Cement / Mortar',
      substance_type: 'cement',
      hazard_pictograms: ['corrosive', 'harmful'] as HazardPictogram[],
      hazard_statements: ['H315 Causes skin irritation', 'H318 Causes serious eye damage', 'H335 May cause respiratory irritation'],
      route_of_exposure: ['skin_contact', 'eye_contact', 'inhalation'] as RouteOfExposure[],
      control_measures: ['Avoid skin contact', 'Use in well-ventilated area', 'Wash hands thoroughly after handling'],
      ppe_required: ['nitrile_gloves', 'safety_goggles', 'ffp2_mask'],
      health_effects: 'Causes skin burns and serious eye damage. May cause respiratory irritation. Prolonged exposure can cause dermatitis.',
      health_surveillance_required: true,
      health_surveillance_details: 'Skin checks for cement dermatitis',
      first_aid_measures: DEFAULT_FIRST_AID,
    },
  },
  {
    name: 'Emulsion Paint',
    type: 'paint',
    data: {
      product_name: 'Emulsion Paint (Water-Based)',
      substance_type: 'paint',
      hazard_pictograms: [],
      route_of_exposure: ['skin_contact', 'eye_contact'],
      control_measures: ['Ensure adequate ventilation', 'Wash hands after use'],
      ppe_required: ['nitrile_gloves', 'safety_goggles'],
      health_effects: 'Low toxicity. May cause mild irritation on prolonged skin contact.',
      first_aid_measures: DEFAULT_FIRST_AID,
    },
  },
  {
    name: 'Gloss Paint (Solvent-Based)',
    type: 'paint',
    data: {
      product_name: 'Gloss Paint (Solvent-Based)',
      substance_type: 'paint',
      hazard_pictograms: ['flammable', 'harmful'] as HazardPictogram[],
      hazard_statements: ['H226 Flammable liquid and vapour', 'H336 May cause drowsiness or dizziness'],
      route_of_exposure: ['inhalation', 'skin_contact', 'eye_contact'] as RouteOfExposure[],
      control_measures: ['Use in well-ventilated area', 'Keep away from heat and ignition sources', 'Do not smoke when using'],
      ppe_required: ['nitrile_gloves', 'safety_goggles', 'ffp2_mask'],
      health_effects: 'Vapours may cause drowsiness and dizziness. Prolonged exposure may cause dermatitis.',
      first_aid_measures: DEFAULT_FIRST_AID,
    },
  },
  {
    name: 'White Spirit',
    type: 'solvent',
    data: {
      product_name: 'White Spirit',
      substance_type: 'solvent',
      hazard_pictograms: ['flammable', 'harmful', 'health_hazard'] as HazardPictogram[],
      hazard_statements: ['H226 Flammable liquid and vapour', 'H304 May be fatal if swallowed and enters airways', 'H336 May cause drowsiness'],
      route_of_exposure: ['inhalation', 'skin_contact', 'ingestion'] as RouteOfExposure[],
      control_measures: ['Use in well-ventilated area or with LEV', 'Keep away from ignition sources', 'Do not eat, drink or smoke when using'],
      ppe_required: ['nitrile_gloves', 'safety_goggles', 'ffp2_mask'],
      health_effects: 'Harmful if swallowed. Vapours cause drowsiness. Repeated exposure causes dry, cracked skin.',
      first_aid_measures: 'Skin: Wash with soap and water. Ingestion: DO NOT induce vomiting - seek immediate medical attention.',
    },
  },
  {
    name: 'Expanding Foam (PU)',
    type: 'sealant',
    data: {
      product_name: 'Polyurethane Expanding Foam',
      substance_type: 'sealant',
      hazard_pictograms: ['flammable', 'harmful', 'health_hazard'] as HazardPictogram[],
      hazard_statements: ['H222 Extremely flammable aerosol', 'H317 May cause allergic skin reaction', 'H334 May cause allergy or asthma symptoms if inhaled'],
      route_of_exposure: ['inhalation', 'skin_contact'] as RouteOfExposure[],
      control_measures: ['Use in well-ventilated area', 'Avoid skin contact', 'Keep away from heat and flames'],
      ppe_required: ['nitrile_gloves', 'safety_goggles', 'ffp2_mask', 'overalls'],
      health_effects: 'Contains isocyanates which may cause sensitisation. Once sensitised, very small exposures can trigger asthma attacks.',
      health_surveillance_required: true,
      health_surveillance_details: 'Respiratory surveillance for isocyanate exposure',
      first_aid_measures: DEFAULT_FIRST_AID,
    },
  },
  {
    name: 'Silicone Sealant',
    type: 'sealant',
    data: {
      product_name: 'Silicone Sealant',
      substance_type: 'sealant',
      hazard_pictograms: ['harmful'] as HazardPictogram[],
      route_of_exposure: ['inhalation', 'skin_contact'] as RouteOfExposure[],
      control_measures: ['Ensure adequate ventilation', 'Avoid prolonged skin contact'],
      ppe_required: ['nitrile_gloves'],
      health_effects: 'May release acetic acid vapour during curing which can irritate eyes and respiratory system.',
      first_aid_measures: DEFAULT_FIRST_AID,
    },
  },
  {
    name: 'Epoxy Resin',
    type: 'resin',
    data: {
      product_name: 'Epoxy Resin (Two-Part)',
      substance_type: 'resin',
      hazard_pictograms: ['corrosive', 'harmful', 'health_hazard'] as HazardPictogram[],
      hazard_statements: ['H315 Causes skin irritation', 'H317 May cause allergic skin reaction', 'H319 Causes serious eye irritation'],
      route_of_exposure: ['skin_contact', 'eye_contact', 'inhalation'] as RouteOfExposure[],
      control_measures: ['Avoid skin contact', 'Use in well-ventilated area', 'Clean up spills immediately'],
      ppe_required: ['nitrile_gloves', 'safety_goggles', 'overalls'],
      health_effects: 'Strong sensitiser - can cause allergic dermatitis. Once sensitised, even trace amounts can trigger reaction.',
      health_surveillance_required: true,
      health_surveillance_details: 'Skin surveillance for epoxy dermatitis',
      first_aid_measures: DEFAULT_FIRST_AID,
    },
  },
  {
    name: 'Diesel Fuel',
    type: 'fuel',
    data: {
      product_name: 'Diesel Fuel',
      substance_type: 'fuel',
      hazard_pictograms: ['flammable', 'harmful', 'health_hazard', 'environmental'] as HazardPictogram[],
      hazard_statements: ['H226 Flammable liquid', 'H304 May be fatal if swallowed and enters airways', 'H332 Harmful if inhaled', 'H411 Toxic to aquatic life'],
      route_of_exposure: ['inhalation', 'skin_contact', 'ingestion'] as RouteOfExposure[],
      control_measures: ['Store in approved containers', 'Keep away from ignition sources', 'Prevent release to environment', 'No smoking'],
      ppe_required: ['nitrile_gloves', 'safety_goggles'],
      health_effects: 'Harmful if swallowed. Prolonged skin contact causes dermatitis. Vapours may cause headache and nausea.',
      spill_procedure: 'Contain spill with absorbent material. Prevent entry to drains. Dispose of as hazardous waste.',
      first_aid_measures: 'Skin: Wash with soap and water. Ingestion: DO NOT induce vomiting - seek immediate medical attention.',
    },
  },
  {
    name: 'Brick Acid',
    type: 'cleaning_chemical',
    data: {
      product_name: 'Brick Acid (Hydrochloric)',
      substance_type: 'cleaning_chemical',
      hazard_pictograms: ['corrosive', 'harmful'] as HazardPictogram[],
      hazard_statements: ['H290 May be corrosive to metals', 'H314 Causes severe skin burns and eye damage', 'H335 May cause respiratory irritation'],
      route_of_exposure: ['skin_contact', 'eye_contact', 'inhalation'] as RouteOfExposure[],
      control_measures: ['Dilute before use', 'Use in well-ventilated area', 'Never mix with bleach or other chemicals'],
      ppe_required: ['nitrile_gloves', 'face_shield', 'chemical_apron', 'safety_boots'],
      health_effects: 'Causes severe burns to skin and eyes. Fumes are corrosive to respiratory system.',
      first_aid_measures: 'Skin/Eyes: Flush immediately with water for at least 20 minutes. Seek immediate medical attention.',
    },
  },
  {
    name: 'Silica Dust',
    type: 'dust',
    data: {
      product_name: 'Silica Dust (Respirable Crystalline)',
      substance_type: 'dust',
      hazard_pictograms: ['health_hazard'] as HazardPictogram[],
      hazard_statements: ['H350 May cause cancer', 'H372 Causes damage to lungs through prolonged exposure'],
      route_of_exposure: ['inhalation'] as RouteOfExposure[],
      control_measures: ['Water suppression when cutting', 'Use LEV or on-tool extraction', 'Vacuum with H-class vacuum', 'Never dry sweep'],
      ppe_required: ['ffp3_mask', 'safety_goggles', 'overalls'],
      workplace_exposure_limit: '0.1 mg/m³ (8hr TWA)',
      health_effects: 'Causes silicosis (irreversible lung scarring). Classified as carcinogenic. COPD risk.',
      health_surveillance_required: true,
      health_surveillance_details: 'Respiratory health surveillance including lung function tests',
      first_aid_measures: 'Inhalation: Move to fresh air. Seek medical attention if breathing difficulties develop.',
    },
  },
  {
    name: 'Wood Dust',
    type: 'dust',
    data: {
      product_name: 'Wood Dust',
      substance_type: 'dust',
      hazard_pictograms: ['health_hazard'] as HazardPictogram[],
      hazard_statements: ['H351 Suspected of causing cancer (hardwood)', 'H334 May cause allergy or asthma symptoms'],
      route_of_exposure: ['inhalation'] as RouteOfExposure[],
      control_measures: ['Use LEV or on-tool extraction', 'Vacuum with H-class vacuum', 'Never dry sweep', 'Dampen before sweeping'],
      ppe_required: ['ffp2_mask', 'safety_goggles'],
      workplace_exposure_limit: '3 mg/m³ (softwood), 5 mg/m³ (hardwood)',
      health_effects: 'Hardwood dust is a known carcinogen (nasal cancer). Can cause occupational asthma and dermatitis.',
      health_surveillance_required: true,
      health_surveillance_details: 'Respiratory surveillance for dust exposure',
      first_aid_measures: DEFAULT_FIRST_AID,
    },
  },
];

interface CommonSubstancesProps {
  onQuickAdd: (data: Partial<COSHHFormData>) => void;
}

export const CommonSubstancesPrompt = ({ onQuickAdd }: CommonSubstancesProps) => {
  return (
    <div className="bg-card rounded-xl border-2 border-dashed border-border p-8 text-center">
      <div className="h-16 w-16 rounded-2xl bg-primary/10 mx-auto mb-4 flex items-center justify-center">
        <FlaskConical className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        No substances registered
      </h3>
      <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
        Start building your COSHH register by adding hazardous substances used on site.
        Use the quick-add buttons below for common construction substances.
      </p>

      <div className="mb-6">
        <p className="text-sm font-medium text-foreground mb-3">
          Common construction substances to consider:
        </p>
        <div className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto">
          {COMMON_SUBSTANCES.map((substance) => (
            <Button
              key={substance.name}
              variant="outline"
              size="sm"
              onClick={() => onQuickAdd(substance.data)}
              className="text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              {substance.name}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export { COMMON_SUBSTANCES };
