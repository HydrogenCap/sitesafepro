import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { inspectionId } = await req.json();
    if (!inspectionId) {
      return new Response(JSON.stringify({ error: "inspectionId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch inspection
    const { data: inspection, error: inspError } = await supabase
      .from("inspections")
      .select(`
        *,
        project:projects(name, address),
        inspector:profiles!inspections_inspector_id_fkey(full_name, email)
      `)
      .eq("id", inspectionId)
      .single();

    if (inspError || !inspection) {
      return new Response(JSON.stringify({ error: "Inspection not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check user belongs to the same org
    const { data: membership } = await supabase
      .from("organisation_members")
      .select("id")
      .eq("profile_id", user.id)
      .eq("organisation_id", inspection.organisation_id)
      .eq("status", "active")
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch checklist items
    const { data: items } = await supabase
      .from("inspection_items")
      .select("*")
      .eq("inspection_id", inspectionId)
      .order("item_number", { ascending: true });

    // Fetch org info
    const { data: org } = await supabase
      .from("organisations")
      .select("name, logo_url")
      .eq("id", inspection.organisation_id)
      .single();

    // Generate PDF using the AI gateway to create HTML then convert
    // For now, generate a simple HTML-based PDF approach
    const inspectionTypes: Record<string, string> = {
      scaffold: "Scaffold Inspection",
      excavation: "Excavation Inspection",
      lifting_equipment: "Lifting Equipment",
      electrical: "Electrical Inspection",
      fire_safety: "Fire Safety",
      housekeeping: "Housekeeping",
      ppe_compliance: "PPE Compliance",
      general_site: "General Site",
    };

    const resultLabels: Record<string, string> = {
      pass: "✅ PASS",
      fail: "❌ FAIL",
      requires_action: "⚠️ REQUIRES ACTION",
      not_applicable: "— N/A",
    };

    const checklistHtml = (items || []).map((item: any) => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd;text-align:center;">${item.item_number}</td>
        <td style="padding:8px;border:1px solid #ddd;">${item.question}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center;font-weight:bold;${
          item.result === 'pass' ? 'color:#16a34a;' : item.result === 'fail' ? 'color:#dc2626;' : item.result === 'requires_action' ? 'color:#ca8a04;' : ''
        }">${item.result ? resultLabels[item.result] || item.result : '—'}</td>
        <td style="padding:8px;border:1px solid #ddd;">${item.notes || ''}</td>
      </tr>
    `).join('');

    const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><style>
      body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
      .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 30px; border-bottom: 3px solid #0F766E; padding-bottom: 20px; }
      .title { font-size: 24px; font-weight: bold; color: #0F766E; }
      .subtitle { color: #666; margin-top: 4px; }
      .result-badge { display: inline-block; padding: 6px 16px; border-radius: 6px; font-weight: bold; font-size: 14px; }
      .pass { background: #dcfce7; color: #16a34a; }
      .fail { background: #fef2f2; color: #dc2626; }
      .requires_action { background: #fef9c3; color: #ca8a04; }
      .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 30px; }
      .detail-item label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.05em; }
      .detail-item p { font-size: 14px; font-weight: 500; margin: 4px 0 0 0; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      th { background: #f1f5f9; padding: 10px 8px; border: 1px solid #ddd; text-align: left; font-size: 12px; text-transform: uppercase; }
      .section-title { font-size: 18px; font-weight: bold; margin-top: 30px; margin-bottom: 10px; color: #0F766E; }
      .notes-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin-top: 10px; }
      .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999; text-align: center; }
    </style></head>
    <body>
      <div class="header">
        <div>
          <div class="title">${inspection.title}</div>
          <div class="subtitle">${inspection.inspection_number} • ${inspectionTypes[inspection.inspection_type] || inspection.inspection_type}</div>
          ${org?.name ? `<div class="subtitle">${org.name}</div>` : ''}
        </div>
        ${inspection.overall_result ? `<span class="result-badge ${inspection.overall_result}">${resultLabels[inspection.overall_result] || inspection.overall_result}</span>` : ''}
      </div>

      <div class="details-grid">
        ${inspection.project ? `<div class="detail-item"><label>Project</label><p>${inspection.project.name}</p></div>` : ''}
        ${inspection.location ? `<div class="detail-item"><label>Location</label><p>${inspection.location}</p></div>` : ''}
        <div class="detail-item"><label>Inspection Date</label><p>${inspection.inspection_date}</p></div>
        ${inspection.next_inspection_date ? `<div class="detail-item"><label>Next Inspection Due</label><p>${inspection.next_inspection_date}</p></div>` : ''}
        ${inspection.inspector ? `<div class="detail-item"><label>Inspector</label><p>${inspection.inspector.full_name}</p></div>` : ''}
        ${inspection.completed_at ? `<div class="detail-item"><label>Completed</label><p>${new Date(inspection.completed_at).toLocaleDateString('en-GB')}</p></div>` : ''}
      </div>

      ${inspection.description ? `
        <div class="section-title">Description</div>
        <div class="notes-box">${inspection.description}</div>
      ` : ''}

      ${(items || []).length > 0 ? `
        <div class="section-title">Inspection Checklist</div>
        <table>
          <thead><tr>
            <th style="width:50px;">#</th>
            <th>Item</th>
            <th style="width:120px;">Result</th>
            <th style="width:200px;">Notes</th>
          </tr></thead>
          <tbody>${checklistHtml}</tbody>
        </table>
      ` : ''}

      ${inspection.notes ? `
        <div class="section-title">Additional Notes</div>
        <div class="notes-box">${inspection.notes}</div>
      ` : ''}

      ${inspection.corrective_actions ? `
        <div class="section-title">Corrective Actions</div>
        <div class="notes-box">${inspection.corrective_actions}</div>
      ` : ''}

      <div class="footer">
        Generated on ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')} by <a href="https://sitesafe.cloud" style="color:#0F766E;text-decoration:none;">sitesafe.cloud</a>${org?.name ? ` • ${org.name}` : ''}
      </div>
    </body>
    </html>`;

    // Return HTML for client-side print/PDF generation
    return new Response(
      JSON.stringify({ html, filename: `${inspection.inspection_number}.pdf` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate PDF" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
