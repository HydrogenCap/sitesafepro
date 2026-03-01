import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { 
  createPdfDocument, 
  addHeader, 
  addSectionTitle, 
  addTableHeader, 
  addFooter, 
  checkPageBreak,
  truncateText,
  addSignatureImage,
  PDF_COLORS 
} from "@/lib/pdf-utils";

// Site Visits Report
export interface SiteVisitReportData {
  visitor_name: string;
  visitor_company: string | null;
  visitor_email: string | null;
  purpose: string | null;
  checked_in_at: string;
  checked_out_at: string | null;
  has_signed_induction: boolean;
  project_name: string;
}

export const generateSiteVisitsReport = (
  visits: SiteVisitReportData[],
  projectName: string | null,
  dateRange: { start: Date; end: Date },
  orgName?: string
) => {
  const doc = createPdfDocument();
  
  let yPos = addHeader(
    doc, 
    "Site Attendance Report",
    projectName 
      ? `${projectName} - ${format(dateRange.start, "dd MMM yyyy")} to ${format(dateRange.end, "dd MMM yyyy")}`
      : `All Projects - ${format(dateRange.start, "dd MMM yyyy")} to ${format(dateRange.end, "dd MMM yyyy")}`
  );

  // Summary stats
  yPos = addSectionTitle(doc, "Summary", yPos);
  
  const totalVisits = visits.length;
  const uniqueVisitors = new Set(visits.map(v => v.visitor_email || v.visitor_name)).size;
  const avgDuration = visits.reduce((acc, v) => {
    if (v.checked_out_at) {
      return acc + (new Date(v.checked_out_at).getTime() - new Date(v.checked_in_at).getTime());
    }
    return acc;
  }, 0) / (visits.filter(v => v.checked_out_at).length || 1);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PDF_COLORS.text);
  doc.text(`Total Visits: ${totalVisits}`, 20, yPos);
  doc.text(`Unique Visitors: ${uniqueVisitors}`, 80, yPos);
  doc.text(`Avg Duration: ${Math.round(avgDuration / (1000 * 60))} mins`, 140, yPos);
  yPos += 15;

  // Visits table
  yPos = addSectionTitle(doc, "Visit Records", yPos);
  
  const headers = [
    { label: "Name", x: 20 },
    { label: "Company", x: 60 },
    { label: "Check In", x: 100 },
    { label: "Check Out", x: 135 },
    { label: "Duration", x: 170 },
  ];
  
  yPos = addTableHeader(doc, headers, yPos);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  
  visits.forEach(visit => {
    yPos = checkPageBreak(doc, yPos, 10);
    
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(truncateText(visit.visitor_name, 20), 20, yPos);
    doc.text(truncateText(visit.visitor_company || "-", 20), 60, yPos);
    doc.text(format(new Date(visit.checked_in_at), "dd/MM HH:mm"), 100, yPos);
    
    if (visit.checked_out_at) {
      doc.text(format(new Date(visit.checked_out_at), "dd/MM HH:mm"), 135, yPos);
      const duration = Math.round((new Date(visit.checked_out_at).getTime() - new Date(visit.checked_in_at).getTime()) / (1000 * 60));
      doc.text(`${duration} mins`, 170, yPos);
    } else {
      doc.setTextColor(...PDF_COLORS.muted);
      doc.text("On site", 135, yPos);
      doc.text("-", 170, yPos);
    }
    
    yPos += 7;
  });

  addFooter(doc, orgName);
  
  const filename = `site-attendance-${format(dateRange.start, "yyyy-MM-dd")}-to-${format(dateRange.end, "yyyy-MM-dd")}.pdf`;
  doc.save(filename);
  return filename;
};

// Induction Completions Report
export interface InductionReportData {
  visitor_name: string;
  visitor_company: string | null;
  visitor_email: string | null;
  completed_at: string;
  signature_data: string;
  project_name: string;
  template_name: string;
}

