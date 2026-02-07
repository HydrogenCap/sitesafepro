import jsPDF from 'jspdf';
import type { COSHHSubstance } from '@/types/coshh';
import { SUBSTANCE_TYPE_LABELS, HAZARD_PICTOGRAM_INFO, PPE_TYPE_LABELS } from '@/types/coshh';

interface COSHHPDFOptions {
  substances: COSHHSubstance[];
  projectName: string;
  organisationName: string;
  projectAddress: string;
}

export const generateCOSHHPDF = async ({
  substances,
  projectName,
  organisationName,
  projectAddress,
}: COSHHPDFOptions) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  // Helper function to add new page if needed
  const checkNewPage = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('COSHH Register', margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('Control of Substances Hazardous to Health', margin, yPos);
  yPos += 10;

  // Project details box
  doc.setDrawColor(200);
  doc.setFillColor(248, 249, 250);
  doc.roundedRect(margin, yPos, pageWidth - margin * 2, 25, 2, 2, 'F');
  
  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(organisationName, margin + 5, yPos + 7);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Project: ${projectName}`, margin + 5, yPos + 13);
  if (projectAddress) {
    doc.text(`Address: ${projectAddress}`, margin + 5, yPos + 19);
  }
  
  doc.text(`Date: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, pageWidth - margin - 50, yPos + 7);
  yPos += 32;

  // Summary
  const activeSubstances = substances.filter(s => s.is_active);
  const healthSurveillanceCount = activeSubstances.filter(s => s.health_surveillance_required).length;
  const missingSdsCount = activeSubstances.filter(s => !s.sds_available).length;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', margin, yPos);
  yPos += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Total substances on site: ${activeSubstances.length}`, margin, yPos);
  yPos += 5;
  
  if (healthSurveillanceCount > 0) {
    doc.setTextColor(200, 0, 0);
    doc.text(`Requiring health surveillance: ${healthSurveillanceCount}`, margin, yPos);
    doc.setTextColor(0);
  } else {
    doc.text(`Requiring health surveillance: ${healthSurveillanceCount}`, margin, yPos);
  }
  yPos += 5;
  
  if (missingSdsCount > 0) {
    doc.setTextColor(200, 100, 0);
    doc.text(`Missing Safety Data Sheets: ${missingSdsCount}`, margin, yPos);
    doc.setTextColor(0);
  } else {
    doc.text(`Missing Safety Data Sheets: ${missingSdsCount}`, margin, yPos);
  }
  yPos += 12;

  // Table header
  const colWidths = [45, 25, 40, 35, 25];
  const headers = ['Product', 'Type', 'Hazards', 'PPE', 'SDS'];
  
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPos, pageWidth - margin * 2, 8, 'F');
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  let xPos = margin + 2;
  headers.forEach((header, i) => {
    doc.text(header, xPos, yPos + 5);
    xPos += colWidths[i];
  });
  yPos += 10;

  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  activeSubstances.forEach((substance, index) => {
    checkNewPage(20);

    // Alternating row background
    if (index % 2 === 0) {
      doc.setFillColor(252, 252, 252);
      doc.rect(margin, yPos - 2, pageWidth - margin * 2, 12, 'F');
    }

    // Health surveillance highlight
    if (substance.health_surveillance_required) {
      doc.setFillColor(255, 240, 240);
      doc.rect(margin, yPos - 2, pageWidth - margin * 2, 12, 'F');
    }

    xPos = margin + 2;

    // Product name
    const productText = substance.product_name.length > 25 
      ? substance.product_name.substring(0, 22) + '...' 
      : substance.product_name;
    doc.text(productText, xPos, yPos + 3);
    if (substance.manufacturer) {
      doc.setFontSize(6);
      doc.setTextColor(100);
      const mfgText = substance.manufacturer.length > 25 
        ? substance.manufacturer.substring(0, 22) + '...' 
        : substance.manufacturer;
      doc.text(mfgText, xPos, yPos + 7);
      doc.setTextColor(0);
      doc.setFontSize(8);
    }
    xPos += colWidths[0];

    // Type
    doc.text(SUBSTANCE_TYPE_LABELS[substance.substance_type] || substance.substance_type, xPos, yPos + 3);
    xPos += colWidths[1];

    // Hazards (as text abbreviations)
    const hazardAbbrevs = substance.hazard_pictograms
      .map(h => HAZARD_PICTOGRAM_INFO[h]?.label.substring(0, 4) || h)
      .slice(0, 4)
      .join(', ');
    const hazardText = hazardAbbrevs || 'None';
    doc.text(hazardText, xPos, yPos + 3);
    xPos += colWidths[2];

    // PPE
    const ppeAbbrevs = substance.ppe_required
      .map(p => {
        const label = PPE_TYPE_LABELS[p as keyof typeof PPE_TYPE_LABELS] || p;
        return label.split(' ')[0].substring(0, 6);
      })
      .slice(0, 3)
      .join(', ');
    const ppeText = ppeAbbrevs || 'None';
    doc.text(ppeText, xPos, yPos + 3);
    xPos += colWidths[3];

    // SDS status
    if (substance.sds_available) {
      doc.setTextColor(0, 150, 0);
      doc.text('✓', xPos, yPos + 3);
    } else {
      doc.setTextColor(200, 0, 0);
      doc.text('✗', xPos, yPos + 3);
    }
    doc.setTextColor(0);

    yPos += 12;
  });

  // Footer
  checkNewPage(20);
  yPos = pageHeight - 15;
  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text('Generated by SiteSafe Pro', margin, yPos);
  doc.text(`Page 1 of ${doc.getNumberOfPages()}`, pageWidth - margin - 20, yPos);

  // Save
  const fileName = `COSHH_Register_${projectName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
