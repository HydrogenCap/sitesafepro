export type ComplianceDocType =
  // Insurance
  | 'car_insurance'
  | 'public_liability'
  | 'employers_liability'
  | 'professional_indemnity'
  | 'plant_insurance'
  // Personal certifications
  | 'cscs_card'
  | 'gas_safe'
  | 'niceic'
  | 'part_p'
  | 'fgas'
  | 'ipaf'
  | 'pasma'
  | 'cpcs'
  | 'cisrs'
  | 'nvq'
  | 'first_aid'
  | 'fire_marshal'
  | 'sssts'
  | 'smsts'
  | 'asbestos_awareness'
  | 'confined_spaces'
  | 'working_at_height'
  | 'manual_handling'
  | 'abrasive_wheels'
  | 'face_fit'
  // Company accreditations
  | 'chas'
  | 'safe_contractor'
  | 'constructionline'
  | 'smas'
  | 'iso_45001'
  | 'iso_9001'
  | 'iso_14001'
  // Other
  | 'dbs_check'
  | 'right_to_work'
  | 'other';

export type ComplianceStatus = 'compliant' | 'expiring_soon' | 'expired' | 'incomplete';

export type TaxStatus = 'limited_company' | 'sole_trader' | 'partnership' | 'cis_registered';

export type CSCSCardType = 'green_labourer' | 'blue_skilled' | 'gold_supervisor' | 'black_manager' | 'red_trainee' | 'white_professional';

export type RoleOnSite = 'operative' | 'supervisor' | 'foreman' | 'apprentice';

