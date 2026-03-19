import { RequirementDefinition } from "./RequirementCard";

export const COMPLIANCE_REQUIREMENTS: RequirementDefinition[] = [
  {
    type: "f10",
    label: "F10 Notification to HSE",
    description:
      "The principal contractor must notify HSE using Form F10 before construction work begins on projects lasting more than 30 working days with more than 20 workers at any point, or exceeding 500 person-days of construction work.",
    actions: [
      { type: "upload", label: "Upload F10", icon: "upload" },
      { type: "confirm", label: "Already Submitted to HSE", icon: "file-check" },
      { type: "exempt", label: "F10 Not Required", icon: "x-circle" },
    ],
  },
  {
    type: "asbestos_survey",
    label: "Asbestos Refurbishment & Demolition Survey",
    description:
      "A Refurbishment and Demolition Survey (R&D Survey) must be carried out before any refurbishment or demolition work begins. This identifies the location and extent of any asbestos-containing materials (ACMs) that could be disturbed during the works.",
    actions: [
      { type: "upload", label: "Upload R&D Survey", icon: "upload" },
      { type: "exempt", label: "New Build (No Existing Structures)", icon: "x-circle" },
    ],
  },
  {
    type: "asbestos_cleanliness",
    label: "Schedule of Cleanliness",
    description:
      "If asbestos removal works have been carried out, a documented Schedule of Cleanliness must confirm that the area has been properly decontaminated and is safe for re-occupation. This includes visual inspection records and air monitoring results.",
    actions: [
      { type: "upload", label: "Upload Schedule", icon: "upload" },
      { type: "exempt", label: "No Asbestos Removal Required", icon: "x-circle" },
    ],
  },
  {
    type: "consignment_note",
    label: "Consignment Note for Asbestos Disposal",
    description:
      "Waste transfer consignment notes are required for the disposal of asbestos waste. These must be retained for at least 3 years and demonstrate proper disposal through a licensed waste carrier to an authorised facility.",
    actions: [
      { type: "upload", label: "Upload Consignment Note", icon: "upload" },
      { type: "exempt", label: "No Asbestos Waste Generated", icon: "x-circle" },
    ],
  },
  {
    type: "pci",
    label: "Pre-Construction Information (PCI)",
    description:
      "Pre-Construction Information must be provided by the Client to the Principal Designer and Principal Contractor before the construction phase begins. It includes information about the project, planning and management, health and safety hazards, and relevant design information. (CDM 2015 Regulation 4)",
    actions: [
      { type: "upload", label: "Upload PCI Document", icon: "upload" },
      { type: "confirm", label: "PCI Received (Alternative Format)", icon: "file-check" },
    ],
  },
  {
    type: "construction_phase_plan",
    label: "Construction Phase Plan (CPP)",
    description:
      "The Principal Contractor must draw up a Construction Phase Plan before the construction phase begins. It must set out the health and safety arrangements, site rules, and specific measures for high-risk work. The plan must be reviewed and updated throughout the project. (CDM 2015 Regulation 12)",
    actions: [
      { type: "upload", label: "Upload CPP", icon: "upload" },
      { type: "confirm", label: "CPP Prepared (Alternative Format)", icon: "file-check" },
    ],
  },
  {
    type: "pc_appointment",
    label: "Principal Contractor Appointment",
    description:
      "For projects with more than one contractor, the Client must appoint a Principal Contractor in writing before the construction phase begins. The PC must be an organisation (not an individual) with the skills, knowledge, and experience to carry out the role. (CDM 2015 Regulation 5)",
    actions: [
      { type: "upload", label: "Upload Appointment Letter", icon: "upload" },
      { type: "confirm", label: "PC Appointed (Verbal/Email)", icon: "file-check" },
    ],
  },
];

export const getExemptionReasonForType = (
  type: string,
  customReason?: string
): string => {
  switch (type) {
    case "f10":
      return customReason || "Project does not meet F10 notification threshold under CDM 2015";
    case "asbestos_survey":
      return "New-build project — no existing structures to survey";
    case "asbestos_cleanliness":
      return "No asbestos removal works required on this project";
    case "consignment_note":
      return "No asbestos waste generated on this project";
    default:
      return customReason || "Not applicable for this project";
  }
};
