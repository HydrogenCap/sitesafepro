import {
  PDFDocument, PDFFont, PDFPage, StandardFonts, rgb, degrees,
} from "https://esm.sh/pdf-lib@1.17.1";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const BRAND_NAVY   = rgb(0.09, 0.18, 0.38);
const BRAND_ORANGE = rgb(0.96, 0.50, 0.09);
const GREY_LIGHT   = rgb(0.94, 0.94, 0.94);
const GREY_MID     = rgb(0.55, 0.55, 0.55);
const BLACK        = rgb(0, 0, 0);
const WHITE        = rgb(1, 1, 1);

const PAGE_WIDTH  = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN      = 48;

interface PdfBuildInput {
  version: any;
  evidence: any[];
  signatures: any[];
  allVersions: any[];
  exportId: string;
  supabaseAdmin: SupabaseClient;
}

export async function buildEvidencePdf(input: PdfBuildInput): Promise<Uint8Array> {
  const { version, evidence, signatures, allVersions, exportId, supabaseAdmin } = input;
  const doc_meta = version.documents as any;
  const org = doc_meta.organisations as any;
  const project = doc_meta.projects as any;

  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const ctx = { pdfDoc, fontRegular, fontBold };

  await drawCoverPage(ctx, { version, org, project, doc_meta });
  await drawApprovalPage(ctx, { version, signatures });
  await drawContentPages(ctx, { version });

  if (evidence.length > 0) {
    await drawEvidenceAppendix(ctx, { evidence, supabaseAdmin });
  }

  await drawVersionHistoryPage(ctx, { allVersions, exportId });

  return pdfDoc.save();
}

async function drawCoverPage(ctx: any, data: any) {
  const { pdfDoc, fontRegular, fontBold } = ctx;
  const { version, org, project, doc_meta } = data;
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 160, width: PAGE_WIDTH, height: 160, color: BRAND_NAVY });
  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 168, width: PAGE_WIDTH, height: 8, color: BRAND_ORANGE });

  page.drawText(org?.name ?? "Organisation", {
    x: MARGIN, y: PAGE_HEIGHT - 55, size: 22, font: fontBold, color: WHITE,
  });

  page.drawText("EVIDENCE PACK", {
    x: MARGIN, y: PAGE_HEIGHT - 85, size: 11, font: fontRegular, color: BRAND_ORANGE,
  });

  page.drawText(doc_meta?.title ?? "Document", {
    x: MARGIN, y: PAGE_HEIGHT - 240, size: 28, font: fontBold, color: BRAND_NAVY,
    maxWidth: PAGE_WIDTH - MARGIN * 2,
  });

  const rows = [
    ["Document Type", doc_meta?.type?.replace(/_/g, " ").toUpperCase() ?? "—"],
    ["Version", `v${version.version_number}`],
    ["Status", version.status?.toUpperCase()],
    ["Project", project?.name ?? "—"],
    ["Project Address", project?.address ?? "—"],
    ["Organisation", org?.name ?? "—"],
    ["Export Date", new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })],
  ];

  let y = PAGE_HEIGHT - 330;
  for (const [label, value] of rows) {
    page.drawText(label + ":", { x: MARGIN, y, size: 9, font: fontBold, color: GREY_MID });
    page.drawText(String(value ?? ""), { x: MARGIN + 130, y, size: 9, font: fontRegular, color: BLACK });
    y -= 20;
  }

  page.drawText("CONTROLLED COPY", {
    x: 140, y: 160, size: 52, font: fontBold,
    color: rgb(0.88, 0.88, 0.88), rotate: degrees(35), opacity: 0.35,
  });

  drawPageFooter(page, fontRegular, 1);
}

