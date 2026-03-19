import { jsPDF } from "jspdf";
import { PDF_COLORS, addFooter, checkPageBreak } from "./pdf-utils";

interface Subsection {
  heading: string;
  content: string[];
  table?: { headers: string[]; rows: string[][] };
  list?: string[];
}

interface Section {
  title: string;
  intro?: string;
  subsections: Subsection[];
  callout?: { label: string; text: string };
}

const sections: Section[] = [
  {
    title: "1. Getting Started",
    intro: "SiteSafe is a cloud-based health and safety compliance platform built specifically for UK construction. This guide walks you through every feature from initial account creation to advanced enterprise settings.",
    subsections: [
      {
        heading: "Creating Your Account",
        content: [
          "1. Visit sitesafe.cloud and click Sign Up in the top-right corner.",
          "2. Enter your full name, email address, phone number, and choose a secure password.",
          "3. Click Create Account — you will be logged in automatically and taken to the Onboarding Wizard.",
        ],
      },
      {
        heading: "Onboarding Wizard",
        content: [
          "The Onboarding Wizard guides you through four quick steps to configure your organisation. You can complete them in any order and return later to finish incomplete steps from the Dashboard.",
        ],
        table: {
          headers: ["Step", "What You Do", "Notes"],
          rows: [
            ["1. Create Organisation", "Enter your company name", "Used on all documents"],
            ["2. Invite Team Members", "Add colleagues by email", "Roles: Admin, Site Manager, Contractor"],
            ["3. Create First Project", "Name, address, dates, client, description", "Sets up your first active site"],
            ["4. Choose Your Plan", "Select Starter, Professional, or Enterprise", "Can change at any time"],
          ],
        },
      },
      {
        heading: "Subscription Plans",
        content: [],
        table: {
          headers: ["Plan", "Price", "Best For", "Key Inclusions"],
          rows: [
            ["Starter", "£49/month", "Small contractors, 1–5 users", "Core H&S features, 5 projects"],
            ["Professional", "£99/month", "Growing firms, 5–20 users", "All features, unlimited projects, WhatsApp"],
            ["Enterprise", "£199/month", "Large contractors, 20+ users", "Client Portal, analytics, API access, SLA"],
          ],
        },
      },
    ],
  },
  {
    title: "2. Dashboard Overview",
    intro: "The Dashboard is your command centre. It surfaces real-time information across all active projects so you can spot issues at a glance and act quickly.",
    subsections: [
      {
        heading: "Dashboard Widgets",
        content: [
          "• Project Summary Cards: Active projects with compliance status, last activity, and quick-access links.",
          "• Actions Widget: Open and overdue corrective actions requiring your attention, sorted by urgency.",
          "• Recent Activity Feed: Latest document uploads, contractor sign-ins, and status changes across all projects.",
          "• Site Diary Reminder: Shows whether today's diary entry has been completed for each active project.",
          "• Quick Stats: At-a-glance counts: documents uploaded, contractors on site, and overall compliance score.",
        ],
      },
      {
        heading: "Navigation",
        content: [
          "The left sidebar (or bottom menu bar on mobile) provides access to every section:",
          "Dashboard · Projects · Documents · RAMS · Actions · Site Access · Inductions · Toolbox Talks · Permits · Inspections · Incidents · Contractors · Team · Activity · Analytics · Reports · Settings",
        ],
      },
    ],
    callout: { label: "MOBILE TIP", text: "On mobile, the bottom navigation bar shows your five most-used sections. Tap the More icon to access the full menu." },
  },
  {
    title: "3. Projects",
    intro: "Projects are the foundation of SiteSafe. All documents, actions, diary entries, permits, and inspections live within a project. Every site you manage should have its own project.",
    subsections: [
      {
        heading: "Creating a New Project",
        content: [
          "1. Navigate to Projects in the sidebar and click New Project.",
          "2. Complete the required fields: project name, site address, client name, start date, estimated end date, and description.",
          "3. Click Create Project. The project is created in setup mode.",
        ],
      },
      {
        heading: "Pre-Construction Compliance Checklist",
        content: [
          "Every project starts in setup mode. The following five items must be completed before the project can go live.",
        ],
        table: {
          headers: ["#", "Requirement", "How to Satisfy", "Exempt?"],
          rows: [
            ["1", "F10 Notification to HSE", "Upload, confirm submitted, or declare exempt", "Yes, if threshold not met"],
            ["2", "Asbestos R&D Survey", "Upload survey report", "Yes, for new-build projects"],
            ["3", "Schedule of Cleanliness", "Upload clearance certificate", "Yes, for new-build projects"],
            ["4", "Consignment Note", "Upload waste transfer note", "Yes, for new-build projects"],
            ["5", "Pre-Construction Information (PCI)", "Upload PCI document from client", "No — always required"],
          ],
        },
      },
      {
        heading: "Going Live",
        content: [
          "Once all five checklist items are satisfied, the Go Live button becomes active. Clicking it changes the project status to active and automatically generates site-specific documents from your master template library.",
        ],
      },
    ],
    callout: { label: "SHORTCUT", text: "For new-build projects with no asbestos involvement, items 2, 3, and 4 can all be marked exempt in one click using the New Build Exemption shortcut." },
  },
  {
    title: "4. Documents",
    intro: "The Documents module is a centralised, searchable repository for all project-related files. AI-assisted classification means documents are automatically sorted into the right category.",
    subsections: [
      {
        heading: "Uploading a Document",
        content: [
          "1. Go to Documents from the sidebar, or open a project and click its Documents tab.",
          "2. Click Upload Document.",
          "3. Drag and drop your file or browse to select it. Supported formats: PDF, DOCX, JPG, PNG, XLSX, and more.",
          "4. The system uses AI or filename matching to classify the document automatically.",
          "5. Enter a name and optional description. Toggle Acknowledgement Required if contractors must sign.",
          "6. Click Upload to confirm.",
        ],
      },
      {
        heading: "Document Categories",
        content: [
          "RAMS · Method Statement · Safety Plan · COSHH · Induction · Permit · Inspection · Certificate · Insurance · Risk Assessment · Fire Safety · Meeting Minutes · Drawing · Other",
        ],
      },
      {
        heading: "Document Acknowledgements",
        content: [
          "When a document is set to Requires Acknowledgement, every contractor must open, read, and digitally sign before it is recorded as acknowledged. Progress bars on the document card show completion percentage. You can chase outstanding signatures by sending a reminder via WhatsApp or email directly from the platform.",
        ],
      },
    ],
    callout: { label: "TIP", text: "Use the Generate Document button to create common documents such as site rules, emergency plans, and induction packs directly from AI-assisted templates — no Word editing required." },
  },
  {
    title: "5. RAMS Builder",
    intro: "The RAMS Builder lets you create professional, fully compliant Risk Assessments and Method Statements without starting from a blank page. A pre-populated activity library covers the most common construction tasks.",
    subsections: [
      {
        heading: "Step 1: Project & Work Details",
        content: ["Select the project, enter a document title, describe the scope of work, specify the location and planned duration, and set the assessment and review dates."],
      },
      {
        heading: "Step 2: Select Activities",
        content: ["Browse the activity library by category: General Site, Groundworks, Structural, Working at Height, Services & Finishes, and Specialist. Select all activities relevant to your task."],
      },
      {
        heading: "Step 3: Risk Assessments",
        content: ["Each selected activity generates pre-populated risk assessments. Edit the hazard description, set Severity (1–5) and Probability (1–5), define control measures, identify who is at risk, and add comments."],
      },
      {
        heading: "Step 4: Method Statements",
        content: ["Review and edit the auto-generated method statement. Reorder, add, or remove steps. Sections include PPE, plant & equipment, permits required, relevant legislation, supervision arrangements, and emergency procedures."],
      },
      {
        heading: "Step 5: Review & Sign",
        content: ["Review the complete document, obtain digital signatures from the competent person and approver, then export as a professionally formatted PDF."],
      },
    ],
    callout: { label: "IMPORTANT", text: "RAMS created in SiteSafe are automatically version-controlled. When you revise a document, the previous version is archived and workers are notified to re-acknowledge the updated version." },
  },
  {
    title: "6. Corrective Actions",
    intro: "Corrective Actions are used to record, assign, and track any safety issue or non-conformance until it is fully resolved. Every action has a clear owner, deadline, and audit trail.",
    subsections: [
      {
        heading: "Raising an Action",
        content: [
          "1. Go to Actions and click Raise Action.",
          "2. Enter a clear title and description of the issue.",
          "3. Take a photo or upload existing evidence — a 'before' photo is best practice.",
          "4. Set the priority: Critical (resolve today), High (next day), Medium (7 days), Low (14 days).",
          "5. Select the source: Inspection, Incident, Audit, Toolbox Talk, Observation, Near Miss, Client Request, or Other.",
          "6. Assign to a named person or contractor company and link to a project.",
          "7. Click Raise Action — the assignee is notified immediately by email (and WhatsApp if configured).",
        ],
      },
      {
        heading: "The Action Lifecycle",
        content: [],
        table: {
          headers: ["Status", "Description"],
          rows: [
            ["Open", "Raised and assigned. Assignee notified."],
            ["In Progress", "Work has started. Assignee has acknowledged."],
            ["Awaiting Verification", "Fix submitted with notes and 'after' photo. Awaiting sign-off."],
            ["Closed", "Verifier confirms the fix is adequate. Action complete."],
          ],
        },
      },
    ],
    callout: { label: "ESCALATION", text: "Overdue actions are highlighted in red with a pulsing indicator on the Dashboard and Actions list. Assignees also receive escalation reminders at 50% and 100% of the deadline." },
  },
  {
    title: "7. Site Access & QR Codes",
    intro: "The Site Access module replaces paper sign-in sheets with a contactless QR code system. It maintains a live headcount, automates inductions, and generates a ready-to-use emergency roll call.",
    subsections: [
      {
        heading: "Setting Up Site Access",
        content: [
          "1. Go to Site Access from the sidebar.",
          "2. Select the project and click Generate QR Code if one hasn't been created yet.",
          "3. Print the QR code poster and display prominently at all site entrances.",
        ],
      },
      {
        heading: "How Sign-In Works",
        content: ["Workers scan the QR code with any smartphone camera — no app required. They enter their name, company, trade, and email address, then tap Sign In. On departure they scan again and tap Sign Out. The full log is timestamped and stored for audit purposes."],
      },
      {
        heading: "Live Headcount",
        content: ["The Live Headcount view shows everyone currently on site: name, company, trade, arrival time, and duration. This list doubles as your emergency roll call — accessible from any device in seconds."],
      },
      {
        heading: "Site Inductions",
        content: ["Configure a site-specific induction that visitors must complete on their first sign-in. This can include safety rules, emergency procedures, and video content. Completions are recorded with a timestamp for full audit traceability."],
      },
    ],
    callout: { label: "ENFORCEMENT", text: "Workers who haven't completed their induction are prevented from signing in until they finish all induction steps. This is enforced automatically — no manual checking required." },
  },
  {
    title: "8. Toolbox Talks",
    intro: "Toolbox Talks are short, focused safety briefings delivered on site. SiteSafe includes 35 ready-to-use system templates and unlimited custom templates.",
    subsections: [
      {
        heading: "Delivering a Talk",
        content: [
          "1. Go to Toolbox Talks from the sidebar.",
          "2. Browse system templates (35 available) or search by keyword or category.",
          "3. Click Deliver on your chosen template.",
          "4. Read the talk content aloud to the assembled workforce.",
          "5. Add attendees — each signs digitally on the screen.",
          "6. Record discussion notes, questions raised, and any follow-up actions.",
          "7. Click Complete Talk to save and archive the record.",
        ],
      },
      {
        heading: "Creating Custom Templates",
        content: ["Navigate to Toolbox Talks > Custom Templates and click New Template. Enter a title, select a category, write the content, and set an estimated duration. Custom templates are available across all your projects immediately."],
      },
    ],
    callout: { label: "BEST PRACTICE", text: "Toolbox Talks should be delivered at least once per week. The Dashboard shows the number of days since the last talk was delivered for each project." },
  },
  {
    title: "9. Permits to Work",
    intro: "Permits to Work (PTW) provide a formal documented authorisation for high-risk activities. SiteSafe supports nine permit types covering the most common hazardous operations.",
    subsections: [
      {
        heading: "Permit Types",
        content: [],
        list: ["Hot Work", "Confined Space", "Excavation", "Electrical Isolation", "Working at Height", "Roof Work", "Demolition", "Lifting Operations", "General"],
      },
      {
        heading: "Creating a Permit",
        content: [
          "1. Go to Permits and click New Permit.",
          "2. Select the permit type from the list above.",
          "3. Enter the title, description, and link to the relevant project.",
          "4. Set Valid From and Valid To dates and times.",
          "5. Add precautions, control measures, and any special conditions.",
          "6. Add required signatures — permit issuer and receiver must both sign.",
          "7. Click Issue Permit. Signatories are notified automatically.",
        ],
      },
    ],
    callout: { label: "COMPLIANCE NOTE", text: "Permits cannot be backdated. If high-risk work commences without an active permit, this will be flagged automatically in the project audit log." },
  },
  {
    title: "10. Inspections",
    intro: "Regular inspections are a legal and contractual requirement. SiteSafe provides structured checklists for eight inspection types, with the ability to raise corrective actions directly from failed items.",
    subsections: [
      {
        heading: "Inspection Types",
        content: [],
        list: ["Scaffold", "Excavation", "Lifting Equipment", "Electrical", "Fire Safety", "Housekeeping", "PPE Compliance", "General Site"],
      },
      {
        heading: "Completing an Inspection",
        content: [
          "1. Go to Inspections and click New Inspection.",
          "2. Select the inspection type and link to a project.",
          "3. Work through the checklist — mark each item: Pass, Fail, Requires Action, or N/A.",
          "4. Upload photos of any defects directly from your device.",
          "5. Record the overall result: Pass, Conditional Pass, or Fail.",
          "6. Tap Raise Action next to any failed item to create a linked corrective action.",
          "7. Click Complete Inspection to save and generate a PDF report.",
        ],
      },
    ],
    callout: { label: "LEGAL REMINDER", text: "Scaffold inspections must be carried out every 7 days and after any event that may have affected stability (e.g. high winds). SiteSafe will remind you when the next inspection is due." },
  },
  {
    title: "11. Incidents",
    intro: "All incidents — from near misses to major injuries — must be reported and investigated. SiteSafe automatically flags RIDDOR-reportable events and guides you through the investigation workflow.",
    subsections: [
      {
        heading: "Severity Levels",
        content: [],
        table: {
          headers: ["Level", "Description"],
          rows: [
            ["Near Miss", "No injury, but potential for harm existed."],
            ["Minor Injury", "First aid treatment required."],
            ["Major Injury", "RIDDOR-reportable. Requires HSE notification."],
            ["Dangerous Occurrence", "RIDDOR-reportable. Immediate notification."],
            ["Fatality", "RIDDOR-reportable. Immediately notify HSE and police."],
          ],
        },
      },
      {
        heading: "Reporting an Incident",
        content: [
          "1. Go to Incidents and click Report Incident.",
          "2. Enter title, description, date/time, location, and project.",
          "3. Select the severity level — RIDDOR-reportable events are flagged automatically.",
          "4. Record all people involved and witness details.",
          "5. Upload photographs of the scene.",
          "6. Assign an investigator and set an investigation deadline.",
        ],
      },
      {
        heading: "Investigation Workflow",
        content: ["Reported → Under Investigation → Action Required → Closed"],
      },
    ],
    callout: { label: "RIDDOR OBLIGATION", text: "RIDDOR-reportable incidents must be notified to the HSE within 10 days (3 days for over-7-day incapacitations). SiteSafe will display an on-screen notification and send an email reminder when a reportable incident is logged." },
  },
  {
    title: "12. Contractor Management",
    intro: "Manage your supply chain's compliance in one place. Track insurance, accreditations, operatives' CSCS cards, and all other required documentation from a single dashboard.",
    subsections: [
      {
        heading: "Adding a Contractor",
        content: [
          "1. Go to Contractors and click Add Contractor.",
          "2. Enter company name, primary trade, key contact details, and CIS / tax status.",
          "3. Define the compliance documents required for this contractor (e.g. PLI, EL insurance, CHAS).",
          "4. Click Save. Compliance status starts at red until documents are uploaded.",
        ],
      },
      {
        heading: "Compliance Traffic Light System",
        content: [],
        table: {
          headers: ["Status", "Meaning"],
          rows: [
            ["Valid", "Document present and within expiry date."],
            ["Expiring Soon", "Expires within 30 days — renewal prompt sent."],
            ["Expired", "Past expiry date — contractor flagged."],
            ["Not Uploaded", "Document required but not yet provided."],
          ],
        },
      },
      {
        heading: "Operatives",
        content: ["Register individual workers under each contractor: name, trade, CSCS card type, card number, and expiry date. SiteSafe flags expiring cards 30 days in advance so action can be taken before a card lapses."],
      },
    ],
    callout: { label: "DOCUMENT REQUEST", text: "Use the Request Documents button to send a contractor a secure upload link. They can upload documents directly without needing a SiteSafe account." },
  },
  {
    title: "13. Site Diary",
    intro: "The Site Diary is your contemporaneous record of everything that happens on site. Consistent diary entries are your strongest form of evidence in any delay, defect, or legal dispute.",
    subsections: [
      {
        heading: "Completing a Daily Entry",
        content: [
          "1. Go to the Project Detail page and click the Site Diary tab.",
          "2. Click Today's Entry (or select a past date to backfill).",
          "3. Complete the three mandatory sections: Weather, Workforce, and Work Carried Out.",
          "4. Optionally complete: Deliveries, Visitors, Plant & Equipment, H&S Observations, Instructions & Variations, Delays, and Photos.",
          "5. Click Complete Entry to finalise. The diary auto-saves every 30 seconds as you type.",
        ],
      },
      {
        heading: "Entry Sections Explained",
        content: [
          "• Weather: Temperature, conditions (sunny/rain/wind), any weather-related delays.",
          "• Workforce: Number of workers on site by trade and contractor.",
          "• Work Carried Out: Narrative of progress made — be specific about locations and activities.",
          "• Instructions & Variations: Any verbal or written instructions from client or designer.",
          "• Delays: Record the cause, duration, and responsible party for any delay.",
          "• Photos: Date-stamped photographic evidence of progress and site conditions.",
        ],
      },
    ],
    callout: { label: "BEST PRACTICE", text: "Target 100% diary completion. Projects with gaps in their diary record are at a significant disadvantage in delay claims and adjudications. The Dashboard flags any project with missing entries." },
  },
  {
    title: "14. COSHH Register",
    intro: "The Control of Substances Hazardous to Health (COSHH) Register records every hazardous substance used on site. Maintaining this register is a legal requirement under the COSHH Regulations 2002.",
    subsections: [
      {
        heading: "Adding a Substance",
        content: [
          "1. Go to the Project Detail page and click the COSHH tab.",
          "2. Click Add Substance, or use Quick Add for common site substances.",
          "3. Enter the product name, manufacturer, and substance type.",
          "4. Select the applicable GHS hazard pictograms (flammable, corrosive, toxic, etc.).",
          "5. Enter routes of exposure, health effects, and required control measures.",
          "6. Select required PPE from the illustrated picker.",
          "7. Enter storage location and requirements (e.g. locked COSHH cabinet, ventilated store).",
          "8. Upload the Safety Data Sheet (SDS) — this is a legal requirement.",
          "9. Click Save to add to the register.",
        ],
      },
    ],
    callout: { label: "LEGAL NOTE", text: "Safety Data Sheets must be the most current version available from the manufacturer. SiteSafe alerts you if an SDS is older than 3 years and prompts you to verify it is still current." },
  },
  {
    title: "15. Client Portal",
    intro: "The Client Portal gives your clients secure, read-only visibility of their project's health and safety performance — without needing to visit site or chase for updates.",
    subsections: [
      {
        heading: "What Clients Can See",
        content: [
          "• Overall compliance score and trend",
          "• Document register (shared documents only)",
          "• Open and closed corrective actions",
          "• Live and historical workforce numbers",
          "• Inspection results and pass rates",
          "• Site diary completion percentage",
          "• Incident summary (configurable visibility)",
        ],
      },
      {
        heading: "Inviting a Client",
        content: [
          "1. Go to Settings > Clients and click Invite Client.",
          "2. Enter the client's email address, full name, company name, and their role (e.g. Project Manager).",
          "3. Select which projects they should have access to.",
          "4. Click Send Invitation. The client receives a branded email with a secure login link.",
        ],
      },
    ],
    callout: { label: "ACCESS CONTROL", text: "Client access is always read-only. Clients cannot raise actions, modify documents, or access any information from projects they have not been granted access to." },
  },
  {
    title: "16. Settings & Administration",
    subsections: [
      { heading: "Profile", content: ["Update your name, email address, phone number, and profile avatar. Changes to your email require re-verification."] },
      { heading: "Organisation", content: ["Update your company name, logo, and primary contact details. The company logo appears on all generated PDFs and the Client Portal."] },
      {
        heading: "Templates",
        content: ["Upload master document templates that are auto-generated for every new project at go-live. Templates are copied (not linked) — changes to the master do not affect existing projects."],
      },
      {
        heading: "Notifications",
        content: ["Configure email, push, and WhatsApp notification preferences for: document acknowledgements, overdue actions, expiring permits, site access alerts, and compliance reminders. Granular per-event controls available."],
      },
      { heading: "Subscription", content: ["View your current plan, usage metrics, and billing history. Upgrade, downgrade, or update payment details. Downgrades take effect at the end of the billing period."] },
      {
        heading: "WhatsApp Integration",
        content: ["Connect your WhatsApp Business API credentials to enable WhatsApp notifications. Delivery and read receipts are tracked and visible per message. Note: Recipients must have explicitly opted in to receive WhatsApp messages."],
      },
      {
        heading: "Team Members",
        content: ["Add and remove team members, change roles (Admin, Site Manager, Contractor), and resend invitations. Admins can see all projects; Site Managers and Contractors see only the projects they are assigned to."],
      },
    ],
    callout: { label: "PERMISSIONS NOTE", text: "Only users with the Admin role can access Settings. If you need to change organisation or billing settings but don't have access, contact your account administrator." },
  },
];

