import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const INTERVALS = [
  { days: 30, column: "reminder_sent_30_days" },
  { days: 14, column: "reminder_sent_14_days" },
  { days: 7, column: "reminder_sent_7_days" },
  { days: 1, column: "reminder_sent_1_day" },
  { days: 0, column: "reminder_sent_expired" },
] as const;

interface ComplianceDoc {
  id: string;
  doc_type: string;
  expiry_date: string;
  organisation_id: string;
  contractor_company_id: string | null;
  profile_id: string | null;
  uploaded_by: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("[CHECK-CONTRACTOR-DOC-EXPIRY] RESEND_API_KEY not set");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const today = new Date();
    let totalNotified = 0;
    const errors: string[] = [];

    for (const interval of INTERVALS) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + interval.days);
      const dateStr = targetDate.toISOString().split("T")[0];

      // Find contractor compliance docs expiring on this target date, not yet reminded
      const { data: docs, error: fetchErr } = await supabase
        .from("contractor_compliance_docs")
        .select("id, doc_type, expiry_date, organisation_id, contractor_company_id, profile_id, uploaded_by")
        .eq("expiry_date", dateStr)
        .eq("is_current", true)
        .eq(interval.column, false)
        .not("expiry_date", "is", null);

      if (fetchErr) {
        console.error(`[CHECK-CONTRACTOR-DOC-EXPIRY] Fetch error (${interval.days}d):`, fetchErr);
        errors.push(`Fetch ${interval.days}d: ${fetchErr.message}`);
        continue;
      }

      if (!docs || docs.length === 0) continue;

      console.log(`[CHECK-CONTRACTOR-DOC-EXPIRY] Found ${docs.length} docs expiring in ${interval.days} days`);

      for (const doc of docs as ComplianceDoc[]) {
        try {
          await processDoc(supabase, RESEND_API_KEY, doc, interval.days);

          // Mark as reminded
          await supabase
            .from("contractor_compliance_docs")
            .update({ [interval.column]: true })
            .eq("id", doc.id);

          totalNotified++;
        } catch (err) {
          console.error(`[CHECK-CONTRACTOR-DOC-EXPIRY] Error processing doc ${doc.id}:`, err);
          errors.push(`Doc ${doc.id}: ${err.message}`);
        }
      }
    }

    console.log(`[CHECK-CONTRACTOR-DOC-EXPIRY] Complete: ${totalNotified} notified, ${errors.length} errors`);

    return new Response(
      JSON.stringify({ success: true, notified: totalNotified, errors: errors.length > 0 ? errors : undefined }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[CHECK-CONTRACTOR-DOC-EXPIRY] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function processDoc(
  supabase: any,
  resendKey: string,
  doc: ComplianceDoc,
  daysUntilExpiry: number
) {
  // Get contractor company name
  let companyName = "Unknown Company";
  if (doc.contractor_company_id) {
    const { data: company } = await supabase
      .from("contractor_companies")
      .select("company_name, primary_contact_email")
      .eq("id", doc.contractor_company_id)
      .single();
    if (company) companyName = company.company_name;
  }

  // Get organisation details
  const { data: org } = await supabase
    .from("organisations")
    .select("name")
    .eq("id", doc.organisation_id)
    .single();

  const orgName = org?.name || "Organisation";

  // Collect all recipient emails: uploader, org admins, contractor contact
  const recipientEmails = new Set<string>();

  // Get uploader email
  const { data: uploaderProfile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", doc.uploaded_by)
    .single();
  if (uploaderProfile?.email) recipientEmails.add(uploaderProfile.email);

  // Get contractor profile if linked
  if (doc.profile_id) {
    const { data: contractorProfile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", doc.profile_id)
      .single();
    if (contractorProfile?.email) recipientEmails.add(contractorProfile.email);
  }

  // Get contractor company contact email
  if (doc.contractor_company_id) {
    const { data: company } = await supabase
      .from("contractor_companies")
      .select("primary_contact_email")
      .eq("id", doc.contractor_company_id)
      .single();
    if (company?.primary_contact_email) recipientEmails.add(company.primary_contact_email);
  }

  // Get org admins
  const { data: admins } = await supabase
    .from("organisation_members")
    .select("profile_id")
    .eq("organisation_id", doc.organisation_id)
    .in("role", ["owner", "admin"])
    .eq("status", "active");

  if (admins && admins.length > 0) {
    const adminIds = admins.map((a: any) => a.profile_id);
    const { data: adminProfiles } = await supabase
      .from("profiles")
      .select("email")
      .in("id", adminIds);
    adminProfiles?.forEach((p: any) => {
      if (p.email) recipientEmails.add(p.email);
    });
  }

  if (recipientEmails.size === 0) {
    console.log(`[CHECK-CONTRACTOR-DOC-EXPIRY] No recipients for doc ${doc.id}`);
    return;
  }

  // Build email
  const docTypeLabel = formatDocType(doc.doc_type);
  const urgency = daysUntilExpiry === 0 ? "EXPIRED" : daysUntilExpiry <= 7 ? "URGENT" : "REMINDER";
  const daysText = daysUntilExpiry === 0
    ? "has expired today"
    : `expires in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? "s" : ""}`;

  const subject = `[${urgency}] ${docTypeLabel} for ${companyName} ${daysText} — ${orgName}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: ${daysUntilExpiry === 0 ? '#dc2626' : daysUntilExpiry <= 7 ? '#ea580c' : '#2563eb'}; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0; font-size: 18px;">${urgency}: Document ${daysUntilExpiry === 0 ? 'Expired' : 'Expiring Soon'}</h2>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: 0; padding: 24px; border-radius: 0 0 8px 8px;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; width: 140px;">Document Type</td>
            <td style="padding: 8px 0; font-weight: 600;">${docTypeLabel}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Contractor</td>
            <td style="padding: 8px 0; font-weight: 600;">${companyName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Organisation</td>
            <td style="padding: 8px 0;">${orgName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Expiry Date</td>
            <td style="padding: 8px 0; font-weight: 600; color: ${daysUntilExpiry === 0 ? '#dc2626' : daysUntilExpiry <= 7 ? '#ea580c' : '#2563eb'};">${doc.expiry_date}</td>
          </tr>
        </table>
        <p style="color: #374151; line-height: 1.6;">
          ${daysUntilExpiry === 0
            ? 'This document has expired and the contractor may no longer be compliant. Immediate action is required.'
            : `This document ${daysText}. Please ensure the contractor uploads a renewed version before the expiry date.`}
        </p>
        <p style="color: #6b7280; font-size: 13px; margin-top: 20px;">
          This is an automated notification from SiteSafePro. Please do not reply to this email.
        </p>
      </div>
    </div>
  `;

  // Send via Resend
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: "SiteSafePro <notifications@updates.sitesafepro.co.uk>",
      to: Array.from(recipientEmails),
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Resend error ${res.status}: ${errBody}`);
  }

  console.log(`[CHECK-CONTRACTOR-DOC-EXPIRY] Email sent for doc ${doc.id} to ${recipientEmails.size} recipients`);
}

function formatDocType(docType: string): string {
  const labels: Record<string, string> = {
    employers_liability: "Employers' Liability Insurance",
    public_liability: "Public Liability Insurance",
    professional_indemnity: "Professional Indemnity Insurance",
    contractors_all_risk: "Contractors' All Risk Insurance",
    tax_compliance: "Tax Compliance Certificate",
    company_registration: "Company Registration",
    safe_pass: "Safe Pass / CSCS",
    method_statement: "Method Statement",
    risk_assessment: "Risk Assessment",
    rams: "RAMS",
    waste_carrier: "Waste Carrier Licence",
    environmental_policy: "Environmental Policy",
    quality_policy: "Quality Policy",
    manual_handling: "Manual Handling Certificate",
    working_at_height: "Working at Height Certificate",
    asbestos_awareness: "Asbestos Awareness",
    first_aid: "First Aid Certificate",
    fire_safety: "Fire Safety Certificate",
    confined_spaces: "Confined Spaces Certificate",
  };
  return labels[docType] || docType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
