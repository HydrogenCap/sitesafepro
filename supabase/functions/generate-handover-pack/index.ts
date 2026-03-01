import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import {
  PDFDocument, StandardFonts, rgb,
} from "https://esm.sh/pdf-lib@1.17.1";
import { storagePaths } from "../_shared/storage-paths.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BRAND_NAVY   = rgb(0.09, 0.18, 0.38);
const BRAND_ORANGE = rgb(0.96, 0.50, 0.09);
const GREY_LIGHT   = rgb(0.94, 0.94, 0.94);
const GREY_MID     = rgb(0.55, 0.55, 0.55);
const BLACK        = rgb(0, 0, 0);
const WHITE        = rgb(1, 1, 1);
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 48;

const log = (step: string, d?: Record<string, unknown>) =>
  console.log(`[HANDOVER] ${step}${d ? " - " + JSON.stringify(d) : ""}`);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub as string;

    const body = await req.json();
    const { org_id, project_id } = body;
    if (!org_id || !project_id) {
      return new Response(JSON.stringify({ error: "org_id and project_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    log("Start", { org_id, project_id, userId });

    // Delete any previous completed handover packs so we always regenerate with latest data
    const { data: existingPacks } = await admin
      .from("document_exports")
      .select("id, storage_path")
      .eq("project_id", project_id)
      .eq("export_type", "handover_pack");

    if (existingPacks && existingPacks.length > 0) {
      for (const pack of existingPacks) {
        if (pack.storage_path) {
          await admin.storage.from("exports").remove([pack.storage_path]);
        }
      }
      await admin.from("document_exports").delete().in("id", existingPacks.map(p => p.id));
      log("Cleaned up previous packs", { count: existingPacks.length });
    }

    // Fetch all data in parallel
    const [projectRes, orgRes, docsRes, actionsRes, incidentsRes, inspectionsRes] = await Promise.all([
      admin.from("projects").select("*").eq("id", project_id).eq("organisation_id", org_id).single(),
      admin.from("organisations").select("id, name, slug").eq("id", org_id).single(),
      admin.from("documents").select("id, name, category, status, file_path, file_size, version, created_at, expiry_date, type").eq("project_id", project_id).eq("organisation_id", org_id).order("created_at"),
      admin.from("corrective_actions").select("id, title, description, status, priority, due_date, assigned_to, raised_at, resolution_notes").eq("project_id", project_id).eq("organisation_id", org_id).order("raised_at"),
      admin.from("incidents").select("id, title, description, severity, status, incident_date, is_riddor_reportable, immediate_actions, location").eq("project_id", project_id).eq("organisation_id", org_id).order("incident_date"),
      admin.from("inspections").select("id, inspection_type, inspection_date, inspector_id, overall_result, notes, title").eq("project_id", project_id).eq("organisation_id", org_id).order("inspection_date"),
    ]);

    const project = projectRes.data;
    const org = orgRes.data;
    if (!project || !org) {
      return new Response(JSON.stringify({ error: "Project or organisation not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const documents = docsRes.data ?? [];
    const actions = actionsRes.data ?? [];
    const incidents = incidentsRes.data ?? [];
    const inspections = inspectionsRes.data ?? [];

    log("Data loaded", { docs: documents.length, actions: actions.length, incidents: incidents.length, inspections: inspections.length });

    // Create export row
    const { data: exportRow } = await admin
      .from("document_exports")
      .insert({
        organisation_id: org_id,
        project_id,
        export_type: "handover_pack",
        status: "processing",
        created_by: userId,
        metadata: { sections: ["cover", "summary", "documents", "inspections", "incidents", "actions"] },
      })
      .select("id")
      .single();

    const exportId = exportRow!.id;

    try {
      // Build PDF
      const pdfDoc = await PDFDocument.create();
      const fontR = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontB = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
      const today = fmtDate(new Date().toISOString());

      let pageNum = 0;
      const newPage = () => { pageNum++; return pdfDoc.addPage([PAGE_W, PAGE_H]); };
      const footer = (p: any) => {
        p.drawLine({ start: { x: M, y: M + 20 }, end: { x: PAGE_W - M, y: M + 20 }, thickness: 0.5, color: GREY_LIGHT });
        p.drawText("SiteSafe Cloud · Health & Safety File · Confidential", { x: M, y: M + 6, size: 7, font: fontR, color: GREY_MID });
        p.drawText(`Page ${pageNum}`, { x: PAGE_W - M - 40, y: M + 6, size: 7, font: fontR, color: GREY_MID });
      };
      const sectionHeader = (p: any, title: string) => {
        p.drawRectangle({ x: 0, y: PAGE_H - 90, width: PAGE_W, height: 90, color: BRAND_NAVY });
        p.drawRectangle({ x: 0, y: PAGE_H - 96, width: PAGE_W, height: 6, color: BRAND_ORANGE });
        p.drawText(title, { x: M, y: PAGE_H - 55, size: 20, font: fontB, color: WHITE });
      };

      // === 1. COVER PAGE ===
      const cover = newPage();
      cover.drawRectangle({ x: 0, y: PAGE_H - 200, width: PAGE_W, height: 200, color: BRAND_NAVY });
      cover.drawRectangle({ x: 0, y: PAGE_H - 208, width: PAGE_W, height: 8, color: BRAND_ORANGE });
      cover.drawText(org.name, { x: M, y: PAGE_H - 60, size: 22, font: fontB, color: WHITE });
      cover.drawText("PROJECT HANDOVER PACK", { x: M, y: PAGE_H - 90, size: 11, font: fontR, color: BRAND_ORANGE });
      cover.drawText("Health & Safety File — CDM 2015", { x: M, y: PAGE_H - 110, size: 10, font: fontR, color: GREY_LIGHT });
      cover.drawText(project.name, { x: M, y: PAGE_H - 280, size: 28, font: fontB, color: BRAND_NAVY, maxWidth: PAGE_W - M * 2 });

      const coverRows: [string, string][] = [
        ["Client", project.client_name ?? "—"],
        ["Address", project.address ?? "—"],
        ["Principal Designer", project.principal_designer ?? "—"],
        ["Start Date", fmtDate(project.start_date)],
        ["End Date", fmtDate(project.estimated_end_date)],
        ["Status", project.status?.toUpperCase()],
        ["Generated", today],
      ];
      let cy = PAGE_H - 370;
      for (const [l, v] of coverRows) {
        cover.drawText(l + ":", { x: M, y: cy, size: 9, font: fontB, color: GREY_MID });
        cover.drawText(v, { x: M + 140, y: cy, size: 9, font: fontR, color: BLACK });
        cy -= 22;
      }
      footer(cover);

      // === 2. PROJECT SUMMARY ===
      const summaryPage = newPage();
      sectionHeader(summaryPage, "Project Summary");
      let sy = PAGE_H - 130;
      const summaryItems: [string, string][] = [
        ["Total Documents", String(documents.length)],
        ["Approved Documents", String(documents.filter(d => d.status === "approved").length)],
        ["Total Inspections", String(inspections.length)],
        ["Total Incidents", String(incidents.length)],
        ["RIDDOR Reportable", String(incidents.filter((i: any) => i.is_riddor_reportable).length)],
        ["Open Actions", String(actions.filter(a => a.status === "open" || a.status === "in_progress").length)],
        ["Closed Actions", String(actions.filter(a => a.status === "closed" || a.status === "completed" || a.status === "verified").length)],
      ];
      for (const [l, v] of summaryItems) {
        summaryPage.drawText(l + ":", { x: M, y: sy, size: 10, font: fontB, color: BRAND_NAVY });
        summaryPage.drawText(v, { x: M + 180, y: sy, size: 10, font: fontR, color: BLACK });
        sy -= 24;
      }
      footer(summaryPage);

      // === 3. DOCUMENT REGISTER ===
      const docPage = newPage();
      sectionHeader(docPage, "Document Register");
      let dy = PAGE_H - 120;
      const dHeaders = ["Document Name", "Category", "Status", "Version", "Date"];
      const dCols = [M, M + 200, M + 310, M + 390, M + 430];
      for (let i = 0; i < dHeaders.length; i++) {
        docPage.drawText(dHeaders[i], { x: dCols[i], y: dy, size: 8, font: fontB, color: BRAND_NAVY });
      }
      dy -= 4;
      docPage.drawLine({ start: { x: M, y: dy }, end: { x: PAGE_W - M, y: dy }, thickness: 1, color: BRAND_NAVY });
      dy -= 16;

      let currentDocPage = docPage;
      for (const doc of documents) {
        if (dy < M + 50) {
          footer(currentDocPage);
          currentDocPage = newPage();
          dy = PAGE_H - M - 20;
        }
        const name = (doc.name ?? "").substring(0, 35);
        currentDocPage.drawText(name, { x: dCols[0], y: dy, size: 8, font: fontR, color: BLACK, maxWidth: 190 });
        currentDocPage.drawText(doc.category ?? "—", { x: dCols[1], y: dy, size: 8, font: fontR, color: GREY_MID });
        currentDocPage.drawText(doc.status ?? "—", { x: dCols[2], y: dy, size: 8, font: fontR, color: GREY_MID });
        currentDocPage.drawText(`v${doc.version}`, { x: dCols[3], y: dy, size: 8, font: fontR, color: GREY_MID });
        currentDocPage.drawText(fmtDate(doc.created_at), { x: dCols[4], y: dy, size: 8, font: fontR, color: GREY_MID });
        dy -= 16;
      }
      if (documents.length === 0) {
        currentDocPage.drawText("No documents recorded.", { x: M, y: dy, size: 10, font: fontR, color: GREY_MID });
      }
      footer(currentDocPage);

      // === 4. INSPECTION HISTORY ===
      const inspPage = newPage();
      sectionHeader(inspPage, "Inspection History");
      let iy = PAGE_H - 120;
      let currentInspPage = inspPage;
      for (const insp of inspections) {
        if (iy < M + 80) {
          footer(currentInspPage);
          currentInspPage = newPage();
          iy = PAGE_H - M - 20;
        }
        currentInspPage.drawText(fmtDate((insp as any).inspection_date), { x: M, y: iy, size: 9, font: fontB, color: BLACK });
        currentInspPage.drawText((insp as any).inspection_type ?? "General", { x: M + 90, y: iy, size: 9, font: fontR, color: BLACK });
        const resultText = (insp as any).overall_result ?? "—";
        currentInspPage.drawText(`Result: ${resultText}`, { x: M + 280, y: iy, size: 9, font: fontR, color: GREY_MID });
        if ((insp as any).title) {
          iy -= 14;
          currentInspPage.drawText((insp as any).title, { x: M + 16, y: iy, size: 8, font: fontR, color: BLACK, maxWidth: PAGE_W - M * 2 - 16 });
        }
        iy -= 18;
      }
      if (inspections.length === 0) {
        currentInspPage.drawText("No inspections recorded.", { x: M, y: iy, size: 10, font: fontR, color: GREY_MID });
      }
      footer(currentInspPage);

      // === 5. INCIDENT LOG ===
      const incPage = newPage();
      sectionHeader(incPage, "Incident Log");
      let iiy = PAGE_H - 120;
      let currentIncPage = incPage;
      for (const inc of incidents) {
        if (iiy < M + 100) {
          footer(currentIncPage);
          currentIncPage = newPage();
          iiy = PAGE_H - M - 20;
        }
        currentIncPage.drawText(fmtDate((inc as any).incident_date), { x: M, y: iiy, size: 9, font: fontB, color: BLACK });
        currentIncPage.drawText((inc as any).title ?? "Incident", { x: M + 90, y: iiy, size: 9, font: fontB, color: BLACK, maxWidth: 300 });
        iiy -= 16;
        currentIncPage.drawText(`Severity: ${(inc as any).severity ?? "—"}`, { x: M + 16, y: iiy, size: 8, font: fontR, color: GREY_MID });
        currentIncPage.drawText((inc as any).is_riddor_reportable ? "RIDDOR" : "", { x: M + 200, y: iiy, size: 8, font: fontB, color: rgb(0.8, 0.1, 0.1) });
        iiy -= 14;
        if ((inc as any).description) {
          currentIncPage.drawText((inc as any).description.substring(0, 200), { x: M + 16, y: iiy, size: 8, font: fontR, color: BLACK, maxWidth: PAGE_W - M * 2 - 16 });
          iiy -= 20;
        }
        iiy -= 10;
      }
      if (incidents.length === 0) {
        currentIncPage.drawText("No incidents recorded.", { x: M, y: iiy, size: 10, font: fontR, color: GREY_MID });
      }
      footer(currentIncPage);

      // === 6. CORRECTIVE ACTIONS ===
      const actPage = newPage();
      sectionHeader(actPage, "Corrective Actions");
      let ay = PAGE_H - 120;
      let currentActPage = actPage;

      const openActions = actions.filter(a => a.status === "open" || a.status === "in_progress");
      const closedActions = actions.filter(a => a.status !== "open" && a.status !== "in_progress");

      if (openActions.length > 0) {
        currentActPage.drawText(`Open Actions (${openActions.length})`, { x: M, y: ay, size: 12, font: fontB, color: rgb(0.8, 0.1, 0.1) });
        ay -= 24;
        for (const act of openActions) {
          if (ay < M + 80) { footer(currentActPage); currentActPage = newPage(); ay = PAGE_H - M - 20; }
          currentActPage.drawText(act.title, { x: M, y: ay, size: 9, font: fontB, color: BLACK, maxWidth: 350 });
          currentActPage.drawText(`Due: ${fmtDate(act.due_date)}`, { x: M + 380, y: ay, size: 8, font: fontR, color: GREY_MID });
          ay -= 14;
          currentActPage.drawText(`Priority: ${act.priority}  |  Status: ${act.status}`, { x: M + 16, y: ay, size: 8, font: fontR, color: GREY_MID });
          ay -= 20;
        }
        ay -= 10;
      }

      if (closedActions.length > 0) {
        if (ay < M + 60) { footer(currentActPage); currentActPage = newPage(); ay = PAGE_H - M - 20; }
        currentActPage.drawText(`Closed Actions (${closedActions.length})`, { x: M, y: ay, size: 12, font: fontB, color: rgb(0.07, 0.53, 0.29) });
        ay -= 24;
        for (const act of closedActions) {
          if (ay < M + 60) { footer(currentActPage); currentActPage = newPage(); ay = PAGE_H - M - 20; }
          currentActPage.drawText(act.title, { x: M, y: ay, size: 9, font: fontR, color: BLACK, maxWidth: 350 });
          currentActPage.drawText(act.status, { x: M + 380, y: ay, size: 8, font: fontR, color: GREY_MID });
          ay -= 18;
        }
      }

      if (actions.length === 0) {
        currentActPage.drawText("No corrective actions recorded.", { x: M, y: ay, size: 10, font: fontR, color: GREY_MID });
      }
      footer(currentActPage);

      // Save PDF
      const pdfBytes = await pdfDoc.save();
      const storagePath = storagePaths.handoverPack(org_id, project_id, exportId);

      const { error: uploadErr } = await admin.storage
        .from("exports")
        .upload(storagePath, pdfBytes, { contentType: "application/pdf", upsert: false });

      if (uploadErr) throw uploadErr;

      await admin.from("document_exports").update({
        status: "completed",
        storage_path: storagePath,
        completed_at: new Date().toISOString(),
      }).eq("id", exportId);

      log("Pack generated", { exportId, pages: pageNum });

      return new Response(JSON.stringify({ export_id: exportId, status: "completed", ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await admin.from("document_exports").update({ status: "failed", error: msg }).eq("id", exportId);
      log("ERROR", { msg });
      return new Response(JSON.stringify({ error: "PDF generation failed", export_id: exportId }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    log("ERROR", { msg: e instanceof Error ? e.message : String(e) });
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
