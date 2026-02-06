import { jsPDF } from "jspdf";
import { format } from "date-fns";

// Common PDF styling utilities
export const PDF_COLORS = {
  primary: [15, 118, 110] as [number, number, number], // teal-700
  text: [31, 41, 55] as [number, number, number], // gray-800
  muted: [107, 114, 128] as [number, number, number], // gray-500
  border: [229, 231, 235] as [number, number, number], // gray-200
};

export const createPdfDocument = () => {
  const doc = new jsPDF();
  return doc;
};

export const addHeader = (doc: jsPDF, title: string, subtitle?: string) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Title
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PDF_COLORS.text);
  doc.text(title, pageWidth / 2, yPos, { align: "center" });
  yPos += 10;

  // Subtitle
  if (subtitle) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PDF_COLORS.muted);
    doc.text(subtitle, pageWidth / 2, yPos, { align: "center" });
    yPos += 8;
  }

  // Divider
  yPos += 5;
  doc.setDrawColor(...PDF_COLORS.border);
  doc.line(20, yPos, pageWidth - 20, yPos);
  yPos += 10;

  return yPos;
};

export const addSectionTitle = (doc: jsPDF, title: string, yPos: number) => {
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PDF_COLORS.primary);
  doc.text(title, 20, yPos);
  return yPos + 8;
};

export const addKeyValue = (doc: jsPDF, key: string, value: string, yPos: number, xOffset: number = 20) => {
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PDF_COLORS.muted);
  doc.text(key + ":", xOffset, yPos);
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PDF_COLORS.text);
  doc.text(value, xOffset + 2, yPos + 5);
  
  return yPos + 12;
};

export const addTableHeader = (doc: jsPDF, headers: { label: string; x: number }[], yPos: number) => {
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PDF_COLORS.text);
  
  headers.forEach(header => {
    doc.text(header.label, header.x, yPos);
  });
  
  yPos += 2;
  doc.setDrawColor(...PDF_COLORS.border);
  doc.line(20, yPos, doc.internal.pageSize.getWidth() - 20, yPos);
  
  return yPos + 6;
};

export const checkPageBreak = (doc: jsPDF, yPos: number, requiredSpace: number = 30) => {
  if (yPos > doc.internal.pageSize.getHeight() - requiredSpace) {
    doc.addPage();
    return 20;
  }
  return yPos;
};

export const addFooter = (doc: jsPDF, orgName?: string) => {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...PDF_COLORS.muted);
    
    // Company name and generation date
    const footerText = `Generated on ${format(new Date(), "dd/MM/yyyy HH:mm")}${orgName ? ` - ${orgName}` : ""} - SiteSafe Pro`;
    doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: "center" });
    
    // Page numbers
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 20, pageHeight - 10, { align: "right" });
  }
};

export const addSignatureImage = (doc: jsPDF, signatureData: string, x: number, y: number, width: number = 25, height: number = 10) => {
  try {
    doc.addImage(signatureData, "PNG", x, y - 3, width, height);
    return true;
  } catch (e) {
    return false;
  }
};

export const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
};

export const formatCurrency = (amount: number, currency: string = "GBP") => {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
  }).format(amount);
};

export const wrapText = (doc: jsPDF, text: string, maxWidth: number) => {
  return doc.splitTextToSize(text, maxWidth);
};