async function drawApprovalPage(ctx: any, data: any) {
  const { pdfDoc, fontRegular, fontBold } = ctx;
  const { version, signatures } = data;
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  drawSectionHeader(page, fontBold, "Approval Chain");

  let y = PAGE_HEIGHT - 120;
  const badgeColor = version.status === "approved" ? rgb(0.07, 0.53, 0.29) : GREY_MID;
  page.drawRectangle({ x: MARGIN, y: y - 10, width: 100, height: 24, color: badgeColor });
  page.drawText(version.status?.toUpperCase(), {
    x: MARGIN + 10, y: y - 2, size: 10, font: fontBold, color: WHITE,
  });
  y -= 50;

  if (version.approved_at) {
    page.drawText("Approved:", { x: MARGIN, y, size: 10, font: fontBold, color: BLACK });
    page.drawText(new Date(version.approved_at).toLocaleString("en-GB"),
      { x: MARGIN + 80, y, size: 10, font: fontRegular, color: BLACK });
    y -= 22;
  }

  if (version.change_summary) {
    page.drawText("Change Summary:", { x: MARGIN, y, size: 10, font: fontBold, color: BLACK });
    y -= 18;
    page.drawText(version.change_summary,
      { x: MARGIN + 16, y, size: 9, font: fontRegular, color: GREY_MID, maxWidth: PAGE_WIDTH - MARGIN * 2 - 16 });
    y -= 30;
  }

  if (signatures.length > 0) {
    page.drawText("Signatures", { x: MARGIN, y, size: 14, font: fontBold, color: BRAND_NAVY });
    y -= 24;
    for (const sig of signatures) {
      page.drawLine({ start: { x: MARGIN, y: y + 2 }, end: { x: PAGE_WIDTH - MARGIN, y: y + 2 }, thickness: 0.5, color: GREY_LIGHT });
      page.drawText(sig.full_name_at_time, { x: MARGIN, y: y - 14, size: 10, font: fontBold, color: BLACK });
      page.drawText(sig.role_at_time, { x: MARGIN, y: y - 28, size: 9, font: fontRegular, color: GREY_MID });
      page.drawText(sig.purpose?.toUpperCase(), { x: MARGIN + 200, y: y - 14, size: 9, font: fontBold, color: BRAND_ORANGE });
      page.drawText(new Date(sig.signed_at).toLocaleString("en-GB"),
        { x: PAGE_WIDTH - MARGIN - 150, y: y - 14, size: 9, font: fontRegular, color: GREY_MID });
      if (sig.typed_signature) {
        page.drawText(sig.typed_signature,
          { x: MARGIN, y: y - 44, size: 11, font: fontRegular, color: BRAND_NAVY, opacity: 0.7 });
      }
      y -= 70;
      if (y < MARGIN + 80) break;
    }
  }

  drawPageFooter(page, fontRegular, 2);
}

async function drawContentPages(ctx: any, data: any) {
  const { pdfDoc, fontRegular, fontBold } = ctx;
  const { version } = data;
  const content = version.content_json as Record<string, any>;
  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  drawSectionHeader(page, fontBold, "Document Content");
  y -= 70;

  let pageNum = 3;

  for (const [key, value] of Object.entries(content)) {
    if (key.startsWith("_")) continue;
    const label = key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    page.drawText(label, { x: MARGIN, y, size: 11, font: fontBold, color: BRAND_NAVY });
    y -= 18;

    const text = typeof value === "string" ? value
      : typeof value === "object" ? JSON.stringify(value, null, 2)
      : String(value ?? "");

    const words = text.split(/\s+/);
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (fontRegular.widthOfTextAtSize(test, 9) > PAGE_WIDTH - MARGIN * 2) {
        page.drawText(line, { x: MARGIN + 8, y, size: 9, font: fontRegular, color: BLACK, maxWidth: PAGE_WIDTH - MARGIN * 2 - 8 });
        y -= 14;
        line = word;
        if (y < MARGIN + 40) {
          drawPageFooter(page, fontRegular, ++pageNum);
          page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
          y = PAGE_HEIGHT - MARGIN;
        }
      } else {
        line = test;
      }
    }
    if (line) {
      page.drawText(line, { x: MARGIN + 8, y, size: 9, font: fontRegular, color: BLACK });
      y -= 14;
    }
    y -= 16;
  }

  drawPageFooter(page, fontRegular, pageNum);
}

