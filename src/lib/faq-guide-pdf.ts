import { jsPDF } from "jspdf";
import { PDF_COLORS, addFooter, checkPageBreak } from "./pdf-utils";

interface FaqCategory {
  category: string;
  questions: { q: string; a: string }[];
}

const faqData: FaqCategory[] = [
  {
    category: "General",
    questions: [
      { q: "What is Site Safe?", a: "Site Safe is a cloud-based health and safety management platform built specifically for UK construction companies. It replaces paper-based systems, spreadsheets, and shared drives with a single digital platform covering document management, RAMS, permits to work, site access, inspections, incidents, toolbox talks, contractor compliance, and more." },
      { q: "Who is Site Safe designed for?", a: "Site Safe is designed for UK construction SMEs — from sole traders running one project to mid-size contractors managing multiple sites. The typical users are site managers, project managers, H&S managers, and company directors." },
      { q: "Is Site Safe compliant with UK legislation?", a: "Yes. Site Safe is built around UK construction health and safety legislation including CDM 2015, the Health and Safety at Work Act 1974, the Work at Height Regulations 2005, COSHH Regulations 2002, and RIDDOR 2013." },
      { q: "Can I use Site Safe on my phone?", a: "Yes. Site Safe is fully responsive and works in any modern web browser on mobile. You can also install it as a Progressive Web App (PWA)." },
      { q: "Is my data secure?", a: "Yes. All data is encrypted in transit and at rest. We use industry-standard security practices and our infrastructure is hosted on secure, EU-based cloud servers compliant with GDPR." },
    ],
  },
  {
    category: "Pricing & Plans",
    questions: [
      { q: "What plans are available?", a: "There are three plans: Starter (£49/month) — 1 active project, 5GB storage; Professional (£99/month) — up to 5 projects, 25GB storage, plus permits, toolbox talks, inspections; Enterprise (£199/month) — unlimited projects, 100GB storage, client portal, AI document analysis." },
      { q: "Is there a free trial?", a: "Yes. All new accounts start with a free trial period so you can explore the platform before committing. You can upgrade, downgrade, or cancel at any time from the Settings page." },
      { q: "Can I change my plan later?", a: "Yes. You can upgrade or downgrade at any time from Settings > Subscription. Upgrades take effect immediately. Downgrades take effect at the end of your current billing period." },
      { q: "How does billing work?", a: "Billing is monthly via Stripe. You can manage your payment method, view invoices, and cancel your subscription from Settings > Subscription > Manage Billing." },
    ],
  },
  {
    category: "Getting Started",
    questions: [
      { q: "How do I create an account?", a: "Visit sitesafe.cloud and click Sign Up. Enter your name, email, phone number, and create a password. After signing up, you will be guided through an onboarding flow." },
      { q: "What happens during onboarding?", a: "The onboarding wizard guides you through four steps: creating your organisation, inviting team members, creating your first project, and selecting your subscription plan." },
      { q: "How do I create a project?", a: "Go to Projects > New Project. Enter the project name, address, client name, start and end dates, and a description. The project is created in 'setup' status." },
      { q: "What is the pre-construction compliance checklist?", a: "Every project starts in setup mode. Before work begins, you must confirm five compliance requirements: F10 Notification, Asbestos Survey, Pre-Construction Information, Construction Phase Plan, and Principal Contractor Appointment." },
    ],
  },
  {
    category: "Projects & Documents",
    questions: [
      { q: "How do I take a project 'Live'?", a: "Once all five pre-construction compliance items are marked as complete or exempt, the 'Go Live' button becomes available. Click it to confirm and the project status changes from 'setup' to 'active'." },
      { q: "How do I upload documents?", a: "Go to Documents and click Upload Document. Select a file, choose the project and category, add a description, and click Upload." },
      { q: "What is AI document classification?", a: "When you upload a document, Site Safe uses AI to suggest the correct category (e.g., RAMS, Insurance Certificate). You can accept or change the suggestion." },
      { q: "How do document acknowledgements work?", a: "Certain documents can be flagged as 'requires acknowledgement'. Site personnel must digitally sign to confirm they have read and understood the document." },
    ],
  },
  {
    category: "RAMS & Permits",
    questions: [
      { q: "What is the RAMS Builder?", a: "The RAMS Builder is a guided wizard for creating Risk Assessments and Method Statements. It walks you through selecting activities, adding hazards and controls, writing method steps, and generating a formatted PDF." },
      { q: "How do I create a Permit to Work?", a: "Go to Permits and click New Permit. Select the type (Hot Works, Confined Space, etc.), complete the fields, and submit. The permit goes through an approval workflow." },
      { q: "How do permit approvals work?", a: "When a permit is created, it goes to the site manager for review. They can approve or reject. Approved permits have a validity period and must be closed out after work is complete." },
    ],
  },
  {
    category: "Site Access & Inductions",
    questions: [
      { q: "How does QR code site access work?", a: "Each project has a unique QR code. Workers scan it on arrival, enter their details, and sign in. On departure, they scan again to sign out. You can view who is on site in real time." },
      { q: "Can I set up site inductions?", a: "Yes. Configure induction content that workers must review before they can sign in. Completion is logged for compliance records." },
      { q: "How do I view who is currently on site?", a: "Go to Site Access. The dashboard shows a live headcount, list of personnel signed in, and you can filter by company or trade." },
    ],
  },
  {
    category: "Inspections & Incidents",
    questions: [
      { q: "How do I record an inspection?", a: "Go to Inspections and click New Inspection. Select the type, complete the checklist, add photos and notes. Failed items automatically create corrective actions." },
      { q: "How do I report an incident?", a: "Go to Incidents and click Report Incident. Enter details, attach photos and witness statements. The incident enters an investigation workflow with RIDDOR guidance if applicable." },
      { q: "What is RIDDOR reporting?", a: "RIDDOR requires certain incidents to be reported to the HSE. Site Safe flags incidents that may be RIDDOR-reportable and provides guidance on the reporting process." },
    ],
  },
  {
    category: "Contractors & Compliance",
    questions: [
      { q: "How do I add a contractor?", a: "Go to Contractors and click Add Contractor. Enter the company name, trade, contact details, and assign to projects. Then request compliance documents via email." },
      { q: "How does contractor compliance tracking work?", a: "Each contractor has a compliance score based on uploaded documents. The system alerts you when documents are expiring or missing." },
      { q: "Can contractors upload their own documents?", a: "Yes. They receive an email with a secure upload link and can upload without needing an account." },
    ],
  },
  {
    category: "Client Portal",
    questions: [
      { q: "What is the Client Portal?", a: "The Client Portal gives your clients read-only access to project documents, compliance status, and reports. You control what they see." },
      { q: "How do I invite a client?", a: "Go to Settings > Client Portal and click Invite Client. Enter their email, select projects and permissions. They receive an email invitation." },
    ],
  },
];

