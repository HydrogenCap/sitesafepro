import jsPDF from "jspdf";
import { format } from "date-fns";
import { RiskAssessment, MethodStatement, RamsFormData, calculateRiskRating } from "@/components/rams/types";

interface RamsPdfData {
  title: string;
  ramsReference: string;
  revisionNumber?: number;
  siteName: string;
  siteAddress?: string;
  clientName?: string;
  principalContractor?: string;
  workDescription: string;
  workLocation?: string;
  workDuration?: string;
  assessmentDate: string | Date;
  reviewDate?: string | Date | null;
  preparedByName?: string;
  reviewedByName?: string | null;
  approvedByName?: string | null;
  riskAssessments: RiskAssessment[];
  methodStatements: MethodStatement[];
  ppeRequirements: string[];
  emergencyProcedures?: string;
  nearestHospital?: string;
  siteEmergencyContact?: string;
  preparedBySignature?: string | null;
  reviewedBySignature?: string | null;
  approvedBySignature?: string | null;
}

// Color palette matching UK H&S standards
const COLORS = {
  primary: [15, 118, 110] as [number, number, number], // Teal
  danger: [220, 38, 38] as [number, number, number],
  warning: [245, 158, 11] as [number, number, number],
  success: [22, 163, 74] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  dark: [30, 41, 59] as [number, number, number],
  light: [241, 245, 249] as [number, number, number],
};

function getRiskColor(rating: "Low" | "Medium" | "High"): [number, number, number] {
  switch (rating) {
    case "Low": return COLORS.success;
    case "Medium": return COLORS.warning;
    case "High": return COLORS.danger;
  }
}

function addHeader(doc: jsPDF, title: string, reference: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header bar
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 25, "F");
  
  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("RISK ASSESSMENT & METHOD STATEMENT", 15, 12);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(reference, 15, 20);
  
  // Right side - SiteSafe Pro branding
  doc.setFontSize(10);
  doc.text("SiteSafe Pro", pageWidth - 15, 16, { align: "right" });
  
  return 35; // Return starting Y position after header
}

function addFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setDrawColor(...COLORS.muted);
  doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);
  
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(8);
  doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: "center" });
  doc.text(`Generated: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, pageWidth - 15, pageHeight - 8, { align: "right" });
  doc.text("Controlled Document", 15, pageHeight - 8);
}

function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setFillColor(...COLORS.light);
  doc.rect(15, y, pageWidth - 30, 8, "F");
  
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(title, 18, y + 5.5);
  
  return y + 12;
}

function checkPageBreak(doc: jsPDF, y: number, requiredSpace: number = 40): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + requiredSpace > pageHeight - 25) {
    doc.addPage();
    return 25;
  }
  return y;
}

export function generateRamsPdf(data: RamsPdfData): jsPDF {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = addHeader(doc, data.title, data.ramsReference);
  
  // ========== COVER PAGE ==========
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(data.title, pageWidth / 2, y + 10, { align: "center" });
  
  y += 25;
  
  // Project info box
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.rect(15, y, pageWidth - 30, 50);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.muted);
  
  const labelX = 20;
  const valueX = 70;
  let infoY = y + 8;
  
  const infoRows = [
    ["Reference:", data.ramsReference],
    ["Revision:", String(data.revisionNumber || 1)],
    ["Site/Project:", data.siteName],
    ["Client:", data.clientName || "N/A"],
    ["Principal Contractor:", data.principalContractor || "N/A"],
    ["Location:", data.workLocation || "N/A"],
  ];
  
  infoRows.forEach(([label, value]) => {
    doc.setTextColor(...COLORS.muted);
    doc.text(label, labelX, infoY);
    doc.setTextColor(...COLORS.dark);
    doc.setFont("helvetica", "bold");
    doc.text(value, valueX, infoY);
    doc.setFont("helvetica", "normal");
    infoY += 8;
  });
  
  y += 60;
  
  // Dates box
  doc.rect(15, y, pageWidth - 30, 25);
  
  doc.setTextColor(...COLORS.muted);
  doc.text("Assessment Date:", labelX, y + 10);
  doc.setTextColor(...COLORS.dark);
  doc.setFont("helvetica", "bold");
  doc.text(format(new Date(data.assessmentDate), "dd MMMM yyyy"), valueX, y + 10);
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.muted);
  doc.text("Review Date:", labelX, y + 18);
  doc.setTextColor(...COLORS.dark);
  doc.setFont("helvetica", "bold");
  doc.text(data.reviewDate ? format(new Date(data.reviewDate), "dd MMMM yyyy") : "N/A", valueX, y + 18);
  
  y += 35;
  
  // Stats summary
  const raCount = data.riskAssessments.length;
  const msCount = data.methodStatements.length;
  const highRiskCount = data.riskAssessments.filter(ra => ra.riskRating === "High").length;
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.dark);
  doc.text(`This document contains ${raCount} Risk Assessment${raCount !== 1 ? "s" : ""} and ${msCount} Method Statement${msCount !== 1 ? "s" : ""}.`, pageWidth / 2, y, { align: "center" });
  
  if (highRiskCount > 0) {
    y += 8;
    doc.setTextColor(...COLORS.danger);
    doc.setFont("helvetica", "bold");
    doc.text(`⚠ ${highRiskCount} HIGH RISK item${highRiskCount !== 1 ? "s" : ""} identified - refer to control measures`, pageWidth / 2, y, { align: "center" });
  }
  
  y += 20;
  
  // PPE Summary box
  if (data.ppeRequirements.length > 0) {
    y = addSectionTitle(doc, "PPE REQUIREMENTS", y);
    
    doc.setFillColor(255, 251, 235); // Light amber
    doc.rect(15, y, pageWidth - 30, 20, "F");
    
    doc.setTextColor(...COLORS.dark);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const ppeText = data.ppeRequirements.join("  •  ");
    const ppeLines = doc.splitTextToSize(ppeText, pageWidth - 40);
    doc.text(ppeLines, 20, y + 6);
    
    y += 25;
  }
  
  // Work Description
  y = addSectionTitle(doc, "SCOPE OF WORKS", y);
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const descLines = doc.splitTextToSize(data.workDescription, pageWidth - 40);
  doc.text(descLines, 20, y + 2);
  y += descLines.length * 5 + 10;
  
  // ========== RISK ASSESSMENTS PAGE ==========
  doc.addPage();
  y = addHeader(doc, data.title, data.ramsReference);
  
  y = addSectionTitle(doc, "RISK ASSESSMENTS", y);
  
  // Risk Matrix Legend
  doc.setFillColor(...COLORS.light);
  doc.rect(15, y, pageWidth - 30, 15, "F");
  
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.text("Risk Rating: Severity (1-5) × Probability (1-5)", 20, y + 5);
  
  // Legend colors
  const legendY = y + 10;
  doc.setFillColor(...COLORS.success);
  doc.rect(20, legendY - 3, 8, 4, "F");
  doc.text("Low (1-6)", 30, legendY);
  
  doc.setFillColor(...COLORS.warning);
  doc.rect(60, legendY - 3, 8, 4, "F");
  doc.text("Medium (8-16)", 70, legendY);
  
  doc.setFillColor(...COLORS.danger);
  doc.rect(110, legendY - 3, 8, 4, "F");
  doc.text("High (20-25)", 120, legendY);
  
  y += 20;
  
  // Individual Risk Assessments
  data.riskAssessments.forEach((ra, index) => {
    y = checkPageBreak(doc, y, 80);
    
    // RA Header
    doc.setFillColor(...getRiskColor(ra.riskRating));
    doc.rect(15, y, 5, 35, "F");
    
    doc.setDrawColor(...COLORS.muted);
    doc.setLineWidth(0.2);
    doc.rect(15, y, pageWidth - 30, 35);
    
    doc.setTextColor(...COLORS.dark);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`RA${ra.raNumber}: ${ra.subject}`, 25, y + 6);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.muted);
    doc.text(`Location: ${ra.locationOfHazard || "N/A"}  |  Who at Risk: ${ra.whoAtRisk}`, 25, y + 12);
    
    // Hazard description
    doc.setTextColor(...COLORS.dark);
    const hazardLines = doc.splitTextToSize(`Hazard: ${ra.hazardDescription}`, pageWidth - 50);
    doc.text(hazardLines.slice(0, 2), 25, y + 18);
    
    // Risk scores
    const scoreY = y + 28;
    doc.setFontSize(8);
    
    // Initial risk
    doc.setTextColor(...COLORS.muted);
    doc.text("Initial:", 25, scoreY);
    doc.setFillColor(...getRiskColor(ra.riskRating));
    doc.rect(40, scoreY - 3, 20, 5, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text(`${ra.riskFactor} (${ra.riskRating})`, 42, scoreY);
    
    // Residual risk
    doc.setTextColor(...COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.text("Residual:", 70, scoreY);
    doc.setFillColor(...getRiskColor(ra.residualRiskRating));
    doc.rect(88, scoreY - 3, 20, 5, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text(`${ra.residualRiskFactor} (${ra.residualRiskRating})`, 90, scoreY);
    
    y += 40;
    
    // Controls table
    y = checkPageBreak(doc, y, 40);
    
    const colWidth = (pageWidth - 30) / 2;
    
    // Existing controls
    doc.setFillColor(...COLORS.light);
    doc.rect(15, y, colWidth, 6, "F");
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Existing Control Measures", 18, y + 4);
    
    // Additional controls
    doc.rect(15 + colWidth, y, colWidth, 6, "F");
    doc.text("Additional Control Measures", 18 + colWidth, y + 4);
    
    y += 8;
    
    doc.setTextColor(...COLORS.dark);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    
    const maxControls = Math.max(ra.existingControls.length, ra.additionalControls.length);
    
    for (let i = 0; i < maxControls; i++) {
      if (ra.existingControls[i]) {
        doc.text(`• ${ra.existingControls[i]}`, 18, y);
      }
      if (ra.additionalControls[i]) {
        doc.text(`• ${ra.additionalControls[i]}`, 18 + colWidth, y);
      }
      y += 4;
    }
    
    y += 10;
  });
  
  // ========== METHOD STATEMENTS PAGE ==========
  if (data.methodStatements.length > 0) {
    doc.addPage();
    y = addHeader(doc, data.title, data.ramsReference);
    
    y = addSectionTitle(doc, "METHOD STATEMENTS", y);
    
    data.methodStatements.forEach((ms, index) => {
      y = checkPageBreak(doc, y, 60);
      
      // MS Header
      doc.setFillColor(...COLORS.primary);
      doc.rect(15, y, pageWidth - 30, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`MS${ms.msNumber}: ${ms.subject}`, 18, y + 5.5);
      
      y += 12;
      
      // Steps
      doc.setTextColor(...COLORS.dark);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Work Sequence:", 18, y);
      y += 5;
      
      doc.setFont("helvetica", "normal");
      ms.steps.forEach((step) => {
        y = checkPageBreak(doc, y, 8);
        const stepText = `${step.stepNumber}. ${step.description}`;
        const stepLines = doc.splitTextToSize(stepText, pageWidth - 50);
        doc.text(stepLines, 22, y);
        y += stepLines.length * 4 + 2;
      });
      
      y += 3;
      
      // PPE for this MS
      if (ms.ppe.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.text("PPE Required: ", 18, y);
        doc.setFont("helvetica", "normal");
        doc.text(ms.ppe.join(", "), 50, y);
        y += 5;
      }
      
      // Plant/Equipment
      if (ms.plantEquipment.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.text("Plant/Equipment: ", 18, y);
        doc.setFont("helvetica", "normal");
        doc.text(ms.plantEquipment.join(", "), 55, y);
        y += 5;
      }
      
      // Permit required
      if (ms.permitRequired) {
        doc.setTextColor(...COLORS.warning);
        doc.setFont("helvetica", "bold");
        doc.text(`⚠ Permit Required: ${ms.permitType || "Yes"}`, 18, y);
        doc.setTextColor(...COLORS.dark);
        y += 5;
      }
      
      // Supervision
      if (ms.supervision) {
        doc.setFont("helvetica", "bold");
        doc.text("Supervision: ", 18, y);
        doc.setFont("helvetica", "normal");
        doc.text(ms.supervision, 45, y);
        y += 5;
      }
      
      y += 8;
    });
  }
  
  // ========== EMERGENCY & SIGNATURES PAGE ==========
  doc.addPage();
  y = addHeader(doc, data.title, data.ramsReference);
  
  // Emergency Information
  if (data.emergencyProcedures || data.nearestHospital || data.siteEmergencyContact) {
    y = addSectionTitle(doc, "EMERGENCY INFORMATION", y);
    
    doc.setFillColor(254, 226, 226); // Light red
    doc.rect(15, y, pageWidth - 30, 35, "F");
    
    doc.setTextColor(...COLORS.danger);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("IN CASE OF EMERGENCY", 20, y + 6);
    
    doc.setTextColor(...COLORS.dark);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    
    if (data.siteEmergencyContact) {
      doc.text(`Site Emergency Contact: ${data.siteEmergencyContact}`, 20, y + 14);
    }
    if (data.nearestHospital) {
      doc.text(`Nearest Hospital: ${data.nearestHospital}`, 20, y + 21);
    }
    if (data.emergencyProcedures) {
      const emergencyLines = doc.splitTextToSize(data.emergencyProcedures, pageWidth - 45);
      doc.text(emergencyLines.slice(0, 2), 20, y + 28);
    }
    
    y += 45;
  }
  
  // Signatures section
  y = addSectionTitle(doc, "DOCUMENT APPROVAL", y);
  
  const sigBoxWidth = (pageWidth - 40) / 3;
  
  // Signature boxes
  ["Prepared By", "Reviewed By", "Approved By"].forEach((label, i) => {
    const boxX = 15 + (i * (sigBoxWidth + 5));
    
    doc.setDrawColor(...COLORS.muted);
    doc.setLineWidth(0.3);
    doc.rect(boxX, y, sigBoxWidth, 40);
    
    doc.setFillColor(...COLORS.light);
    doc.rect(boxX, y, sigBoxWidth, 8, "F");
    
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(label, boxX + 3, y + 5.5);
    
    // Name
    doc.setTextColor(...COLORS.dark);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const name = i === 0 ? data.preparedByName : i === 1 ? data.reviewedByName : data.approvedByName;
    doc.text(name || "N/A", boxX + 3, y + 15);
    
    // Signature image if available
    const sig = i === 0 ? data.preparedBySignature : i === 1 ? data.reviewedBySignature : data.approvedBySignature;
    if (sig) {
      try {
        doc.addImage(sig, "PNG", boxX + 5, y + 18, sigBoxWidth - 10, 18);
      } catch (e) {
        doc.text("Signed", boxX + 3, y + 28);
      }
    }
    
    // Date line
    doc.setDrawColor(...COLORS.muted);
    doc.line(boxX + 3, y + 38, boxX + sigBoxWidth - 3, y + 38);
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text("Date:", boxX + 3, y + 37);
    
    if (i === 0) {
      doc.setTextColor(...COLORS.dark);
      doc.text(format(new Date(data.assessmentDate), "dd/MM/yyyy"), boxX + 15, y + 37);
    }
  });
  
  y += 50;
  
  // Declaration
  y = checkPageBreak(doc, y, 40);
  
  doc.setFillColor(...COLORS.light);
  doc.rect(15, y, pageWidth - 30, 30, "F");
  
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const declaration = `This Risk Assessment and Method Statement has been prepared in accordance with the Construction (Design and Management) Regulations 2015, the Health and Safety at Work etc. Act 1974, and the Management of Health and Safety at Work Regulations 1999. All persons carrying out work activities covered by this document must read and understand its contents before commencing work. Any deviation from the method statement must be approved by the Site Manager. This document must be reviewed if there are any significant changes to the work activities, personnel, or site conditions.`;
  const declLines = doc.splitTextToSize(declaration, pageWidth - 40);
  doc.text(declLines, 20, y + 6);
  
  // Add page numbers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages);
  }
  
  return doc;
}

export function downloadRamsPdf(data: RamsPdfData, filename?: string) {
  const doc = generateRamsPdf(data);
  const defaultFilename = `${data.ramsReference}_RAMS_${format(new Date(), "yyyyMMdd")}.pdf`;
  doc.save(filename || defaultFilename);
}