// ── Table rendering helper ──
function drawTable(doc: jsPDF, table: { headers: string[]; rows: string[][] }, startY: number, margin: number, contentWidth: number): number {
  let y = startY;
  const colCount = table.headers.length;
  const colWidth = contentWidth / colCount;

  // Header row
  doc.setFillColor(15, 118, 110);
  doc.rect(margin, y - 4, contentWidth, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  table.headers.forEach((h, i) => {
    doc.text(h, margin + i * colWidth + 2, y);
  });
  y += 7;

  // Data rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  table.rows.forEach((row, rowIdx) => {
    y = checkPageBreak(doc, y, 12);
    if (rowIdx % 2 === 0) {
      doc.setFillColor(245, 247, 250);
      doc.rect(margin, y - 4, contentWidth, 8, "F");
    }
    doc.setTextColor(...PDF_COLORS.text);
    row.forEach((cell, i) => {
      const truncated = cell.length > (contentWidth / colCount / 2) ? doc.splitTextToSize(cell, colWidth - 4)[0] : cell;
      doc.text(truncated, margin + i * colWidth + 2, y);
    });
    y += 7;
  });

  return y + 2;
}

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
  doc.text("SiteSafe", pageWidth / 2, 50, { align: "center" });
  doc.setFontSize(24);
  doc.text("Training Guide", pageWidth / 2, 65, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("A complete guide to every feature of the platform", pageWidth / 2, 85, { align: "center" });
  doc.text("Version 2.0 — March 2026", pageWidth / 2, 100, { align: "center" });

  doc.setFontSize(10);
  doc.text("sitesafe.cloud", pageWidth / 2, 112, { align: "center" });

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

    // Section title bar
    doc.setFillColor(15, 118, 110);
    doc.rect(margin, y - 6, contentWidth, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(section.title, margin + 4, y + 1);
    y += 14;

    // Intro paragraph
    if (section.intro) {
      doc.setTextColor(...PDF_COLORS.text);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const introLines = doc.splitTextToSize(section.intro, contentWidth);
      introLines.forEach((line: string) => {
        y = checkPageBreak(doc, y, 12);
        doc.text(line, margin, y);
        y += 5;
      });
      y += 4;
    }

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

      // Bullet list
      if (sub.list) {
        sub.list.forEach((item) => {
          y = checkPageBreak(doc, y, 10);
          doc.text("•  " + item, margin + 4, y);
          y += 5;
        });
        y += 2;
      }

      // Table
      if (sub.table) {
        y = checkPageBreak(doc, y, 30);
        y = drawTable(doc, sub.table, y, margin, contentWidth);
      }

      y += 3;
    });

    // Callout box
    if (section.callout) {
      y = checkPageBreak(doc, y, 25);
      const calloutText = section.callout.label + ": " + section.callout.text;
      const calloutLines = doc.splitTextToSize(calloutText, contentWidth - 10);
      const calloutHeight = calloutLines.length * 5 + 8;
      doc.setFillColor(245, 245, 220);
      doc.roundedRect(margin, y - 4, contentWidth, calloutHeight, 2, 2, "F");
      doc.setTextColor(...PDF_COLORS.primary);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(section.callout.label, margin + 5, y + 1);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...PDF_COLORS.muted);
      const bodyLines = doc.splitTextToSize(section.callout.text, contentWidth - 10);
      doc.text(bodyLines, margin + 5, y + 6);
      y += calloutHeight + 4;
    }
  });

  addFooter(doc, "SiteSafe");
  doc.save("SiteSafe_Training_Guide.pdf");
}
