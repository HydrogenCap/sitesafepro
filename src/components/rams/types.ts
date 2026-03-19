// RAMS Builder Types
import { Json } from "@/integrations/supabase/types";

export interface RamsHazard {
  id: string;
  description: string;
  severity: number;
  probability: number;
  existingControls: string[];
  additionalControls: string[];
  whoAtRisk: string;
  residualProbability: number;
  couldBeDesignedOut: boolean;
  canBeRemoved: boolean;
  locationOfHazard: string;
  comments: string;
}

export interface RiskAssessment {
  id: string;
  raNumber: number;
  subject: string;
  locationOfHazard: string;
  canHazardBeRemoved: boolean;
  hazardDescription: string;
  hazardSeverity: number;
  riskProbability: number;
  riskFactor: number;
  riskRating: 'Low' | 'Medium' | 'High';
  existingControls: string[];
  whoAtRisk: string;
  couldBeDesignedOut: boolean;
  additionalControls: string[];
  residualSeverity: number;
  residualProbability: number;
  residualRiskFactor: number;
  residualRiskRating: 'Low' | 'Medium' | 'High';
  comments: string;
}

export interface MethodStep {
  stepNumber: number;
  description: string;
}

export interface MethodStatement {
  id: string;
  msNumber: number;
  subject: string;
  steps: MethodStep[];
  ppe: string[];
  plantEquipment: string[];
  permitRequired: boolean;
  permitType?: string;
  legislationRefs: string[];
  supervision: string;
  emergencyProcedure: string;
}

export interface RamsFormData {
  // Step 1: Project Details
  projectId: string;
  title: string;
  ramsReference: string;
  workDescription: string;
  workLocation: string;
  workDuration: string;
  assessmentDate: Date;
  reviewDate: Date | null;
  
  // Auto-filled from project
  siteName: string;
  siteAddress: string;
  clientName: string;
  principalContractor: string;
  
  // Step 2: Selected Activities
  selectedActivityIds: string[];
  
  // Step 3: Risk Assessments
  riskAssessments: RiskAssessment[];
  
  // Step 4: Method Statements
  methodStatements: MethodStatement[];
  ppeRequirements: string[];
  
  // Step 5: Emergency & Signatures
  emergencyProcedures: string;
  nearestHospital: string;
  siteEmergencyContact: string;
  
  // Signatures
  preparedBySignature: string | null;
  reviewedById: string | null;
  reviewedByName: string | null;
  reviewedBySignature: string | null;
  approvedById: string | null;
  approvedByName: string | null;
  approvedBySignature: string | null;
}

// Database type that matches Supabase schema
export interface ActivityLibraryItem {
  id: string;
  name: string;
  category: string;
  description: string | null;
  default_hazards: Json;
  default_method_steps: Json;
  default_ppe: Json;
  legislation_refs: string[] | null;
}

export const PPE_OPTIONS = [
  'Hard hat',
  'Safety boots',
  'Hi-vis vest',
  'Safety glasses/goggles',
  'Ear protection',
  'Dust mask / RPE',
  'Gloves',
  'Harness & lanyard',
  'Welding mask',
  'Knee pads',
  'Overalls',
] as const;

export const PERMIT_TYPES = [
  'Hot Works',
  'Confined Spaces',
  'Electrical',
  'Working at Height',
  'Excavation',
  'Other',
] as const;

export function calculateRiskRating(severity: number, probability: number): 'Low' | 'Medium' | 'High' {
  const factor = severity * probability;
  if (factor <= 6) return 'Low';
  if (factor <= 16) return 'Medium';
  return 'High';
}

export function getRiskColor(rating: 'Low' | 'Medium' | 'High'): string {
  switch (rating) {
    case 'Low': return 'bg-green-500';
    case 'Medium': return 'bg-amber-500';
    case 'High': return 'bg-destructive';
  }
}

// Helper to safely parse JSON arrays from database
export function parseJsonArray<T>(json: Json): T[] {
  if (Array.isArray(json)) {
    return json as unknown as T[];
  }
  return [];
}
