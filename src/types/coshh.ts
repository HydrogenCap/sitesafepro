export type SubstanceType = 
  | 'paint' 
  | 'adhesive' 
  | 'solvent' 
  | 'cement' 
  | 'dust' 
  | 'oil' 
  | 'cleaning_chemical' 
  | 'sealant' 
  | 'resin' 
  | 'insulation' 
  | 'wood_treatment' 
  | 'fuel' 
  | 'gas' 
  | 'other';

export type HazardPictogram = 
  | 'flammable' 
  | 'oxidiser' 
  | 'explosive' 
  | 'toxic' 
  | 'harmful' 
  | 'corrosive' 
  | 'gas_under_pressure' 
  | 'health_hazard' 
  | 'environmental';

export type RouteOfExposure = 
  | 'inhalation' 
  | 'skin_contact' 
  | 'eye_contact' 
  | 'ingestion';

export type PPEType = 
  | 'nitrile_gloves'
  | 'latex_gloves'
  | 'safety_goggles'
  | 'face_shield'
  | 'ffp2_mask'
  | 'ffp3_mask'
  | 'rpe'
  | 'overalls'
  | 'chemical_apron'
  | 'safety_boots';

export interface COSHHSubstance {
  id: string;
  organisation_id: string;
  project_id: string;
  product_name: string;
  manufacturer: string | null;
  substance_type: SubstanceType;
  hazard_pictograms: HazardPictogram[];
  hazard_statements: string[];
  precautionary_statements: string[];
  route_of_exposure: RouteOfExposure[];
  health_effects: string | null;
  control_measures: string[];
  ppe_required: string[];
  storage_location: string | null;
  storage_requirements: string | null;
  quantity_on_site: string | null;
  sds_document_id: string | null;
  sds_available: boolean;
  workplace_exposure_limit: string | null;
  health_surveillance_required: boolean;
  health_surveillance_details: string | null;
  first_aid_measures: string | null;
  spill_procedure: string | null;
  fire_fighting_measures: string | null;
  is_active: boolean;
  added_by: string;
  created_at: string;
  updated_at: string;
}

export interface COSHHFormData {
  product_name: string;
  manufacturer: string;
  substance_type: SubstanceType;
  quantity_on_site: string;
  hazard_pictograms: HazardPictogram[];
  hazard_statements: string[];
  precautionary_statements: string[];
  route_of_exposure: RouteOfExposure[];
  health_effects: string;
  control_measures: string[];
  ppe_required: string[];
  workplace_exposure_limit: string;
  health_surveillance_required: boolean;
  health_surveillance_details: string;
  storage_location: string;
  storage_requirements: string;
  first_aid_measures: string;
  spill_procedure: string;
  fire_fighting_measures: string;
}

export const SUBSTANCE_TYPE_LABELS: Record<SubstanceType, string> = {
  paint: 'Paint',
  adhesive: 'Adhesive',
  solvent: 'Solvent',
  cement: 'Cement',
  dust: 'Dust',
  oil: 'Oil',
  cleaning_chemical: 'Cleaning Chemical',
  sealant: 'Sealant',
  resin: 'Resin',
  insulation: 'Insulation',
  wood_treatment: 'Wood Treatment',
  fuel: 'Fuel',
  gas: 'Gas',
  other: 'Other',
};

export const HAZARD_PICTOGRAM_INFO: Record<HazardPictogram, { label: string; emoji: string; color: string }> = {
  flammable: { label: 'Flammable', emoji: '🔥', color: 'bg-orange-500' },
  oxidiser: { label: 'Oxidiser', emoji: '⚗️', color: 'bg-yellow-500' },
  explosive: { label: 'Explosive', emoji: '💥', color: 'bg-red-600' },
  toxic: { label: 'Toxic (Acute)', emoji: '💀', color: 'bg-red-500' },
  harmful: { label: 'Harmful/Irritant', emoji: '☠️', color: 'bg-amber-500' },
  corrosive: { label: 'Corrosive', emoji: '🧪', color: 'bg-purple-500' },
  gas_under_pressure: { label: 'Gas Under Pressure', emoji: '⛽', color: 'bg-blue-500' },
  health_hazard: { label: 'Health Hazard', emoji: '🫁', color: 'bg-pink-500' },
  environmental: { label: 'Environmental', emoji: '🐟', color: 'bg-green-500' },
};

export const ROUTE_OF_EXPOSURE_LABELS: Record<RouteOfExposure, string> = {
  inhalation: 'Inhalation',
  skin_contact: 'Skin Contact',
  eye_contact: 'Eye Contact',
  ingestion: 'Ingestion',
};

export const PPE_TYPE_LABELS: Record<PPEType, string> = {
  nitrile_gloves: 'Nitrile Gloves',
  latex_gloves: 'Latex Gloves',
  safety_goggles: 'Safety Goggles',
  face_shield: 'Face Shield',
  ffp2_mask: 'FFP2 Mask',
  ffp3_mask: 'FFP3 Mask',
  rpe: 'RPE (Respiratory)',
  overalls: 'Overalls/Coveralls',
  chemical_apron: 'Chemical-Resistant Apron',
  safety_boots: 'Safety Boots',
};

export const COMMON_CONTROL_MEASURES = [
  'Use in well-ventilated area or with LEV (local exhaust ventilation)',
  'Avoid skin contact — use barrier cream and wash hands after use',
  'Keep containers closed when not in use',
  'Do not eat, drink, or smoke when using this product',
  'Dispose of in accordance with local regulations',
  'Store away from heat sources and ignition points',
  'Use only non-sparking tools',
  'Ground and bond containers when transferring material',
];

export const COMMON_HAZARD_STATEMENTS = [
  'H225 Highly flammable liquid and vapour',
  'H226 Flammable liquid and vapour',
  'H302 Harmful if swallowed',
  'H304 May be fatal if swallowed and enters airways',
  'H315 Causes skin irritation',
  'H317 May cause an allergic skin reaction',
  'H318 Causes serious eye damage',
  'H319 Causes serious eye irritation',
  'H332 Harmful if inhaled',
  'H335 May cause respiratory irritation',
  'H336 May cause drowsiness or dizziness',
  'H400 Very toxic to aquatic life',
];

export const COMMON_PRECAUTIONARY_STATEMENTS = [
  'P210 Keep away from heat, sparks, open flames, hot surfaces',
  'P233 Keep container tightly closed',
  'P240 Ground and bond container and receiving equipment',
  'P260 Do not breathe dust/fumes/gas/mist/vapours/spray',
  'P264 Wash hands thoroughly after handling',
  'P270 Do not eat, drink or smoke when using this product',
  'P271 Use only outdoors or in well-ventilated area',
  'P280 Wear protective gloves/eye protection/face protection',
  'P302+P352 IF ON SKIN: Wash with plenty of water',
  'P305+P351+P338 IF IN EYES: Rinse cautiously with water',
  'P403+P235 Store in well-ventilated place. Keep cool',
];

export const DEFAULT_FIRST_AID = `Skin: Wash with plenty of water and soap. Remove contaminated clothing.
Eyes: Irrigate with clean water for at least 15 minutes. Seek medical attention if irritation persists.
Inhalation: Move to fresh air. Seek medical attention if symptoms persist.
Ingestion: Do not induce vomiting. Rinse mouth with water. Seek medical attention immediately.`;
