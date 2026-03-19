import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Document-type-specific extraction prompts
const DOC_TYPE_PROMPTS: Record<string, string> = {
  // Insurance types
  public_liability: `Extract: insurer_name, policy_number, insured_party_name, coverage_amount, start_date, end_date. Verify coverage is current and >= £1,000,000.`,
  employers_liability: `Extract: insurer_name, policy_number, insured_party_name, coverage_amount, start_date, end_date. Verify coverage is current and >= £5,000,000 (UK legal minimum).`,
  professional_indemnity: `Extract: insurer_name, policy_number, insured_party_name, coverage_amount, start_date, end_date. Check coverage is current.`,
  car_insurance: `Extract: insurer_name, policy_number, insured_party_name, coverage_amount, start_date, end_date.`,
  plant_insurance: `Extract: insurer_name, policy_number, insured_party_name, coverage_amount, start_date, end_date.`,
  // CSCS / competency
  cscs_card: `Extract: card_holder_name, card_number, card_type_level (e.g. Green Labourer, Blue Skilled, Gold Supervisor), expiry_date. Check card is not expired.`,
  // Training / certifications
  gas_safe: `Extract: holder_name, registration_number, expiry_date, categories_covered.`,
  niceic: `Extract: holder_name, registration_number, expiry_date.`,
  sssts: `Extract: holder_name, certificate_number, date_achieved, expiry_date.`,
  smsts: `Extract: holder_name, certificate_number, date_achieved, expiry_date.`,
  first_aid: `Extract: holder_name, certificate_number, date_achieved, expiry_date.`,
  fire_marshal: `Extract: holder_name, certificate_number, date_achieved, expiry_date.`,
  ipaf: `Extract: holder_name, card_number, categories, expiry_date.`,
  pasma: `Extract: holder_name, card_number, expiry_date.`,
  cpcs: `Extract: holder_name, card_number, categories, expiry_date.`,
  asbestos_awareness: `Extract: holder_name, certificate_number, date_achieved, expiry_date.`,
  working_at_height: `Extract: holder_name, certificate_number, date_achieved, expiry_date.`,
  confined_spaces: `Extract: holder_name, certificate_number, date_achieved, expiry_date.`,
  manual_handling: `Extract: holder_name, certificate_number, date_achieved, expiry_date.`,
  abrasive_wheels: `Extract: holder_name, certificate_number, date_achieved, expiry_date.`,
  face_fit: `Extract: holder_name, certificate_number, date_achieved, expiry_date.`,
  // Accreditations
  chas: `Extract: company_name, membership_number, expiry_date, accreditation_level.`,
  safe_contractor: `Extract: company_name, membership_number, expiry_date.`,
  constructionline: `Extract: company_name, membership_number, expiry_date, level.`,
  smas: `Extract: company_name, membership_number, expiry_date.`,
  iso_45001: `Extract: company_name, certificate_number, expiry_date, certifying_body.`,
  iso_9001: `Extract: company_name, certificate_number, expiry_date, certifying_body.`,
  iso_14001: `Extract: company_name, certificate_number, expiry_date, certifying_body.`,
  // Other
  dbs_check: `Extract: holder_name, certificate_number, date_of_issue, disclosure_level.`,
  right_to_work: `Extract: holder_name, document_type, expiry_date (if applicable).`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { compliance_doc_id, organisation_id } = await req.json();

    if (!compliance_doc_id || !organisation_id) {
      return new Response(
        JSON.stringify({ error: "Missing compliance_doc_id or organisation_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Get the compliance doc
    const { data: doc, error: docError } = await supabase
      .from("contractor_compliance_docs")
      .select("*, contractor_companies(company_name)")
      .eq("id", compliance_doc_id)
      .single();

    if (docError || !doc) {
      return new Response(
        JSON.stringify({ error: "Document not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Update status to ai_checking
    await supabase
      .from("contractor_compliance_docs")
      .update({ status: "ai_checking" })
      .eq("id", compliance_doc_id);

    // Log AI check started
    await supabase.from("document_review_log").insert({
      organisation_id,
      compliance_doc_id,
      action: "ai_check_started",
      actor_type: "system",
      previous_status: "uploaded",
      new_status: "ai_checking",
    });

    // 3. Create AI check record
    const { data: aiCheck, error: aiCheckError } = await supabase
      .from("document_ai_checks")
      .insert({
        organisation_id,
        compliance_doc_id,
        ai_model: "google/gemini-2.5-flash",
        status: "processing",
      })
      .select("id")
      .single();

    if (aiCheckError) throw aiCheckError;

    const startTime = Date.now();

    // 4. Get signed URL for the file
    let fileContent = "";
    let isImage = false;
    if (doc.file_path) {
      const ext = doc.file_path.split(".").pop()?.toLowerCase();
      isImage = ["jpg", "jpeg", "png", "webp"].includes(ext || "");

      if (isImage) {
        // For images, get a signed URL and pass it to the AI
        const { data: signedData } = await supabase.storage
          .from("compliance-docs")
          .createSignedUrl(doc.file_path, 3600);
        if (signedData?.signedUrl) {
          fileContent = signedData.signedUrl;
        }
      } else {
        // For PDFs/docs, download and convert to base64
        const { data: fileData } = await supabase.storage
          .from("compliance-docs")
          .download(doc.file_path);
        if (fileData) {
          const arrayBuffer = await fileData.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = "";
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          fileContent = btoa(binary);
        }
      }
    }

    // 5. Build prompt
    const companyName = (doc.contractor_companies as any)?.company_name || "Unknown";
    const docTypeLabel = doc.doc_type;
    const specificPrompt = DOC_TYPE_PROMPTS[doc.doc_type] || "Extract all relevant fields from this document.";

    const systemPrompt = `You are an AI compliance document checker for UK construction sites. You analyze contractor documents and extract structured data.

Your job:
1. Extract the requested fields from the document
2. Validate the document is genuine and current
3. Check the insured/holder name matches the expected contractor: "${companyName}"
4. Flag any issues (expired, wrong type, low coverage, name mismatch)
5. Give a confidence score (0.0 to 1.0) for how confident you are
6. Give a result: "pass" (high confidence, all checks OK), "needs_review" (some uncertainty), or "fail" (clearly invalid/expired/wrong)
7. Provide a short human-readable summary (1-2 sentences)

Document type being checked: ${docTypeLabel}
Expected contractor company: ${companyName}
User-provided reference: ${doc.reference_number || "Not provided"}
User-provided expiry: ${doc.expiry_date || "Not provided"}
User-provided cover amount: ${doc.cover_amount || "Not provided"}

${specificPrompt}

Be strict but fair. If you cannot read the document or it's blank, result should be "fail".`;

    // 6. Call Lovable AI
    let aiResult: any = null;

    if (lovableApiKey && fileContent) {
      const messages: any[] = [
        { role: "system", content: systemPrompt },
      ];

      if (isImage) {
        messages.push({
          role: "user",
          content: [
            { type: "text", text: "Please analyze this compliance document image." },
            { type: "image_url", image_url: { url: fileContent } },
          ],
        });
      } else {
        const ext = doc.file_path?.split(".").pop()?.toLowerCase();
        const mimeType = ext === "pdf" ? "application/pdf" : "image/jpeg";
        messages.push({
          role: "user",
          content: [
            { type: "text", text: "Please analyze this compliance document." },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${fileContent}` },
            },
          ],
        });
      }

      const tools = [
        {
          type: "function",
          function: {
            name: "compliance_check_result",
            description: "Return structured compliance check results",
            parameters: {
              type: "object",
              properties: {
                result: {
                  type: "string",
                  enum: ["pass", "needs_review", "fail"],
                  description: "Overall check result",
                },
                confidence_score: {
                  type: "number",
                  description: "Confidence 0.0-1.0",
                },
                summary: {
                  type: "string",
                  description: "Short human-readable summary (1-2 sentences)",
                },
                extracted_fields: {
                  type: "object",
                  description: "Key-value pairs of extracted document fields",
                },
                validation_errors: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      field: { type: "string" },
                      message: { type: "string" },
                      severity: { type: "string", enum: ["error", "warning", "info"] },
                    },
                    required: ["field", "message", "severity"],
                  },
                  description: "List of validation issues found",
                },
              },
              required: ["result", "confidence_score", "summary", "extracted_fields", "validation_errors"],
              additionalProperties: false,
            },
          },
        },
      ];

      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages,
            tools,
            tool_choice: { type: "function", function: { name: "compliance_check_result" } },
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall?.function?.arguments) {
            aiResult = JSON.parse(toolCall.function.arguments);
          }
        } else {
          console.error("AI gateway error:", aiResponse.status, await aiResponse.text());
        }
      } catch (aiErr) {
        console.error("AI call error:", aiErr);
      }
    }

    const processingTime = Date.now() - startTime;

    // 7. If AI didn't work, default to needs_review
    if (!aiResult) {
      aiResult = {
        result: "needs_review",
        confidence_score: 0,
        summary: fileContent
          ? "AI analysis could not be completed. Manual review required."
          : "No file attached. Manual review required.",
        extracted_fields: {},
        validation_errors: [
          { field: "document", message: "AI analysis unavailable", severity: "warning" },
        ],
      };
    }

    // 8. Update AI check record
    await supabase
      .from("document_ai_checks")
      .update({
        status: "completed",
        result: aiResult.result,
        confidence_score: aiResult.confidence_score,
        summary: aiResult.summary,
        extracted_fields: aiResult.extracted_fields,
        validation_errors: aiResult.validation_errors,
        processing_time_ms: processingTime,
        completed_at: new Date().toISOString(),
        raw_response: aiResult,
      })
      .eq("id", aiCheck.id);

    // 9. Update compliance doc with AI result
    const newStatus = aiResult.result === "fail" ? "needs_review" : "needs_review";
    // Always go to needs_review — manual confirmation required
    await supabase
      .from("contractor_compliance_docs")
      .update({
        status: newStatus,
        ai_check_id: aiCheck.id,
      })
      .eq("id", compliance_doc_id);

    // Log AI check completed
    await supabase.from("document_review_log").insert({
      organisation_id,
      compliance_doc_id,
      action: "ai_check_completed",
      actor_type: "ai",
      previous_status: "ai_checking",
      new_status: newStatus,
      notes: aiResult.summary,
      metadata: {
        ai_result: aiResult.result,
        confidence: aiResult.confidence_score,
        processing_time_ms: processingTime,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        ai_check_id: aiCheck.id,
        result: aiResult.result,
        summary: aiResult.summary,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("check-compliance-doc error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