async function drawEvidenceAppendix(ctx: any, data: any) {
  const { pdfDoc, fontRegular, fontBold } = ctx;
  const { evidence, supabaseAdmin } = data;
  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  drawSectionHeader(page, fontBold, "Evidence Appendix");

  let y = PAGE_HEIGHT - 120;
  let pageNum = 10;

  for (const item of evidence) {
    if (y < MARGIN + 120) {
      drawPageFooter(page, fontRegular, ++pageNum);
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }

    page.drawRectangle({ x: MARGIN, y: y - 8, width: 70, height: 18, color: GREY_LIGHT });
    page.drawText(item.type?.toUpperCase(),
      { x: MARGIN + 6, y: y - 2, size: 8, font: fontBold, color: GREY_MID });

    page.drawText(item.caption ?? "(no caption)",
      { x: MARGIN + 80, y, size: 10, font: fontBold, color: BLACK });

    page.drawText(
      `Uploaded: ${new Date(item.created_at).toLocaleString("en-GB")}`,
      { x: MARGIN + 80, y: y - 16, size: 8, font: fontRegular, color: GREY_MID }
    );

    if (item.metadata_json?.lat) {
      page.drawText(
        `Location: ${item.metadata_json.lat.toFixed(5)}, ${item.metadata_json.lng.toFixed(5)}`,
        { x: MARGIN + 80, y: y - 28, size: 8, font: fontRegular, color: GREY_MID }
      );
    }

    if ((item.type === "photo" || item.type === "annotation") && item.storage_path) {
      try {
        const { data: fileData, error } = await supabaseAdmin.storage
          .from("evidence").download(item.storage_path);
        if (!error && fileData) {
          const ab = await fileData.arrayBuffer();
          const imgEmbed = item.storage_path.endsWith(".png")
            ? await pdfDoc.embedPng(ab)
            : await pdfDoc.embedJpg(ab);
          const { width, height } = imgEmbed.scale(1);
          const maxW = 220;
          const scale = Math.min(maxW / width, 120 / height);
          page.drawImage(imgEmbed, {
            x: MARGIN, y: y - 16 - (height * scale),
            width: width * scale, height: height * scale,
          });
          y -= (height * scale) + 40;
          continue;
        }
      } catch { /* skip image on error */ }
    }

    if (item.type === "note" && item.metadata_json?.text) {
      page.drawText(item.metadata_json.text,
        { x: MARGIN, y: y - 40, size: 9, font: fontRegular, color: BLACK, maxWidth: PAGE_WIDTH - MARGIN * 2 });
      y -= 70;
      continue;
    }

    y -= 55;
  }

  drawPageFooter(page, fontRegular, pageNum);
}

async function drawVersionHistoryPage(ctx: any, data: any) {
  const { pdfDoc, fontRegular, fontBold } = ctx;
  const { allVersions, exportId } = data;
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  drawSectionHeader(page, fontBold, "Version History");

  let y = PAGE_HEIGHT - 120;

  const cols = [MARGIN, MARGIN + 50, MARGIN + 100, MARGIN + 300, MARGIN + 420];
  const headers = ["Ver.", "Status", "Summary", "Created", "Approved"];
  for (let i = 0; i < headers.length; i++) {
    page.drawText(headers[i], { x: cols[i], y, size: 9, font: fontBold, color: BRAND_NAVY });
  }
  y -= 4;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 1, color: BRAND_NAVY });
  y -= 16;

  for (const v of [...allVersions].reverse()) {
    page.drawText(`v${v.version_number}`, { x: cols[0], y, size: 8, font: fontBold, color: BLACK });
    page.drawText(v.status ?? "", { x: cols[1], y, size: 8, font: fontRegular, color: GREY_MID });
    page.drawText(v.change_summary ?? "—", { x: cols[2], y, size: 8, font: fontRegular, color: BLACK, maxWidth: 190 });
    page.drawText(new Date(v.created_at).toLocaleDateString("en-GB"), { x: cols[3], y, size: 8, font: fontRegular, color: GREY_MID });
    page.drawText(v.approved_at ? new Date(v.approved_at).toLocaleDateString("en-GB") : "—", { x: cols[4], y, size: 8, font: fontRegular, color: GREY_MID });
    y -= 18;
    if (y < MARGIN + 40) break;
  }

  page.drawText(
    `Generated by SiteSafePro · ${new Date().toISOString()} · Export ID: ${exportId}`,
    { x: MARGIN, y: MARGIN + 16, size: 7, font: fontRegular, color: GREY_MID }
  );

  drawPageFooter(page, fontRegular, allVersions.length + 4);
}

function drawSectionHeader(page: PDFPage, fontBold: PDFFont, title: string) {
  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 90, width: PAGE_WIDTH, height: 90, color: BRAND_NAVY });
  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 96, width: PAGE_WIDTH, height: 6, color: BRAND_ORANGE });
  page.drawText(title, { x: MARGIN, y: PAGE_HEIGHT - 55, size: 20, font: fontBold, color: WHITE });
}

function drawPageFooter(page: PDFPage, fontRegular: PDFFont, pageNum: number) {
  page.drawLine({ start: { x: MARGIN, y: MARGIN + 20 }, end: { x: PAGE_WIDTH - MARGIN, y: MARGIN + 20 }, thickness: 0.5, color: GREY_LIGHT });
  page.drawText("SiteSafePro · Confidential · Do not distribute",
    { x: MARGIN, y: MARGIN + 6, size: 7, font: fontRegular, color: GREY_MID });
  page.drawText(`Page ${pageNum}`,
    { x: PAGE_WIDTH - MARGIN - 40, y: MARGIN + 6, size: 7, font: fontRegular, color: GREY_MID });
}
