import jsPDF from "jspdf";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType } from "docx";
import { saveAs } from "file-saver";

export interface DocumentSection {
  heading: string;
  content: string;
  type: "text" | "table" | "checklist";
}

export interface DocumentData {
  title: string;
  reference: string;
  date: string;
  sections: DocumentSection[];
}

// PDF Generation
export function generateDocumentPDF(doc: DocumentData, organisationName?: string) {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  // Helper to add page break if needed
  const checkPageBreak = (requiredSpace: number) => {
    if (yPos + requiredSpace > pdf.internal.pageSize.getHeight() - margin) {
      pdf.addPage();
      yPos = margin;
    }
  };

  // Header
  pdf.setFillColor(15, 118, 110); // Primary color
  pdf.rect(0, 0, pageWidth, 40, "F");
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text(doc.title, margin, 25);
  
  if (organisationName) {
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text(organisationName, pageWidth - margin, 15, { align: "right" });
  }

  pdf.setTextColor(200, 200, 200);
  pdf.setFontSize(9);
  pdf.text(`Ref: ${doc.reference}`, pageWidth - margin, 32, { align: "right" });

  yPos = 55;

  // Document info
  pdf.setTextColor(100, 100, 100);
  pdf.setFontSize(10);
  pdf.text(`Generated: ${doc.date || new Date().toLocaleDateString("en-GB")}`, margin, yPos);
  yPos += 15;

  // Sections
  doc.sections?.forEach((section) => {
    checkPageBreak(40);

    // Section heading
    pdf.setTextColor(15, 118, 110);
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text(section.heading, margin, yPos);
    yPos += 10;

    // Section content
    pdf.setTextColor(50, 50, 50);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");

    if (section.type === "table") {
      // Try to parse table data
      try {
        const tableData = typeof section.content === "string" 
          ? JSON.parse(section.content) 
          : section.content;
        
        if (tableData.columns && tableData.rows) {
          const colWidth = contentWidth / tableData.columns.length;
          const rowHeight = 8;

          // Header row
          checkPageBreak(rowHeight * 2);
          pdf.setFillColor(240, 240, 240);
          pdf.rect(margin, yPos - 5, contentWidth, rowHeight + 2, "F");
          pdf.setFont("helvetica", "bold");
          tableData.columns.forEach((col: string, i: number) => {
            pdf.text(col, margin + i * colWidth + 2, yPos);
          });
          yPos += rowHeight + 2;

          // Data rows
          pdf.setFont("helvetica", "normal");
          tableData.rows?.forEach((row: string[]) => {
            checkPageBreak(rowHeight);
            row.forEach((cell: string, i: number) => {
              const text = String(cell || "").substring(0, 30);
              pdf.text(text, margin + i * colWidth + 2, yPos);
            });
            yPos += rowHeight;
          });
        }
      } catch {
        // Fallback to text if JSON parsing fails
        const lines = pdf.splitTextToSize(section.content, contentWidth);
        lines.forEach((line: string) => {
          checkPageBreak(7);
          pdf.text(line, margin, yPos);
          yPos += 6;
        });
      }
    } else if (section.type === "checklist") {
      try {
        const checklistData = typeof section.content === "string"
          ? JSON.parse(section.content)
          : section.content;

        if (checklistData.items) {
          checklistData.items.forEach((item: string) => {
            checkPageBreak(8);
            pdf.rect(margin, yPos - 4, 4, 4);
            pdf.text(item, margin + 8, yPos);
            yPos += 8;
          });
        }
      } catch {
        // Fallback to bullet points
        const items = section.content.split("\n").filter(Boolean);
        items.forEach((item) => {
          checkPageBreak(8);
          pdf.text(`• ${item.replace(/^[•\-]\s*/, "")}`, margin, yPos);
          yPos += 7;
        });
      }
    } else {
      // Regular text content
      const content = section.content || "";
      const lines = content.split("\n");
      
      lines.forEach((line) => {
        if (line.startsWith("•") || line.startsWith("-")) {
          checkPageBreak(7);
          pdf.text(line, margin + 5, yPos);
          yPos += 6;
        } else {
          const wrappedLines = pdf.splitTextToSize(line, contentWidth);
          wrappedLines.forEach((wrappedLine: string) => {
            checkPageBreak(7);
            pdf.text(wrappedLine, margin, yPos);
            yPos += 6;
          });
        }
      });
    }

    yPos += 10;
  });

  // Footer on each page
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(
      `Page ${i} of ${pageCount} | Generated by Site Safe`,
      pageWidth / 2,
      pdf.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  // Save
  const filename = `${doc.title.replace(/[^a-z0-9]/gi, "_")}_${doc.reference}.pdf`;
  pdf.save(filename);
}

// DOCX Generation
export async function generateDocumentDOCX(doc: DocumentData, organisationName?: string) {
  const children: (Paragraph | Table)[] = [];

  // Title
  children.push(
    new Paragraph({
      text: doc.title,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    })
  );

  // Document info
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: "Reference: ", bold: true }),
        new TextRun(doc.reference),
      ],
      spacing: { after: 100 },
    })
  );

  if (organisationName) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Organisation: ", bold: true }),
          new TextRun(organisationName),
        ],
        spacing: { after: 100 },
      })
    );
  }

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: "Date: ", bold: true }),
        new TextRun(doc.date || new Date().toLocaleDateString("en-GB")),
      ],
      spacing: { after: 400 },
    })
  );

  // Sections
  doc.sections?.forEach((section) => {
    // Section heading
    children.push(
      new Paragraph({
        text: section.heading,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 },
      })
    );

    if (section.type === "table") {
      try {
        const tableData = typeof section.content === "string"
          ? JSON.parse(section.content)
          : section.content;

        if (tableData.columns && tableData.rows) {
          // Create table header
          const headerRow = new TableRow({
            children: tableData.columns.map(
              (col: string) =>
                new TableCell({
                  children: [new Paragraph({ text: col, alignment: AlignmentType.CENTER })],
                  shading: { fill: "E0E0E0" },
                })
            ),
          });

          // Create data rows
          const dataRows = (tableData.rows || []).map(
            (row: string[]) =>
              new TableRow({
                children: row.map(
                  (cell: string) =>
                    new TableCell({
                      children: [new Paragraph(String(cell || ""))],
                    })
                ),
              })
          );

          children.push(
            new Table({
              rows: [headerRow, ...dataRows],
              width: { size: 100, type: WidthType.PERCENTAGE },
            })
          );
        }
      } catch {
        // Fallback to paragraph
        children.push(
          new Paragraph({
            text: section.content,
            spacing: { after: 200 },
          })
        );
      }
    } else if (section.type === "checklist") {
      try {
        const checklistData = typeof section.content === "string"
          ? JSON.parse(section.content)
          : section.content;

        if (checklistData.items) {
          checklistData.items.forEach((item: string) => {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({ text: "☐ " }),
                  new TextRun(item),
                ],
                spacing: { after: 100 },
              })
            );
          });
        }
      } catch {
        // Fallback to bullet list
        section.content.split("\n").filter(Boolean).forEach((item) => {
          children.push(
            new Paragraph({
              text: `• ${item.replace(/^[•\-]\s*/, "")}`,
              spacing: { after: 100 },
            })
          );
        });
      }
    } else {
      // Regular text
      const lines = (section.content || "").split("\n");
      lines.forEach((line) => {
        if (line.trim()) {
          children.push(
            new Paragraph({
              text: line,
              spacing: { after: 100 },
            })
          );
        }
      });
    }
  });

  // Footer
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Generated by Site Safe",
          italics: true,
          color: "999999",
        }),
      ],
      spacing: { before: 400 },
    })
  );

  const docx = new Document({
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(docx);
  const filename = `${doc.title.replace(/[^a-z0-9]/gi, "_")}_${doc.reference}.docx`;
  saveAs(blob, filename);
}
