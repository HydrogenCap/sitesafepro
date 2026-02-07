import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ContractorReminder {
  contractor_id: string;
  company_name: string;
  contact_email: string;
  contact_name: string;
  expiring_docs: string[];
  expired_docs: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's organisation
    const { data: member } = await supabase
      .from("organisation_members")
      .select("organisation_id")
      .eq("profile_id", user.id)
      .eq("status", "active")
      .single();

    if (!member) {
      return new Response(
        JSON.stringify({ error: "No organisation found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { reminder_type, contractor_ids } = await req.json();
    
    // Build query for contractors needing reminders
    let query = supabase
      .from("contractor_companies")
      .select(`
        id,
        company_name,
        primary_contact_name,
        primary_contact_email,
        compliance_status
      `)
      .eq("organisation_id", member.organisation_id)
      .eq("is_active", true)
      .not("primary_contact_email", "is", null);

    // Filter based on reminder type
    if (reminder_type === "expiring") {
      query = query.eq("compliance_status", "expiring_soon");
    } else if (reminder_type === "expired") {
      query = query.in("compliance_status", ["expired", "incomplete"]);
    } else if (reminder_type === "selected" && contractor_ids?.length > 0) {
      query = query.in("id", contractor_ids);
    } else if (reminder_type === "all") {
      query = query.in("compliance_status", ["expiring_soon", "expired", "incomplete"]);
    }

    const { data: contractors, error: contractorsError } = await query;
    if (contractorsError) throw contractorsError;

    if (!contractors || contractors.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No contractors need reminders" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get compliance docs for these contractors
    const contractorIds = contractors.map(c => c.id);
    const { data: complianceDocs } = await supabase
      .from("contractor_compliance_docs")
      .select("contractor_company_id, doc_type, expiry_date")
      .in("contractor_company_id", contractorIds);

    // Calculate expiring/expired docs per contractor
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    const reminders: ContractorReminder[] = contractors
      .filter(c => c.primary_contact_email)
      .map(c => {
        const docs = complianceDocs?.filter(d => d.contractor_company_id === c.id) || [];
        const expiring: string[] = [];
        const expired: string[] = [];

        docs.forEach(d => {
          if (d.expiry_date) {
            const expiryDate = new Date(d.expiry_date);
            if (expiryDate < today) {
              expired.push(d.doc_type.replace(/_/g, " "));
            } else if (expiryDate <= thirtyDaysFromNow) {
              expiring.push(d.doc_type.replace(/_/g, " "));
            }
          }
        });

        return {
          contractor_id: c.id,
          company_name: c.company_name,
          contact_email: c.primary_contact_email!,
          contact_name: c.primary_contact_name || "Site Manager",
          expiring_docs: expiring,
          expired_docs: expired,
        };
      })
      .filter(r => r.expiring_docs.length > 0 || r.expired_docs.length > 0);

    // Get organisation details
    const { data: org } = await supabase
      .from("organisations")
      .select("name")
      .eq("id", member.organisation_id)
      .single();

    const orgName = org?.name || "SiteSafe Pro";

    // Send emails
    const results = [];
    for (const reminder of reminders) {
      if (!resendApiKey) {
        console.log(`[DRY RUN] Would send reminder to ${reminder.contact_email}`);
        results.push({ email: reminder.contact_email, status: "skipped", reason: "No Resend API key" });
        continue;
      }

      const expiringList = reminder.expiring_docs.length > 0
        ? `<p><strong>Expiring Soon:</strong></p><ul>${reminder.expiring_docs.map(d => `<li>${d}</li>`).join("")}</ul>`
        : "";
      
      const expiredList = reminder.expired_docs.length > 0
        ? `<p><strong style="color: #dc2626;">Expired:</strong></p><ul style="color: #dc2626;">${reminder.expired_docs.map(d => `<li>${d}</li>`).join("")}</ul>`
        : "";

      try {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: `${orgName} <noreply@sitesafepro.co.uk>`,
            to: [reminder.contact_email],
            subject: `Compliance Reminder - Documents Need Attention`,
            html: `
              <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 24px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">${orgName}</h1>
                </div>
                <div style="padding: 32px; background: #fff;">
                  <p>Dear ${reminder.contact_name},</p>
                  <p>This is a reminder that some of your compliance documents for <strong>${reminder.company_name}</strong> require attention:</p>
                  ${expiredList}
                  ${expiringList}
                  <p>Please update your documentation as soon as possible to maintain your approved contractor status.</p>
                  <p>If you've already submitted updated documents, please disregard this message.</p>
                </div>
                <div style="padding: 16px; background: #f3f4f6; text-align: center; color: #6b7280; font-size: 12px;">
                  <p>This is an automated reminder from ${orgName}</p>
                </div>
              </div>
            `,
          }),
        });

        if (emailResponse.ok) {
          results.push({ email: reminder.contact_email, status: "sent" });
          console.log(`Reminder sent to ${reminder.contact_email}`);
        } else {
          const errorData = await emailResponse.json();
          results.push({ email: reminder.contact_email, status: "failed", error: errorData });
          console.error(`Failed to send to ${reminder.contact_email}:`, errorData);
        }
      } catch (emailError) {
        results.push({ email: reminder.contact_email, status: "error", error: String(emailError) });
        console.error(`Error sending to ${reminder.contact_email}:`, emailError);
      }
    }

    const sentCount = results.filter(r => r.status === "sent").length;
    
    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        total: reminders.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Bulk reminder error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
