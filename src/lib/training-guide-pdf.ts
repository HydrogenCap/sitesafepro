import { jsPDF } from "jspdf";
import { PDF_COLORS, addFooter, checkPageBreak } from "./pdf-utils";

interface Section {
  title: string;
  subsections: { heading: string; content: string[] }[];
  tip?: string;
}

const sections: Section[] = [
  {
    title: "1. Getting Started",
    subsections: [
      {
        heading: "Creating Your Account",
        content: [
          "1. Visit sitesafepro.co.uk and click Sign Up in the top right corner.",
          "2. Enter your full name, email address, phone number, and choose a password.",
          "3. Click Create Account. You will be logged in automatically.",
          "4. You will be taken to the Onboarding wizard.",
        ],
      },
      {
        heading: "Onboarding Wizard",
        content: [
          "The onboarding wizard walks you through four steps to set up your organisation:",
          "1. Create Organisation — Enter your company name.",
          "2. Invite Team Members — Add colleagues by email with roles: Admin, Site Manager, or Contractor.",
          "3. Create Your First Project — Enter project name, address, client name, dates, and description.",
          "4. Choose Your Plan — Select Starter (£49/month), Professional (£99/month), or Enterprise (£199/month).",
        ],
      },
    ],
    tip: "You can complete onboarding in any order and come back to unfinished steps later from the Dashboard.",
  },
  {
    title: "2. Dashboard Overview",
    subsections: [
      {
        heading: "What You Will See",
        content: [
          "• Project summary cards — Your active projects with quick-access links.",
          "• Actions widget — Open and overdue corrective actions requiring attention.",
          "• Recent activity feed — Latest uploads, sign-ins, and status changes.",
          "• Site diary reminder — Whether today's diary entry has been completed.",
          "• Quick stats — Documents uploaded, contractors on site, compliance status.",
        ],
      },
      {
        heading: "Navigation",
        content: [
          "The left sidebar (or bottom menu on mobile) contains links to every section: Dashboard, Projects, Documents, RAMS, Actions, Site Access, Inductions, Toolbox Talks, Permits, Inspections, Incidents, Contractors, Team, Activity, Analytics, Reports, and Settings.",
        ],
      },
    ],
  },
  {
    title: "3. Projects",
    subsections: [
      {
        heading: "Creating a New Project",
        content: [
          "1. Go to Projects from the sidebar and click New Project.",
          "2. Enter the project name, site address, client name, start date, estimated end date, and a description.",
          "3. Click Create Project. The project is created in 'setup' mode.",
        ],
      },
      {
        heading: "Pre-Construction Compliance Checklist",
        content: [
          "Every new project starts in 'setup' mode. Before going live, complete the five requirements:",
          "1. F10 Notification to HSE — Upload, confirm submitted, or declare exempt.",
          "2. Asbestos R&D Survey — Upload the survey report, or mark exempt for new-build projects.",
          "3. Schedule of Cleanliness — Upload clearance certificate or mark exempt.",
          "4. Consignment Note — Upload waste transfer note or mark exempt.",
          "5. Pre-Construction Information (PCI) — Upload the PCI document from the client.",
        ],
      },
      {
        heading: "Going Live",
        content: [
          "Once all five checklist items are satisfied, the Go Live button becomes active. Clicking Go Live changes the project status to 'active' and auto-generates site-specific documents from your template library.",
        ],
      },
    ],
    tip: "For new-build projects with no asbestos involvement, items 2–4 can all be marked as exempt.",
  },
  {
    title: "4. Documents",
    subsections: [
      {
        heading: "Uploading a Document",
        content: [
          "1. Go to Documents from the sidebar (or a project's Documents tab).",
          "2. Click Upload Document.",
          "3. Drag and drop a file or browse. Supported types: PDF, DOCX, JPG, PNG, XLSX, and more.",
          "4. The system will classify the document using AI or filename matching.",
          "5. Enter a name and optional description. Set whether acknowledgement is required.",
          "6. Click Upload.",
        ],
      },
      {
        heading: "Document Categories",
        content: [
          "14 categories: RAMS, Method Statement, Safety Plan, COSHH, Induction, Permit, Inspection, Certificate, Insurance, Risk Assessment, Fire Safety, Meeting Minutes, Drawing, and Other.",
        ],
      },
      {
        heading: "Document Acknowledgements",
        content: [
          "When set to 'requires acknowledgement', every contractor must open, read, and digitally sign. Progress bars show completion. You can send reminders via WhatsApp or email.",
        ],
      },
    ],
    tip: "Use the Generate Document button to create common documents from AI-powered templates.",
  },
  {
    title: "5. RAMS Builder",
    subsections: [
      {
        heading: "Overview",
        content: [
          "The RAMS Builder lets you create professional Risk Assessments and Method Statements without typing them from scratch.",
        ],
      },
      {
        heading: "Step 1: Project & Work Details",
        content: ["Select the project, enter a title, describe the work, specify location and duration, and set assessment/review dates."],
      },
      {
        heading: "Step 2: Select Activities",
        content: ["Browse the activity library by category: General Site, Groundworks, Structural, Working at Height, Services & Finishes, and Specialist."],
      },
      {
        heading: "Step 3: Risk Assessments",
        content: ["Each activity generates pre-populated risk assessments. Edit hazard description, severity (1–5), probability (1–5), controls, who is at risk, and comments."],
      },
      {
        heading: "Step 4: Method Statements",
        content: ["Edit, reorder, add, or remove steps. Includes PPE, plant & equipment, permits, legislation, supervision, and emergency procedures."],
      },
      {
        heading: "Step 5: Review & Sign",
        content: ["Review the complete document, add signatures, and export as PDF."],
      },
    ],
  },
  {
    title: "6. Corrective Actions",
    subsections: [
      {
        heading: "Raising an Action",
        content: [
          "1. Go to Actions and click Raise Action.",
          "2. Enter a title and description.",
          "3. Take a photo or upload evidence.",
          "4. Set priority: Critical (today), High (tomorrow), Medium (7 days), Low (14 days).",
          "5. Select source: Inspection, Incident, Audit, Toolbox Talk, Observation, Near Miss, Client Request, or Other.",
          "6. Assign to a person or company and select the project.",
          "7. Click Raise Action.",
        ],
      },
      {
        heading: "The Action Lifecycle",
        content: [
          "1. Open — Raised and assigned. Assignee notified.",
          "2. In Progress — Work has started.",
          "3. Awaiting Verification — Fix submitted with notes and 'after' photo.",
          "4. Closed — Verifier confirms the fix is adequate.",
        ],
      },
    ],
    tip: "Overdue actions are highlighted in red with a pulsing indicator.",
  },
  {
    title: "7. Site Access & QR Codes",
    subsections: [
      {
        heading: "Setting Up Site Access",
        content: [
          "1. Go to Site Access from the sidebar.",
          "2. Select a project and click Generate QR Code if needed.",
          "3. Print the QR code and display at your site entrance.",
        ],
      },
      {
        heading: "How Sign-In Works",
        content: ["Workers scan the QR code, enter name, company, trade, and email, then tap Sign In. On departure, scan again and tap Sign Out."],
      },
      {
        heading: "Live Headcount",
        content: ["Shows everyone currently on site with name, company, trade, arrival time, and duration. Serves as your emergency roll call list."],
      },
      {
        heading: "Inductions",
        content: ["Configure site inductions visitors must complete on first sign-in. Completions are recorded for audit purposes."],
      },
    ],
  },
  {
    title: "8. Toolbox Talks",
    subsections: [
      {
        heading: "Delivering a Talk",
        content: [
          "1. Go to Toolbox Talks from the sidebar.",
          "2. Browse templates (35 system + custom). Use search or category filter.",
          "3. Click Deliver on your chosen template.",
          "4. Read the talk content aloud.",
          "5. Add attendees with digital signatures.",
          "6. Add discussion notes.",
          "7. Click Complete Talk.",
        ],
      },
      {
        heading: "Creating Custom Templates",
        content: ["Enter a title, category, content, and estimated duration. Custom templates are available for all your projects."],
      },
    ],
    tip: "Toolbox talks should ideally be delivered weekly.",
  },
  {
    title: "9. Permits to Work",
    subsections: [
      {
        heading: "Creating a Permit",
        content: [
          "1. Go to Permits and click New Permit.",
          "2. Select type: Hot Work, Confined Space, Excavation, Electrical Isolation, Working at Height, Roof Work, Demolition, Lifting Operations, or General.",
          "3. Enter title, description, and project.",
          "4. Set valid from/to dates. Add precautions and control measures.",
        ],
      },
    ],
  },
  {
    title: "10. Inspections",
    subsections: [
      {
        heading: "Creating an Inspection",
        content: [
          "1. Go to Inspections and click New Inspection.",
          "2. Select type: Scaffold, Excavation, Lifting Equipment, Electrical, Fire Safety, Housekeeping, PPE Compliance, or General Site.",
          "3. Complete the checklist: Pass, Fail, Requires Action, or N/A for each item.",
          "4. Upload photos of defects.",
          "5. Record the overall result.",
          "6. Raise corrective actions directly from failed items.",
        ],
      },
    ],
  },
  {
    title: "11. Incidents",
    subsections: [
      {
        heading: "Reporting an Incident",
        content: [
          "1. Go to Incidents and click Report Incident.",
          "2. Enter title, description, date/time, location, and project.",
          "3. Select severity: Near Miss, Minor Injury, Major Injury, Dangerous Occurrence, or Fatality.",
          "4. Record people involved and witness information.",
          "5. Upload photos.",
          "6. Workflow: Reported → Under Investigation → Action Required → Closed.",
          "RIDDOR-reportable incidents are flagged automatically.",
        ],
      },
    ],
  },
  {
    title: "12. Contractor Management",
    subsections: [
      {
        heading: "Adding a Contractor",
        content: [
          "1. Go to Contractors and click Add Contractor.",
          "2. Enter company name, primary trade, contact details, and tax status.",
          "3. Define required compliance documents.",
          "4. Click Save. Compliance starts at 'red' until documents are uploaded.",
        ],
      },
      {
        heading: "Tracking Compliance",
        content: [
          "Each required document shows as: valid (green), expiring soon (amber), expired (red), or not uploaded (grey). Request documents via secure upload links.",
        ],
      },
      {
        heading: "Operatives",
        content: ["Register operatives with name, trade, CSCS card number/type, and expiry date. Expiring cards are flagged."],
      },
    ],
    tip: "Use the Contractors list page summary cards for your weekly compliance review.",
  },
  {
    title: "13. Site Diary",
    subsections: [
      {
        heading: "Completing a Daily Entry",
        content: [
          "1. Go to the Project Detail page > Site Diary tab.",
          "2. Click Today's Entry (or select a past date).",
          "3. Complete Weather, Workforce, and Work Carried Out sections (minimum).",
          "4. Optionally complete: Deliveries, Visitors, Plant & Equipment, H&S observations, Instructions & Variations, Delays, Photos.",
          "5. Click Complete Entry. Auto-saves every 30 seconds.",
        ],
      },
    ],
    tip: "Aim for 100% diary completion — it's your strongest evidence in any dispute or investigation.",
  },
  {
    title: "14. COSHH Register",
    subsections: [
      {
        heading: "Adding a Substance",
        content: [
          "1. Go to the Project Detail page > COSHH tab.",
          "2. Click Add Substance or use Quick Add for common substances.",
          "3. Enter product name, manufacturer, substance type.",
          "4. Select GHS hazard pictograms.",
          "5. Enter routes of exposure, health effects, control measures.",
          "6. Select required PPE.",
          "7. Enter storage location and requirements.",
          "8. Upload the Safety Data Sheet (SDS) — legally required.",
          "9. Click Save.",
        ],
      },
    ],
  },
  {
    title: "15. Client Portal (Enterprise)",
    subsections: [
      {
        heading: "Inviting a Client",
        content: [
          "1. Go to Settings > Clients.",
          "2. Click Invite Client.",
          "3. Enter email, name, company, and role.",
          "4. Select accessible projects.",
          "5. Click Send Invitation.",
          "Clients see a read-only dashboard with compliance scores, documents, actions, workforce, and diary completion.",
        ],
      },
    ],
  },
  {
    title: "16. Settings & Administration",
    subsections: [
      { heading: "Profile", content: ["Update your name, email, phone, and avatar."] },
      { heading: "Organisation", content: ["Update company name, logo, and contact details."] },
      {
        heading: "Templates",
        content: [
          "Upload master document templates auto-generated on project go-live.",
          "Templates are copied (not linked) to each project.",
        ],
      },
      {
        heading: "Notifications",
        content: ["Configure email, push, and WhatsApp notifications for acknowledgements, actions, permits, site access, and compliance reminders."],
      },
      { heading: "Subscription", content: ["View plan, usage, and billing. Upgrade, downgrade, or manage payment."] },
      {
        heading: "WhatsApp",
        content: ["Configure WhatsApp Business API credentials for notifications. Delivery and read receipts are tracked."],
      },
    ],
    tip: "WhatsApp messages require explicit opt-in from each recipient.",
  },
];