export function generateFaqGuidePdf() {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  // Cover
  doc.setFillColor(15, 118, 110);
  doc.rect(0, 0, pageWidth, 100, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(32);
  doc.setFont("helvetica", "bold");
  doc.text("Site Safe", pageWidth / 2, 45, { align: "center" });
  doc.setFontSize(22);
  doc.text("FAQ Guide", pageWidth / 2, 62, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Quick answers to frequently asked questions", pageWidth / 2, 82, { align: "center" });

  // TOC
  let y = 120;
  doc.setTextColor(...PDF_COLORS.text);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Contents", margin, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  faqData.forEach((cat) => {
    doc.text(cat.category, margin + 5, y);
    y += 6;
  });

  // Content
  faqData.forEach((cat) => {
    doc.addPage();
    y = 25;

    // Category header
    doc.setFillColor(15, 118, 110);
    doc.rect(margin, y - 6, contentWidth, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(cat.category, margin + 4, y + 1);
    y += 14;

    cat.questions.forEach((item) => {
      y = checkPageBreak(doc, y, 30);

      // Question
      doc.setTextColor(...PDF_COLORS.primary);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      const qLines = doc.splitTextToSize("Q: " + item.q, contentWidth);
      qLines.forEach((line: string) => {
        y = checkPageBreak(doc, y, 12);
        doc.text(line, margin, y);
        y += 5;
      });
      y += 1;

      // Answer
      doc.setTextColor(...PDF_COLORS.text);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const aLines = doc.splitTextToSize(item.a, contentWidth);
      aLines.forEach((line: string) => {
        y = checkPageBreak(doc, y, 12);
        doc.text(line, margin, y);
        y += 5;
      });
      y += 6;
    });
  });

  addFooter(doc, "Site Safe");
  doc.save("SiteSafe_FAQ_Guide.pdf");
}
