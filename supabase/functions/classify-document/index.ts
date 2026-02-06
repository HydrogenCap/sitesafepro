import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { filename, textContent, mimeType, deepAnalysis } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.log("No LOVABLE_API_KEY configured, falling back to filename-based classification");
      return new Response(JSON.stringify({
        category: guessFromFilename(filename),
        suggestedTitle: filename.replace(/\.[^/.]+$/, ""),
        suggestedDescription: null,
        confidence: "low",
        aiPowered: false,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Build the system prompt for AI classification
    const systemPrompt = `You are a UK construction health & safety document classifier for the SiteSafe Pro platform. 
    
Your job is to analyse the content of uploaded documents and classify them into exactly ONE of these categories:

- "rams" — Risk Assessments and Method Statements (combined RAMS documents)
- "method_statement" — Standalone Method Statements (step-by-step work procedures)
- "safety_plan" — Construction Phase Plans, Health & Safety Plans, Site Safety Rules
- "coshh" — COSHH Assessments (Control of Substances Hazardous to Health)
- "induction" — Site Induction materials, induction checklists, induction records
- "permit" — Permits to Work (hot works, confined spaces, electrical, excavation, etc.)
- "inspection" — Inspection reports/records (scaffold, site, plant, equipment inspections)
- "certificate" — Certificates, training records, qualifications (CSCS, IPAF, PASMA, etc.)
- "insurance" — Insurance documents (Employers Liability, Public Liability, Professional Indemnity)
- "risk_assessment" — Standalone Risk Assessments (not combined with method statements)
- "fire_safety" — Fire Risk Assessments, Fire Safety Plans, Emergency Evacuation Plans
- "meeting_minutes" — Meeting minutes, progress meeting notes, H&S committee minutes
- "drawing" — Site drawings, plans, layouts, CAD outputs
- "other" — Anything that doesn't fit the above categories

Also suggest:
1. A clean, professional document title (max 60 chars)
2. A brief description (max 150 chars) summarising what the document covers
3. Your confidence level: "high", "medium", or "low"
4. Any compliance flags — things that look missing or concerning (max 3 bullet points, or null if none)

Respond ONLY with valid JSON, no markdown fencing. Example:
{"category":"rams","suggestedTitle":"RAMS — Electrical First Fix Installation","suggestedDescription":"Risk assessment and method statement for electrical first fix wiring at ground floor level","confidence":"high","complianceFlags":["No review date specified","Missing emergency contact details"]}`;

    // Build user message
    let userMessage = `Classify this document.

Filename: ${filename}
File type: ${mimeType}

Document content (first 4000 characters):
${(textContent || "").substring(0, 4000)}`;

    // If deep analysis requested (Enterprise feature), add more detailed prompt
    if (deepAnalysis) {
      userMessage += `

ADDITIONAL TASK: Perform a detailed RAMS compliance analysis. Check for:
1. Clear scope of works
2. Specific hazards identified (not just generic)
3. Risk rating methodology (likelihood × severity)
4. Control measures for each hazard
5. PPE requirements specified
6. Emergency procedures referenced
7. Review date specified
8. Responsible persons named

Return an additional "complianceScore" (0-100) and "complianceChecklist" array with items having "item", "status" (pass/warning/fail), and optional "note".`;
    }

    console.log(`Classifying document: ${filename}, mimeType: ${mimeType}, textContent length: ${(textContent || "").length}`);

    // Call Lovable AI Gateway
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        max_tokens: deepAnalysis ? 1000 : 500,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      return new Response(JSON.stringify({
        category: guessFromFilename(filename),
        suggestedTitle: filename.replace(/\.[^/.]+$/, ""),
        suggestedDescription: null,
        confidence: "low",
        aiPowered: false,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const aiText = data.choices?.[0]?.message?.content || "{}";
    
    console.log("AI response:", aiText.substring(0, 500));

    // Parse the AI response - handle potential markdown code blocks
    let parsed;
    try {
      // Remove markdown code fences if present
      let cleanText = aiText.trim();
      if (cleanText.startsWith("```json")) {
        cleanText = cleanText.slice(7);
      } else if (cleanText.startsWith("```")) {
        cleanText = cleanText.slice(3);
      }
      if (cleanText.endsWith("```")) {
        cleanText = cleanText.slice(0, -3);
      }
      parsed = JSON.parse(cleanText.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      parsed = {
        category: guessFromFilename(filename),
        suggestedTitle: filename.replace(/\.[^/.]+$/, ""),
        suggestedDescription: null,
        confidence: "low",
      };
    }

    // Validate category is one of our valid values
    const validCategories = ["rams", "method_statement", "safety_plan", "coshh", "induction", "permit", "inspection", "certificate", "insurance", "risk_assessment", "fire_safety", "meeting_minutes", "drawing", "other"];
    if (!validCategories.includes(parsed.category)) {
      parsed.category = "other";
    }

    // Validate confidence
    if (!["high", "medium", "low"].includes(parsed.confidence)) {
      parsed.confidence = "medium";
    }

    return new Response(JSON.stringify({
      ...parsed,
      aiPowered: true,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("classify-document error:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      category: "other",
      suggestedTitle: null,
      suggestedDescription: null,
      confidence: "low",
      aiPowered: false,
    }), {
      status: 200, // Return 200 so client doesn't fail
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function guessFromFilename(filename: string): string {
  const lower = filename.toLowerCase();
  if ((lower.includes("rams") || lower.includes("risk assessment")) && lower.includes("method")) return "rams";
  if (lower.includes("method statement") || lower.includes("method_statement")) return "method_statement";
  if (lower.includes("coshh")) return "coshh";
  if (lower.includes("induction")) return "induction";
  if (lower.includes("permit")) return "permit";
  if (lower.includes("inspection") || lower.includes("scaffold")) return "inspection";
  if (lower.includes("certificate") || lower.includes("cscs") || lower.includes("training")) return "certificate";
  if (lower.includes("insurance") || lower.includes("liability")) return "insurance";
  if (lower.includes("fire") || lower.includes("evacuation")) return "fire_safety";
  if (lower.includes("safety plan") || lower.includes("cpp") || lower.includes("construction phase")) return "safety_plan";
  if (lower.includes("risk assessment")) return "risk_assessment";
  if (lower.includes("minutes") || lower.includes("meeting")) return "meeting_minutes";
  if (lower.includes("drawing") || lower.includes("layout")) return "drawing";
  return "other";
}