export function generateTrainingGuidePdf() {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  // ── Cover Page ──
  doc.setFillColor(15, 118, 110);
  doc.rect(0, 0, pageWidth, 120, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(32);
  doc.setFont("helvetica", "bold");
  doc.text("Site Safe", pageWidth / 2, 50, { align: "center" });
  doc.setFontSize(24);
  doc.text("Training Guide", pageWidth / 2, 65, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("A complete guide to using every feature of the platform", pageWidth / 2, 85, { align: "center" });
  doc.text("Version 1.0 — February 2026", pageWidth / 2, 100, { align: "center" });

  // TOC
  let y = 140;
  doc.setTextColor(...PDF_COLORS.text);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Contents", margin, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  sections.forEach((s) => {
    doc.text(s.title, margin + 5, y);
    y += 6;
  });

  // ── Content Pages ──
  sections.forEach((section) => {
    doc.addPage();
    y = 25;

    // Section title
    doc.setFillColor(15, 118, 110);
    doc.rect(margin, y - 6, contentWidth, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(section.title, margin + 4, y + 1);
    y += 14;

    section.subsections.forEach((sub) => {
      y = checkPageBreak(doc, y, 25);

      // Subsection heading
      doc.setTextColor(...PDF_COLORS.primary);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(sub.heading, margin, y);
      y += 7;

      // Content lines
      doc.setTextColor(...PDF_COLORS.text);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      sub.content.forEach((line) => {
        const wrapped = doc.splitTextToSize(line, contentWidth);
        wrapped.forEach((wl: string) => {
          y = checkPageBreak(doc, y, 12);
          doc.text(wl, margin, y);
          y += 5;
        });
        y += 1;
      });

      y += 3;
    });

    // Tip box
    if (section.tip) {
      y = checkPageBreak(doc, y, 20);
      doc.setFillColor(245, 245, 220);
      const tipLines = doc.splitTextToSize("💡 Tip: " + section.tip, contentWidth - 10);
      const tipHeight = tipLines.length * 5 + 6;
      doc.roundedRect(margin, y - 4, contentWidth, tipHeight, 2, 2, "F");
      doc.setTextColor(...PDF_COLORS.muted);
      doc.setFontSize(9);
      doc.text(tipLines, margin + 5, y + 1);
      y += tipHeight + 4;
    }
  });

  addFooter(doc, "Site Safe");
  doc.save("SiteSafe_Training_Guide.pdf");
}