export const generateInductionReport = (
  completions: InductionReportData[],
  projectName: string | null,
  dateRange: { start: Date; end: Date },
  orgName?: string
) => {
  const doc = createPdfDocument();
  
  let yPos = addHeader(
    doc,
    "Site Induction Report",
    projectName
      ? `${projectName} - ${format(dateRange.start, "dd MMM yyyy")} to ${format(dateRange.end, "dd MMM yyyy")}`
      : `All Projects - ${format(dateRange.start, "dd MMM yyyy")} to ${format(dateRange.end, "dd MMM yyyy")}`
  );

  // Summary
  yPos = addSectionTitle(doc, "Summary", yPos);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PDF_COLORS.text);
  doc.text(`Total Completions: ${completions.length}`, 20, yPos);
  const uniqueInductees = new Set(completions.map(c => c.visitor_email || c.visitor_name)).size;
  doc.text(`Unique Inductees: ${uniqueInductees}`, 100, yPos);
  yPos += 15;

  // Completions table
  yPos = addSectionTitle(doc, "Induction Records", yPos);
  
  const headers = [
    { label: "Name", x: 20 },
    { label: "Company", x: 55 },
    { label: "Project", x: 95 },
    { label: "Date", x: 135 },
    { label: "Signature", x: 165 },
  ];
  
  yPos = addTableHeader(doc, headers, yPos);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  
  completions.forEach(completion => {
    yPos = checkPageBreak(doc, yPos, 12);
    
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(truncateText(completion.visitor_name, 18), 20, yPos);
    doc.text(truncateText(completion.visitor_company || "-", 18), 55, yPos);
    doc.text(truncateText(completion.project_name, 18), 95, yPos);
    doc.text(format(new Date(completion.completed_at), "dd/MM/yy HH:mm"), 135, yPos);
    
    if (completion.signature_data) {
      addSignatureImage(doc, completion.signature_data, 165, yPos, 20, 8);
    }
    
    yPos += 10;
  });

  addFooter(doc, orgName);
  
  const filename = `induction-report-${format(dateRange.start, "yyyy-MM-dd")}-to-${format(dateRange.end, "yyyy-MM-dd")}.pdf`;
  doc.save(filename);
  return filename;
};

// Toolbox Talks Report
export interface ToolboxTalkReportData {
  title: string;
  category: string;
  delivered_at: string;
  deliverer_name: string;
  project_name: string | null;
  attendee_count: number;
  status: string;
}

export const generateToolboxTalksReport = (
  talks: ToolboxTalkReportData[],
  dateRange: { start: Date; end: Date },
  orgName?: string
) => {
  const doc = createPdfDocument();
  
  let yPos = addHeader(
    doc,
    "Toolbox Talks Report",
    `${format(dateRange.start, "dd MMM yyyy")} to ${format(dateRange.end, "dd MMM yyyy")}`
  );

  // Summary
  yPos = addSectionTitle(doc, "Summary", yPos);
  
  const completedTalks = talks.filter(t => t.status === "completed").length;
  const totalAttendees = talks.reduce((acc, t) => acc + t.attendee_count, 0);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PDF_COLORS.text);
  doc.text(`Total Talks: ${talks.length}`, 20, yPos);
  doc.text(`Completed: ${completedTalks}`, 70, yPos);
  doc.text(`Total Attendees: ${totalAttendees}`, 120, yPos);
  yPos += 15;

  // Talks table
  yPos = addSectionTitle(doc, "Talk Records", yPos);
  
  const headers = [
    { label: "Title", x: 20 },
    { label: "Category", x: 75 },
    { label: "Date", x: 110 },
    { label: "Delivered By", x: 140 },
    { label: "Attendees", x: 178 },
  ];
  
  yPos = addTableHeader(doc, headers, yPos);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  
  talks.forEach(talk => {
    yPos = checkPageBreak(doc, yPos, 10);
    
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(truncateText(talk.title, 28), 20, yPos);
    doc.text(truncateText(talk.category.replace(/_/g, " "), 18), 75, yPos);
    doc.text(format(new Date(talk.delivered_at), "dd/MM/yy"), 110, yPos);
    doc.text(truncateText(talk.deliverer_name, 18), 140, yPos);
    doc.text(talk.attendee_count.toString(), 183, yPos);
    
    yPos += 7;
  });

  addFooter(doc, orgName);
  
  const filename = `toolbox-talks-${format(dateRange.start, "yyyy-MM-dd")}-to-${format(dateRange.end, "yyyy-MM-dd")}.pdf`;
  doc.save(filename);
  return filename;
};

// Documents Report
export interface DocumentReportData {
  name: string;
  category: string;
  status: string;
  uploaded_at: string;
  uploaded_by: string;
  project_name: string | null;
  file_size: number;
}

