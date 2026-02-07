// Default document templates that can be loaded for new organisations
export interface DefaultTemplate {
  name: string;
  description: string;
  category: "induction" | "safety" | "permits" | "registers" | "other";
  fileName: string;
  requiresAcknowledgement: boolean;
  autoGenerateOnGoLive: boolean;
}

export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  {
    name: "Site Induction Register",
    description: "Record of all personnel who have completed site induction",
    category: "induction",
    fileName: "Site_Induction_Register.docx",
    requiresAcknowledgement: true,
    autoGenerateOnGoLive: true,
  },
  {
    name: "SubContractor RAMS Register",
    description: "Register of all subcontractor Risk Assessments and Method Statements",
    category: "registers",
    fileName: "SubContractor_RAMS_Register.docx",
    requiresAcknowledgement: false,
    autoGenerateOnGoLive: true,
  },
  {
    name: "COSHH Register",
    description: "Control of Substances Hazardous to Health register",
    category: "registers",
    fileName: "COSHH_Register.docx",
    requiresAcknowledgement: false,
    autoGenerateOnGoLive: true,
  },
  {
    name: "Permit to Work Forms",
    description: "Authorisation forms for high-risk work activities",
    category: "permits",
    fileName: "Permit_to_Work_Forms.docx",
    requiresAcknowledgement: true,
    autoGenerateOnGoLive: true,
  },
  {
    name: "Fire Risk Assessment",
    description: "Site fire risk assessment documentation",
    category: "safety",
    fileName: "Fire_Risk_Assessment.docx",
    requiresAcknowledgement: false,
    autoGenerateOnGoLive: true,
  },
  {
    name: "Accident & Incident Report",
    description: "Form for reporting accidents and incidents on site",
    category: "safety",
    fileName: "Accident_Incident_Report.docx",
    requiresAcknowledgement: false,
    autoGenerateOnGoLive: true,
  },
  {
    name: "Scaffold Inspection Register",
    description: "Register for scaffold inspections and certifications",
    category: "registers",
    fileName: "Scaffold_Inspection_Register.docx",
    requiresAcknowledgement: false,
    autoGenerateOnGoLive: true,
  },
  {
    name: "Lifting Equipment Register",
    description: "Register of all lifting equipment and inspection records",
    category: "registers",
    fileName: "Lifting_Equipment_Register.docx",
    requiresAcknowledgement: false,
    autoGenerateOnGoLive: true,
  },
  {
    name: "PAT Testing Register",
    description: "Portable Appliance Testing register",
    category: "registers",
    fileName: "PAT_Testing_Register.docx",
    requiresAcknowledgement: false,
    autoGenerateOnGoLive: true,
  },
  {
    name: "H&S File Contributions Log",
    description: "Log of contributions to the Health & Safety file",
    category: "registers",
    fileName: "HS_File_Contributions_Log.docx",
    requiresAcknowledgement: false,
    autoGenerateOnGoLive: true,
  },
];
