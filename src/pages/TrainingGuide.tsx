import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Download, BookOpen, Lightbulb } from "lucide-react";
import { generateTrainingGuidePdf } from "@/lib/training-guide-pdf";

const TipBox = ({ children }: { children: React.ReactNode }) => (
  <div className="my-4 flex gap-3 rounded-lg border border-accent/30 bg-accent/5 p-4">
    <Lightbulb className="h-5 w-5 shrink-0 text-accent mt-0.5" />
    <p className="text-sm text-muted-foreground">{children}</p>
  </div>
);

const SectionTitle = ({ id, children }: { id: string; children: React.ReactNode }) => (
  <h2 id={id} className="text-2xl font-bold text-foreground mt-12 mb-4 scroll-mt-20">{children}</h2>
);

const SubTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-xl font-semibold text-foreground mt-8 mb-3">{children}</h3>
);

const toc = [
  { id: "getting-started", label: "1. Getting Started" },
  { id: "dashboard", label: "2. Dashboard Overview" },
  { id: "projects", label: "3. Projects" },
  { id: "documents", label: "4. Documents" },
  { id: "rams", label: "5. RAMS Builder" },
  { id: "actions", label: "6. Corrective Actions" },
  { id: "site-access", label: "7. Site Access & QR Codes" },
  { id: "toolbox", label: "8. Toolbox Talks" },
  { id: "permits", label: "9. Permits to Work" },
  { id: "inspections", label: "10. Inspections" },
  { id: "incidents", label: "11. Incidents" },
  { id: "contractors", label: "12. Contractor Management" },
  { id: "diary", label: "13. Site Diary" },
  { id: "coshh", label: "14. COSHH Register" },
  { id: "client-portal", label: "15. Client Portal" },
  { id: "settings", label: "16. Settings & Administration" },
];