export interface ContractorCompany {
  id: string;
  organisation_id: string;
  company_name: string;
  trading_name: string | null;
  company_registration_number: string | null;
  vat_number: string | null;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  office_address: string | null;
  website: string | null;
  primary_trade: string;
  secondary_trades: string[];
  tax_status: TaxStatus | null;
  utr_number: string | null;
  compliance_status: ComplianceStatus;
  compliance_score: number;
  notes: string | null;
  internal_rating: number | null;
  is_active: boolean;
  is_approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractorComplianceDoc {
  id: string;
  organisation_id: string;
  contractor_company_id: string | null;
  profile_id: string | null;
  doc_type: ComplianceDocType;
  reference_number: string | null;
  provider: string | null;
  cover_amount: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  document_id: string | null;
  file_path: string | null;
  verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  verification_notes: string | null;
  reminder_sent_30_days: boolean;
  reminder_sent_7_days: boolean;
  reminder_sent_expired: boolean;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export interface ContractorOperative {
  id: string;
  organisation_id: string;
  contractor_company_id: string;
  profile_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  trade: string;
  role_on_site: RoleOnSite | null;
  cscs_card_number: string | null;
  cscs_card_type: CSCSCardType | null;
  cscs_expiry_date: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  known_medical_conditions: string | null;
  blood_type: string | null;
  health_data_consent: boolean;
  health_data_consent_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectContractor {
  id: string;
  project_id: string;
  contractor_company_id: string;
  organisation_id: string;
  scope_of_works: string | null;
  trade: string;
  start_date: string | null;
  estimated_end_date: string | null;
  order_value: number | null;
  purchase_order_number: string | null;
  required_doc_types: ComplianceDocType[];
  status: 'pending' | 'active' | 'completed' | 'removed';
  assigned_by: string;
  created_at: string;
}

export const TRADES = [
  { value: 'general_builder', label: 'General Builder' },
  { value: 'electrician', label: 'Electrician' },
  { value: 'plumber', label: 'Plumber' },
  { value: 'plasterer', label: 'Plasterer' },
  { value: 'painter', label: 'Painter & Decorator' },
  { value: 'roofer', label: 'Roofer' },
  { value: 'scaffolder', label: 'Scaffolder' },
  { value: 'groundworker', label: 'Groundworker' },
  { value: 'steelworker', label: 'Steelworker' },
  { value: 'joiner', label: 'Joiner/Carpenter' },
  { value: 'tiler', label: 'Tiler' },
  { value: 'bricklayer', label: 'Bricklayer' },
  { value: 'glazier', label: 'Glazier' },
  { value: 'demolition', label: 'Demolition' },
  { value: 'asbestos_removal', label: 'Asbestos Removal' },
  { value: 'fire_protection', label: 'Fire Protection' },
  { value: 'mechanical', label: 'Mechanical/HVAC' },
  { value: 'cladding', label: 'Cladding' },
  { value: 'flooring', label: 'Flooring' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'other', label: 'Other' },
] as const;

export const COMPLIANCE_DOC_LABELS: Record<ComplianceDocType, { label: string; category: string }> = {
  // Insurance
  car_insurance: { label: 'Contractors All Risk Insurance', category: 'Insurance' },
  public_liability: { label: 'Public Liability Insurance', category: 'Insurance' },
  employers_liability: { label: 'Employers Liability Insurance', category: 'Insurance' },
  professional_indemnity: { label: 'Professional Indemnity Insurance', category: 'Insurance' },
  plant_insurance: { label: 'Plant & Equipment Insurance', category: 'Insurance' },
  // Personal certifications
  cscs_card: { label: 'CSCS Card', category: 'Certifications' },
  gas_safe: { label: 'Gas Safe Registration', category: 'Certifications' },
  niceic: { label: 'NICEIC Electrical', category: 'Certifications' },
  part_p: { label: 'Part P Electrical', category: 'Certifications' },
  fgas: { label: 'F-Gas Certification', category: 'Certifications' },
  ipaf: { label: 'IPAF (MEWPs)', category: 'Certifications' },
  pasma: { label: 'PASMA (Scaffold Towers)', category: 'Certifications' },
  cpcs: { label: 'CPCS (Plant)', category: 'Certifications' },
  cisrs: { label: 'CISRS (Scaffolding)', category: 'Certifications' },
  nvq: { label: 'NVQ/SVQ Qualification', category: 'Certifications' },
  first_aid: { label: 'First Aid at Work', category: 'Training' },
  fire_marshal: { label: 'Fire Marshal', category: 'Training' },
  sssts: { label: 'SSSTS (Site Supervisor)', category: 'Training' },
  smsts: { label: 'SMSTS (Site Manager)', category: 'Training' },
  asbestos_awareness: { label: 'Asbestos Awareness', category: 'Training' },
  confined_spaces: { label: 'Confined Spaces', category: 'Training' },
  working_at_height: { label: 'Working at Height', category: 'Training' },
  manual_handling: { label: 'Manual Handling', category: 'Training' },
  abrasive_wheels: { label: 'Abrasive Wheels', category: 'Training' },
  face_fit: { label: 'RPE Face Fit Testing', category: 'Training' },
  // Accreditations
  chas: { label: 'CHAS', category: 'Accreditations' },
  safe_contractor: { label: 'SafeContractor', category: 'Accreditations' },
  constructionline: { label: 'Constructionline', category: 'Accreditations' },
  smas: { label: 'SMAS Worksafe', category: 'Accreditations' },
  iso_45001: { label: 'ISO 45001 (H&S)', category: 'Accreditations' },
  iso_9001: { label: 'ISO 9001 (Quality)', category: 'Accreditations' },
  iso_14001: { label: 'ISO 14001 (Environmental)', category: 'Accreditations' },
  // Other
  dbs_check: { label: 'DBS Check', category: 'Other' },
  right_to_work: { label: 'Right to Work', category: 'Other' },
  other: { label: 'Other Document', category: 'Other' },
};

export const CSCS_CARD_TYPES = [
  { value: 'green_labourer', label: 'Green - Labourer', color: 'bg-green-500' },
  { value: 'blue_skilled', label: 'Blue - Skilled Worker', color: 'bg-blue-500' },
  { value: 'gold_supervisor', label: 'Gold - Supervisor', color: 'bg-yellow-500' },
  { value: 'black_manager', label: 'Black - Manager', color: 'bg-gray-900' },
  { value: 'red_trainee', label: 'Red - Trainee/Apprentice', color: 'bg-red-500' },
  { value: 'white_professional', label: 'White - Professionally Qualified', color: 'bg-white border border-gray-300' },
] as const;