export const generateDocumentsReport = (
  documents: DocumentReportData[],
  projectName: string | null,
  dateRange: { start: Date; end: Date },
  orgName?: string
) => {
  const doc = createPdfDocument();
  
  let yPos = addHeader(
    doc,
    "Document Audit Report",
    projectName
      ? `${projectName} - ${format(dateRange.start, "dd MMM yyyy")} to ${format(dateRange.end, "dd MMM yyyy")}`
      : `All Projects - ${format(dateRange.start, "dd MMM yyyy")} to ${format(dateRange.end, "dd MMM yyyy")}`
  );

  // Summary by status
  yPos = addSectionTitle(doc, "Summary by Status", yPos);
  
  const approved = documents.filter(d => d.status === "approved").length;
  const pending = documents.filter(d => d.status === "pending").length;
  const rejected = documents.filter(d => d.status === "rejected").length;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PDF_COLORS.text);
  doc.text(`Total Documents: ${documents.length}`, 20, yPos);
  doc.text(`Approved: ${approved}`, 80, yPos);
  doc.text(`Pending: ${pending}`, 120, yPos);
  doc.text(`Rejected: ${rejected}`, 160, yPos);
  yPos += 15;

  // Documents table
  yPos = addSectionTitle(doc, "Document Records", yPos);
  
  const headers = [
    { label: "Name", x: 20 },
    { label: "Category", x: 75 },
    { label: "Status", x: 115 },
    { label: "Uploaded", x: 145 },
    { label: "By", x: 175 },
  ];
  
  yPos = addTableHeader(doc, headers, yPos);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  
  documents.forEach(document => {
    yPos = checkPageBreak(doc, yPos, 10);
    
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(truncateText(document.name, 28), 20, yPos);
    doc.text(truncateText(document.category.replace(/_/g, " "), 18), 75, yPos);
    
    // Color-coded status
    if (document.status === "approved") {
      doc.setTextColor(22, 163, 74); // green
    } else if (document.status === "rejected") {
      doc.setTextColor(220, 38, 38); // red
    } else {
      doc.setTextColor(234, 179, 8); // yellow
    }
    doc.text(document.status, 115, yPos);
    
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(format(new Date(document.uploaded_at), "dd/MM/yy"), 145, yPos);
    doc.text(truncateText(document.uploaded_by, 12), 175, yPos);
    
    yPos += 7;
  });

  addFooter(doc, orgName);
  
  const filename = `document-audit-${format(dateRange.start, "yyyy-MM-dd")}-to-${format(dateRange.end, "yyyy-MM-dd")}.pdf`;
  doc.save(filename);
  return filename;
};

// Project Compliance Summary
export interface ProjectComplianceData {
  project_name: string;
  total_documents: number;
  approved_documents: number;
  pending_documents: number;
  total_visits: number;
  completed_inductions: number;
  toolbox_talks: number;
}

export const generateComplianceSummaryReport = (
  projects: ProjectComplianceData[],
  dateRange: { start: Date; end: Date },
  orgName?: string
) => {
  const doc = createPdfDocument();
  
  let yPos = addHeader(
    doc,
    "Project Compliance Summary",
    `${format(dateRange.start, "dd MMM yyyy")} to ${format(dateRange.end, "dd MMM yyyy")}`
  );

  // Overall summary
  yPos = addSectionTitle(doc, "Organisation Overview", yPos);
  
  const totals = projects.reduce((acc, p) => ({
    documents: acc.documents + p.total_documents,
    approved: acc.approved + p.approved_documents,
    visits: acc.visits + p.total_visits,
    inductions: acc.inductions + p.completed_inductions,
    talks: acc.talks + p.toolbox_talks,
  }), { documents: 0, approved: 0, visits: 0, inductions: 0, talks: 0 });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PDF_COLORS.text);
  doc.text(`Active Projects: ${projects.length}`, 20, yPos);
  doc.text(`Total Documents: ${totals.documents}`, 80, yPos);
  doc.text(`Site Visits: ${totals.visits}`, 140, yPos);
  yPos += 6;
  doc.text(`Approved Docs: ${totals.approved}`, 20, yPos);
  doc.text(`Inductions: ${totals.inductions}`, 80, yPos);
  doc.text(`Toolbox Talks: ${totals.talks}`, 140, yPos);
  yPos += 15;

  // Per-project breakdown
  yPos = addSectionTitle(doc, "Project Breakdown", yPos);
  
  const headers = [
    { label: "Project", x: 20 },
    { label: "Docs", x: 80 },
    { label: "Approved", x: 100 },
    { label: "Visits", x: 130 },
    { label: "Inductions", x: 155 },
    { label: "Talks", x: 180 },
  ];
  
  yPos = addTableHeader(doc, headers, yPos);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  
  projects.forEach(project => {
    yPos = checkPageBreak(doc, yPos, 10);
    
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(truncateText(project.project_name, 30), 20, yPos);
    doc.text(project.total_documents.toString(), 85, yPos);
    doc.text(project.approved_documents.toString(), 105, yPos);
    doc.text(project.total_visits.toString(), 135, yPos);
    doc.text(project.completed_inductions.toString(), 162, yPos);
    doc.text(project.toolbox_talks.toString(), 185, yPos);
    
    yPos += 7;
  });

  addFooter(doc, orgName);
  
  const filename = `compliance-summary-${format(dateRange.start, "yyyy-MM-dd")}-to-${format(dateRange.end, "yyyy-MM-dd")}.pdf`;
  doc.save(filename);
  return filename;
};

// Contractor Compliance Report
export interface ContractorComplianceReportData {
  company_name: string;
  primary_trade: string;
  compliance_status: string;
  compliance_score: number;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  documents: {
    doc_type: string;
    expiry_date: string | null;
    verified: boolean;
    status: "valid" | "expiring" | "expired" | "missing";
  }[];
  operatives_count: number;
}

