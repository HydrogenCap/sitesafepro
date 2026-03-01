/**
 * coshh-ai-lookup
 *
 * Takes a substance/product name and returns AI-generated COSHH data
 * pre-filled for the UK construction context.
 *
 * Body: { substance_name: string }
 * Returns: Partial<COSHHFormData>
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const SYSTEM_PROMPT = `You are a UK construction health and safety expert specialising in COSHH (Control of Substances Hazardous to Health) assessments under COSHH Regulations 2002.

Given a substance or product name used on UK construction sites, return a JSON object with pre-filled COSHH assessment data. Be accurate, practical, and UK-specific. Base hazard data on common GHS classifications and HSE guidance.

Return ONLY valid JSON matching this exact schema (no markdown, no explanation):
{
  "product_name": string,
  "substance_type": one of: "paint"|"adhesive"|"solvent"|"cement"|"dust"|"oil"|"cleaning_chemical"|"sealant"|"resin"|"insulation"|"wood_treatment"|"fuel"|"gas"|"other",
  "hazard_pictograms": array of zero or more: "flammable"|"oxidiser"|"explosive"|"toxic"|"harmful"|"corrosive"|"gas_under_pressure"|"health_hazard"|"environmental",
  "hazard_statements": array of GHS H-statement strings e.g. ["H315 Causes skin irritation"],
  "precautionary_statements": array of GHS P-statement strings e.g. ["P280 Wear protective gloves"],
  "route_of_exposure": array of: "inhalation"|"skin_contact"|"eye_contact"|"ingestion",
  "health_effects": string (2-3 sentences on health risks),
  "control_measures": array of 3-6 practical control measure strings,
  "ppe_required": array of zero or more: "nitrile_gloves"|"latex_gloves"|"safety_goggles"|"face_shield"|"ffp2_mask"|"ffp3_mask"|"rpe"|"overalls"|"chemical_apron"|"safety_boots",
  "workplace_exposure_limit": string or null (e.g. "8hr TWA: 0.5 mg/m³ (HSE EH40 WEL)" or null if not applicable),
  "health_surveillance_required": boolean,
  "health_surveillance_details": string or null,
  "first_aid_measures": string (skin/eyes/inhalation/ingestion sections),
  "spill_procedure": string,
  "fire_fighting_measures": string or null (null if not flammable),
  "storage_requirements": string,
  "confidence": "high"|"medium"|"low"
}

If the substance is very common on UK construction sites (e.g. cement, silica dust, paint, expanding foam), use high confidence. For less common or brand-specific products, use medium or low.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method Not Allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  // Verify user
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);

  const body = await req.json();
  const substanceName = (body.substance_name as string)?.trim();
  if (!substanceName) return json({ error: "substance_name is required" }, 400);
  if (substanceName.length > 200) return json({ error: "substance_name too long" }, 400);

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return json({ error: "AI service not configured — LOVABLE_API_KEY missing" }, 503);
  }

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Generate a COSHH assessment for: ${substanceName}` },
        ],
        max_tokens: 1500,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[coshh-ai-lookup] AI gateway error:", response.status, err);
      return json({ error: "AI service error — try again" }, 502);
    }

    const data = await response.json();
    let raw = data.choices?.[0]?.message?.content || "{}";

    // Strip markdown fences if present
    raw = raw.trim();
    if (raw.startsWith("```json")) raw = raw.slice(7);
    else if (raw.startsWith("```")) raw = raw.slice(3);
    if (raw.endsWith("```")) raw = raw.slice(0, -3);

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error("[coshh-ai-lookup] JSON parse failed:", raw.substring(0, 300));
      return json({ error: "AI returned invalid data — try again" }, 502);
    }

    // Clean: remove keys not in COSHHFormData, ensure arrays are arrays
    const arrayFields = ["hazard_pictograms","hazard_statements","precautionary_statements","route_of_exposure","control_measures","ppe_required"];
    for (const field of arrayFields) {
      if (!Array.isArray(parsed[field])) parsed[field] = [];
    }

    return json({ ok: true, data: parsed, substance_name: substanceName });
  } catch (err: any) {
    console.error("[coshh-ai-lookup] unexpected error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