export default function TrainingGuide() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" asChild>
            <Link to="/documentation">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Documentation
            </Link>
          </Button>
          <Button asChild>
            <a href="/docs/SiteSafePro_Training_Guide.docx" download>
              <Download className="h-4 w-4 mr-2" />
              Download DOCX
            </a>
          </Button>
        </div>

        {/* Title */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-xl bg-primary/10 p-3">
              <BookOpen className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Training Guide</h1>
              <p className="text-muted-foreground">Version 1.0 — February 2026 · For Site Managers, Admins, and Contractors</p>
            </div>
          </div>
        </div>

        {/* Table of Contents */}
        <Card className="mb-10">
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-3">Contents</h2>
            <nav className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {toc.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="text-sm text-primary hover:underline py-1"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </CardContent>
        </Card>

        {/* Content */}
        <div className="prose prose-slate dark:prose-invert max-w-none">

          <SectionTitle id="getting-started">1. Getting Started</SectionTitle>

          <SubTitle>Creating Your Account</SubTitle>
          <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
            <li>Visit sitesafepro.co.uk and click <strong>Sign Up</strong> in the top right corner.</li>
            <li>Enter your full name, email address, phone number, and choose a password.</li>
            <li>Click <strong>Create Account</strong>. You will be logged in automatically.</li>
            <li>You will be taken to the Onboarding wizard.</li>
          </ol>

          <SubTitle>Onboarding Wizard</SubTitle>
          <p className="text-muted-foreground">The onboarding wizard walks you through four steps to set up your organisation:</p>
          <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
            <li><strong>Create Organisation</strong> — Enter your company name. This is the name that appears on documents and to your team.</li>
            <li><strong>Invite Team Members</strong> — Add colleagues by email. Choose their role: Admin, Site Manager, or Contractor. You can skip this.</li>
            <li><strong>Create Your First Project</strong> — Enter the project name, address, client name, estimated dates, and a description. The project will be created in 'setup' mode.</li>
            <li><strong>Choose Your Plan</strong> — Select Starter (£49/month), Professional (£99/month), or Enterprise (£199/month). You can start with a free trial.</li>
          </ol>

          <TipBox>You can complete onboarding in any order and come back to unfinished steps later from the Dashboard.</TipBox>

          <Separator className="my-8" />

          <SectionTitle id="dashboard">2. Dashboard Overview</SectionTitle>
          <p className="text-muted-foreground">The Dashboard is your home screen. It shows a summary of everything happening across your projects.</p>

          <SubTitle>What You Will See</SubTitle>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li><strong>Project summary cards</strong> — Your active projects with quick-access links.</li>
            <li><strong>Actions widget</strong> — Open and overdue corrective actions requiring attention.</li>
            <li><strong>Recent activity feed</strong> — Latest uploads, sign-ins, and status changes.</li>
            <li><strong>Site diary reminder</strong> — Whether today's diary entry has been completed.</li>
            <li><strong>Quick stats</strong> — Documents uploaded, contractors on site, compliance status.</li>
          </ul>

          <SubTitle>Navigation</SubTitle>
          <p className="text-muted-foreground">
            The left sidebar (or bottom menu on mobile) contains links to every section of Site Safe. On desktop, the sidebar is always visible. On mobile, tap the menu icon to open it. The sidebar contains 17 items grouped as: Dashboard, Projects, Documents, RAMS, Actions, Site Access, Inductions, Toolbox Talks, Permits, Inspections, Incidents, Contractors, Team, Activity, Analytics, Reports, and Settings.
          </p>

          <Separator className="my-8" />

          <SectionTitle id="projects">3. Projects</SectionTitle>

          <SubTitle>Creating a New Project</SubTitle>
          <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
            <li>Go to <strong>Projects</strong> from the sidebar and click <strong>New Project</strong>.</li>
            <li>Enter the project name, site address, client name, start date, estimated end date, and a description.</li>
            <li>Click <strong>Create Project</strong>. The project is created in 'setup' mode.</li>
          </ol>

          <SubTitle>Pre-Construction Compliance Checklist</SubTitle>
          <p className="text-muted-foreground">Every new project starts in 'setup' mode. Before going live, complete the five requirements:</p>
          <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
            <li><strong>F10 Notification to HSE</strong> — Upload the submitted F10, confirm it has been submitted, or declare the project exempt.</li>
            <li><strong>Asbestos R&D Survey</strong> — Upload the survey report, or mark as exempt for new-build projects.</li>
            <li><strong>Schedule of Cleanliness</strong> — Upload the clearance certificate if asbestos removal was carried out, otherwise mark as exempt.</li>
            <li><strong>Consignment Note</strong> — Upload the waste transfer consignment note if asbestos waste was generated, otherwise mark as exempt.</li>
            <li><strong>Pre-Construction Information (PCI)</strong> — Upload the PCI document received from the client.</li>
          </ol>

          <TipBox>For new-build projects with no asbestos involvement, items 2–4 can all be marked as exempt. Only the F10 and PCI need action.</TipBox>

          <SubTitle>Going Live</SubTitle>
          <p className="text-muted-foreground">
            Once all five checklist items are satisfied (uploaded, confirmed, or exempted), the <strong>Go Live</strong> button becomes active. Clicking Go Live changes the project status to 'active' and auto-generates site-specific documents from your template library (configured in Settings &gt; Templates).
          </p>

          <Separator className="my-8" />

          <SectionTitle id="documents">4. Documents</SectionTitle>

          <SubTitle>Uploading a Document</SubTitle>
          <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
            <li>Go to <strong>Documents</strong> from the sidebar (or to a specific project's Documents tab).</li>
            <li>Click <strong>Upload Document</strong>.</li>
            <li>Drag and drop a file or click to browse. Supported types include PDF, DOCX, JPG, PNG, XLSX, and more.</li>
            <li>The system will automatically attempt to classify the document using AI (Enterprise plan) or filename matching. You can override the suggested category.</li>
            <li>Enter a name and optional description. Set whether the document requires acknowledgement from contractors.</li>
            <li>Click <strong>Upload</strong>. The document is stored securely and appears in the document list.</li>
          </ol>

          <SubTitle>Document Categories</SubTitle>
          <p className="text-muted-foreground">
            Documents are classified into 14 categories: RAMS, Method Statement, Safety Plan, COSHH, Induction, Permit, Inspection, Certificate, Insurance, Risk Assessment, Fire Safety, Meeting Minutes, Drawing, and Other.
          </p>

          <SubTitle>Document Acknowledgements</SubTitle>
          <p className="text-muted-foreground">
            When a document is set to 'requires acknowledgement', every contractor assigned to the project must open the document, read it, and sign digitally. The Documents page shows a progress bar for each document indicating how many contractors have signed. You can send WhatsApp or email reminders to contractors who haven't signed yet.
          </p>

          <SubTitle>Document Viewer</SubTitle>
          <p className="text-muted-foreground">
            Click on any document to open the Document Viewer. Here you can preview PDFs and images directly, view metadata, approve or reject documents, and see the full acknowledgement list.
          </p>

          <TipBox>Use the Generate Document button to create common documents (induction registers, RAMS registers, permit forms, F10 notifications) from AI-powered templates.</TipBox>

          <Separator className="my-8" />

          <SectionTitle id="rams">5. RAMS Builder</SectionTitle>
          <p className="text-muted-foreground">The RAMS Builder lets you create professional Risk Assessments and Method Statements without typing them from scratch in Word.</p>

          <SubTitle>Step 1: Project & Work Details</SubTitle>
          <p className="text-muted-foreground">Select the project, enter a title, describe the work, specify the location and duration, and set the assessment and review dates.</p>

          <SubTitle>Step 2: Select Activities</SubTitle>
          <p className="text-muted-foreground">Browse the activity library organised by category: General Site, Groundworks, Structural, Working at Height, Services & Finishes, and Specialist. Select all relevant activities — they will be combined into a single RAMS document.</p>

          <SubTitle>Step 3: Risk Assessments</SubTitle>
          <p className="text-muted-foreground">Each selected activity generates risk assessments pre-populated from the library but fully editable. Edit the hazard description, severity (1–5), probability (1–5), existing and additional controls, who is at risk, and comments. The risk factor is auto-calculated with colour coding.</p>

          <SubTitle>Step 4: Method Statements</SubTitle>
          <p className="text-muted-foreground">Each activity generates method statement steps you can edit, reorder, add, or remove. Includes PPE requirements, plant & equipment, permit requirements, legislation references, supervision, and emergency procedures.</p>

          <SubTitle>Step 5: Review & Sign</SubTitle>
          <p className="text-muted-foreground">Review the complete document, add signatures, and export as PDF.</p>

          <Separator className="my-8" />

          <SectionTitle id="actions">6. Corrective Actions</SectionTitle>

          <SubTitle>Raising an Action</SubTitle>
          <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
            <li>Go to <strong>Actions</strong> from the sidebar and click <strong>Raise Action</strong>.</li>
            <li>Enter a title and description of the safety issue.</li>
            <li>Take a photo or upload an existing image as evidence.</li>
            <li>Set the priority: Critical (fix today), High (fix tomorrow), Medium (fix within 7 days), or Low (fix within 14 days). The due date is auto-suggested.</li>
            <li>Select the source: Inspection, Incident, Audit, Toolbox Talk, Observation, Near Miss, Client Request, or Other.</li>
            <li>Assign to a person or company and select the project.</li>
            <li>Click <strong>Raise Action</strong>.</li>
          </ol>

          <SubTitle>The Action Lifecycle</SubTitle>
          <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
            <li><strong>Open</strong> — The action has been raised and assigned. The assigned person is notified.</li>
            <li><strong>In Progress</strong> — The assigned person marks it as in progress.</li>
            <li><strong>Awaiting Verification</strong> — The fix is submitted with resolution notes and an 'after' photo.</li>
            <li><strong>Closed</strong> — The verifier confirms the fix is adequate and closes the action.</li>
          </ol>

          <TipBox>The Actions list page shows summary cards for overdue, open, awaiting verification, and closed actions. Overdue actions are highlighted in red with a pulsing indicator.</TipBox>

          <Separator className="my-8" />

          <SectionTitle id="site-access">7. Site Access & QR Codes</SectionTitle>

          <SubTitle>Setting Up Site Access</SubTitle>
          <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
            <li>Go to <strong>Site Access</strong> from the sidebar.</li>
            <li>Select a project. If a QR code hasn't been generated yet, click <strong>Generate QR Code</strong>.</li>
            <li>Print the QR code and display it at your site entrance.</li>
          </ol>

          <SubTitle>How Sign-In Works</SubTitle>
          <p className="text-muted-foreground">
            When someone scans the QR code, they enter their name, company, trade, and email, then tap Sign In. Their visit is logged with a timestamp. When leaving, they scan again and tap Sign Out.
          </p>

          <SubTitle>Live Headcount</SubTitle>
          <p className="text-muted-foreground">
            The Site Access page shows a live list of everyone currently signed in with their name, company, trade, arrival time, and duration on site. This serves as your emergency roll call list.
          </p>

          <SubTitle>Inductions</SubTitle>
          <p className="text-muted-foreground">
            Configure site inductions that visitors must complete on their first sign-in. Once completed, they can sign in freely on future visits. Completions are recorded for audit purposes.
          </p>

          <Separator className="my-8" />

          <SectionTitle id="toolbox">8. Toolbox Talks</SectionTitle>

          <SubTitle>Delivering a Talk</SubTitle>
          <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
            <li>Go to <strong>Toolbox Talks</strong> from the sidebar.</li>
            <li>Browse the template library (35 system templates plus custom ones). Use search or category filter.</li>
            <li>Click <strong>Deliver</strong> on your chosen template.</li>
            <li>Read the talk content aloud to the group.</li>
            <li>Add attendees: name, company, trade. Each attendee signs digitally on screen.</li>
            <li>Add any notes about the discussion.</li>
            <li>Click <strong>Complete Talk</strong>. The record is saved with content, attendees, signatures, date, location, and weather.</li>
          </ol>

          <SubTitle>Creating Custom Templates</SubTitle>
          <p className="text-muted-foreground">
            Click Create Template to write your own toolbox talk. Enter a title, category, content (with formatting), and estimated duration. Custom templates are available for all your projects.
          </p>

          <TipBox>Toolbox talks should ideally be delivered weekly. The Reports page shows how many talks have been delivered per project to help maintain a regular cadence.</TipBox>

          <Separator className="my-8" />

          <SectionTitle id="permits">9. Permits to Work</SectionTitle>
          <p className="text-muted-foreground">Permits to Work are required for high-risk activities where normal safe systems of work are insufficient.</p>

          <SubTitle>Creating a Permit</SubTitle>
          <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
            <li>Go to <strong>Permits</strong> from the sidebar and click <strong>New Permit</strong>.</li>
            <li>Select the permit type: Hot Work, Confined Space, Excavation, Electrical Isolation, Working at Height, Roof Work, Demolition, Lifting Operations, or General.</li>
            <li>Enter the title, work description, and select the project.</li>
            <li>Set the valid from and valid to dates/times. Add specific precautions and control measures.</li>
          </ol>

          <Separator className="my-8" />

          <SectionTitle id="inspections">10. Inspections</SectionTitle>

          <SubTitle>Creating an Inspection</SubTitle>
          <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
            <li>Go to <strong>Inspections</strong> and click <strong>New Inspection</strong>.</li>
            <li>Select the type: Scaffold, Excavation, Lifting Equipment, Electrical, Fire Safety, Housekeeping, PPE Compliance, or General Site.</li>
            <li>A type-specific checklist is pre-loaded. Record Pass, Fail, Requires Action, or N/A for each item, with optional notes.</li>
            <li>Upload photos of defects or observations.</li>
            <li>Record the overall result: Pass, Fail, or Requires Action.</li>
            <li>If any items fail, a corrective action can be raised directly from the inspection.</li>
          </ol>

          <Separator className="my-8" />

          <SectionTitle id="incidents">11. Incidents</SectionTitle>

          <SubTitle>Reporting an Incident</SubTitle>
          <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
            <li>Go to <strong>Incidents</strong> and click <strong>Report Incident</strong>.</li>
            <li>Enter details: title, description, date/time, location, and project.</li>
            <li>Select severity: Near Miss, Minor Injury, Major Injury, Dangerous Occurrence, or Fatality.</li>
            <li>Record the people involved and witness information.</li>
            <li>Upload photos of the scene.</li>
            <li>The incident triggers an investigation workflow: Reported → Under Investigation → Action Required → Closed.</li>
          </ol>
          <p className="text-muted-foreground">If the incident is RIDDOR-reportable, the system flags it and prompts you to report to the HSE.</p>

          <Separator className="my-8" />

          <SectionTitle id="contractors">12. Contractor Management</SectionTitle>

          <SubTitle>Adding a Contractor Company</SubTitle>
          <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
            <li>Go to <strong>Contractors</strong> and click <strong>Add Contractor</strong>.</li>
            <li>Enter the company name, primary trade, contact details, and tax status.</li>
            <li>Define which compliance documents are required: insurance (CAR, PL, EL), certifications (CSCS, Gas Safe, etc.), and accreditations.</li>
            <li>Click <strong>Save</strong>. The contractor starts with a 'red' compliance traffic light until documents are uploaded.</li>
          </ol>

          <SubTitle>Tracking Compliance</SubTitle>
          <p className="text-muted-foreground">
            The Contractor Detail page shows every required document as a card: valid (green), expiring soon (amber), expired (red), or not uploaded (grey). You can upload documents on behalf of a contractor, or click Request Documents to send them a secure upload link.
          </p>

          <SubTitle>Operatives</SubTitle>
          <p className="text-muted-foreground">
            Register individual operatives with their name, trade, CSCS card number and type (Green Labourer, Blue Skilled, Gold Supervisor, Black Manager), and expiry date. CSCS cards approaching expiry are flagged.
          </p>

          <TipBox>The Contractors list page shows summary cards for total contractors, fully compliant, expiring soon, and non-compliant. Use this as your weekly compliance review dashboard.</TipBox>

          <Separator className="my-8" />

          <SectionTitle id="diary">13. Site Diary</SectionTitle>

          <SubTitle>Completing a Daily Entry</SubTitle>
          <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
            <li>Go to the Project Detail page and click the <strong>Site Diary</strong> tab.</li>
            <li>Click <strong>Today's Entry</strong> (or select a past date to back-fill).</li>
            <li>Complete at minimum the <strong>Weather</strong>, <strong>Workforce</strong>, and <strong>Work Carried Out</strong> sections.</li>
            <li><strong>Weather:</strong> tap the weather icon for morning/afternoon, enter temperature, note any impact.</li>
            <li><strong>Workforce:</strong> enter the number of your own operatives and subcontractor operatives.</li>
            <li><strong>Work Carried Out:</strong> describe the main activities of the day — be specific.</li>
            <li>Optionally complete: Deliveries, Visitors, Plant & Equipment, H&S observations, Instructions & Variations, Delays, and Photos.</li>
            <li>Click <strong>Complete Entry</strong> to finalise. The form auto-saves every 30 seconds.</li>
          </ol>

          <TipBox>The Dashboard shows whether today's diary entry has been completed. Missing entries trigger an amber warning. Aim for 100% completion — it's your strongest evidence in any dispute or investigation.</TipBox>

          <Separator className="my-8" />

          <SectionTitle id="coshh">14. COSHH Register</SectionTitle>

          <SubTitle>Adding a Substance</SubTitle>
          <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
            <li>Go to the Project Detail page and click the <strong>COSHH</strong> tab.</li>
            <li>Click <strong>Add Substance</strong>, or use Quick Add for common substances (PVA, cement, emulsion paint, white spirit, etc.).</li>
            <li>Enter the product name, manufacturer, and substance type.</li>
            <li>Select the GHS hazard pictograms by tapping the visual icons.</li>
            <li>Enter routes of exposure, health effects, and control measures.</li>
            <li>Select required PPE from the checklist.</li>
            <li>Enter storage location and requirements.</li>
            <li>Upload the Safety Data Sheet (SDS) — this is a legal requirement.</li>
            <li>Click <strong>Save</strong>.</li>
          </ol>
          <p className="text-muted-foreground">
            The COSHH summary cards show total substances on site, how many require health surveillance, and how many are missing their SDS. Substances missing an SDS are flagged in amber.
          </p>

          <Separator className="my-8" />

          <SectionTitle id="client-portal">15. Client Portal (Enterprise)</SectionTitle>

          <SubTitle>Inviting a Client</SubTitle>
          <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
            <li>Go to <strong>Settings &gt; Clients</strong>.</li>
            <li>Click <strong>Invite Client</strong>.</li>
            <li>Enter the client's email, name, company, and role (Client, Principal Designer, CDM Advisor, or Building Control).</li>
            <li>Select which projects they can access.</li>
            <li>Click <strong>Send Invitation</strong>. The client receives an email with a link to create their account.</li>
          </ol>
          <p className="text-muted-foreground">
            Clients see a simplified dashboard showing compliance scores, document status, corrective actions, workforce numbers, and site diary completion. All access is read-only.
          </p>

          <Separator className="my-8" />

          <SectionTitle id="settings">16. Settings & Administration</SectionTitle>

          <SubTitle>Profile</SubTitle>
          <p className="text-muted-foreground">Update your name, email, phone number, and avatar. Your profile information appears on documents and toolbox talks.</p>

          <SubTitle>Organisation</SubTitle>
          <p className="text-muted-foreground">Update your company name, logo, and contact details. The organisation name appears on all generated documents and the client portal.</p>

          <SubTitle>Templates</SubTitle>
          <p className="text-muted-foreground">Upload master document templates that are auto-generated when a project goes live. Typical templates include: Construction Phase Plan, Site Rules, Site Induction Pack, Fire Safety Plan, Environmental Management Plan, Traffic Management Plan, PPE Requirements, and First Aid Arrangements.</p>
          <p className="text-muted-foreground">Templates are copied (not linked) to each project, so editing a template after go-live does not affect already-generated documents.</p>

          <SubTitle>Notifications</SubTitle>
          <p className="text-muted-foreground">Configure which notifications you receive and how: email, push (in-app), and WhatsApp. Categories include: document acknowledgements, corrective actions, permits, site access, and compliance reminders.</p>

          <SubTitle>Subscription</SubTitle>
          <p className="text-muted-foreground">View your current plan, usage (projects, storage), and billing details. Upgrade, downgrade, or manage your payment method.</p>

          <SubTitle>WhatsApp (Integrations)</SubTitle>
          <p className="text-muted-foreground">Configure WhatsApp Business API credentials to enable WhatsApp notifications. Once configured, you can send document signature requests, action reminders, and compliance alerts via WhatsApp. Delivery and read receipts are tracked.</p>

          <TipBox>WhatsApp messages require explicit opt-in from each recipient. Contractors can opt in when they create their account or from their profile settings.</TipBox>
        </div>

        {/* Bottom download CTA */}
        <div className="mt-16 text-center">
          <Separator className="mb-8" />
          <p className="text-muted-foreground mb-4">Prefer an offline copy?</p>
          <Button asChild size="lg">
            <a href="/docs/SiteSafePro_Training_Guide.docx" download>
              <Download className="h-4 w-4 mr-2" />
              Download Training Guide (DOCX)
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