export const generateContractorComplianceReport = (
  contractors: ContractorComplianceReportData[],
  orgName?: string
) => {
  const doc = createPdfDocument();
  
  let yPos = addHeader(
    doc,
    "Contractor Compliance Report",
    `Generated: ${format(new Date(), "dd MMM yyyy HH:mm")}`
  );

  // Summary
  yPos = addSectionTitle(doc, "Summary", yPos);
  
  const compliant = contractors.filter(c => c.compliance_status === "compliant").length;
  const expiring = contractors.filter(c => c.compliance_status === "expiring_soon").length;
  const expired = contractors.filter(c => c.compliance_status === "expired").length;
  const incomplete = contractors.filter(c => c.compliance_status === "incomplete").length;
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PDF_COLORS.text);
  doc.text(`Total Contractors: ${contractors.length}`, 20, yPos);
  yPos += 6;
  doc.setTextColor(22, 163, 74);
  doc.text(`Compliant: ${compliant}`, 20, yPos);
  doc.setTextColor(234, 179, 8);
  doc.text(`Expiring: ${expiring}`, 70, yPos);
  doc.setTextColor(220, 38, 38);
  doc.text(`Expired: ${expired}`, 120, yPos);
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text(`Incomplete: ${incomplete}`, 170, yPos);
  yPos += 15;

  // Contractors table
  yPos = addSectionTitle(doc, "Contractor Status", yPos);
  
  const headers = [
    { label: "Company", x: 20 },
    { label: "Trade", x: 75 },
    { label: "Status", x: 115 },
    { label: "Score", x: 150 },
    { label: "Operatives", x: 175 },
  ];
  
  yPos = addTableHeader(doc, headers, yPos);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  
  contractors.forEach(contractor => {
    yPos = checkPageBreak(doc, yPos, 10);
    
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(truncateText(contractor.company_name, 28), 20, yPos);
    doc.text(truncateText(contractor.primary_trade.replace(/_/g, " "), 18), 75, yPos);
    
    // Color-coded status
    if (contractor.compliance_status === "compliant") {
      doc.setTextColor(22, 163, 74);
    } else if (contractor.compliance_status === "expiring_soon") {
      doc.setTextColor(234, 179, 8);
    } else if (contractor.compliance_status === "expired") {
      doc.setTextColor(220, 38, 38);
    } else {
      doc.setTextColor(...PDF_COLORS.muted);
    }
    doc.text(contractor.compliance_status.replace(/_/g, " "), 115, yPos);
    
    doc.setTextColor(...PDF_COLORS.text);
    doc.text(`${contractor.compliance_score}%`, 150, yPos);
    doc.text(contractor.operatives_count.toString(), 180, yPos);
    
    yPos += 7;
  });

  // Document details section
  yPos = checkPageBreak(doc, yPos, 30);
  yPos += 10;
  yPos = addSectionTitle(doc, "Document Expiry Details", yPos);
  
  const expiringDocs = contractors.flatMap(c => 
    c.documents
      .filter(d => d.status === "expiring" || d.status === "expired")
      .map(d => ({
        company: c.company_name,
        doc_type: d.doc_type,
        expiry_date: d.expiry_date,
        status: d.status,
      }))
  ).sort((a, b) => {
    if (!a.expiry_date) return 1;
    if (!b.expiry_date) return -1;
    return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
  });

  if (expiringDocs.length > 0) {
    const docHeaders = [
      { label: "Company", x: 20 },
      { label: "Document Type", x: 75 },
      { label: "Expiry Date", x: 135 },
      { label: "Status", x: 175 },
    ];
    
    yPos = addTableHeader(doc, docHeaders, yPos);

    expiringDocs.slice(0, 30).forEach(item => {
      yPos = checkPageBreak(doc, yPos, 10);
      
      doc.setTextColor(...PDF_COLORS.text);
      doc.text(truncateText(item.company, 28), 20, yPos);
      doc.text(truncateText(item.doc_type.replace(/_/g, " "), 28), 75, yPos);
      doc.text(item.expiry_date ? format(new Date(item.expiry_date), "dd/MM/yyyy") : "-", 135, yPos);
      
      if (item.status === "expired") {
        doc.setTextColor(220, 38, 38);
      } else {
        doc.setTextColor(234, 179, 8);
      }
      doc.text(item.status, 175, yPos);
      
      yPos += 7;
    });
  } else {
    doc.setFontSize(10);
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text("No expiring or expired documents.", 20, yPos);
  }

  addFooter(doc, orgName);
  
  const filename = `contractor-compliance-${format(new Date(), "yyyy-MM-dd")}.pdf`;
  doc.save(filename);
  return filename;
};