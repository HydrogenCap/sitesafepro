import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { enforceRateLimit, getClientIp } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { firstName, lastName, email, phone, company, subject, message } = await req.json();
    const clientIp = getClientIp(req);

    const rateLimit = await enforceRateLimit({
      identifier: clientIp,
      scope: "contact-form",
      limit: 5,
      windowSeconds: 3600,
    });

    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        }
      );
    }

    // Basic validation
    if (!firstName || !lastName || !email || !subject || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Enforce length limits
    if (firstName.length > 100 || lastName.length > 100 || message.length > 5000) {
      return new Response(
        JSON.stringify({ error: "Input exceeds maximum length" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("[CONTACT-FORM] RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const subjectLabels: Record<string, string> = {
      demo: "Demo Request",
      sales: "Sales Enquiry",
      support: "Technical Support",
      billing: "Billing Question",
      partnership: "Partnership Opportunity",
      other: "General Enquiry",
    };

    const safeFirstName = escapeHtml(firstName.trim());
    const safeLastName = escapeHtml(lastName.trim());
    const safeEmail = escapeHtml(email.trim());
    const safePhone = phone ? escapeHtml(phone.trim()) : "";
    const safeCompany = company ? escapeHtml(company.trim()) : "";
    const safeSubject = escapeHtml(subjectLabels[subject] || subject);
    const safeMessage = escapeHtml(message);
    const subjectLine = `[Site Safe] ${subjectLabels[subject] || subject} from ${firstName} ${lastName}`;

    const emailHtml = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#0F766E;margin:0 0 20px;">New Contact Form Submission</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 12px;font-weight:600;color:#334155;border-bottom:1px solid #e2e8f0;width:120px;">Name</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${safeFirstName} ${safeLastName}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:600;color:#334155;border-bottom:1px solid #e2e8f0;">Email</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;"><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>
          ${phone ? `<tr><td style="padding:8px 12px;font-weight:600;color:#334155;border-bottom:1px solid #e2e8f0;">Phone</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${safePhone}</td></tr>` : ""}
          ${company ? `<tr><td style="padding:8px 12px;font-weight:600;color:#334155;border-bottom:1px solid #e2e8f0;">Company</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${safeCompany}</td></tr>` : ""}
          <tr><td style="padding:8px 12px;font-weight:600;color:#334155;border-bottom:1px solid #e2e8f0;">Subject</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${safeSubject}</td></tr>
        </table>
        <div style="margin-top:20px;padding:16px;background:#f8fafc;border-radius:8px;">
          <p style="margin:0 0 8px;font-weight:600;color:#334155;">Message:</p>
          <p style="margin:0;white-space:pre-wrap;">${safeMessage}</p>
        </div>
        <p style="margin-top:20px;color:#94a3b8;font-size:12px;">Reply directly to this email to respond to ${safeFirstName}.</p>
      </div>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Site Safe <noreply@sitesafe.cloud>",
        to: ["david@oxygen.rocks"],
        reply_to: email,
        subject: subjectLine,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[CONTACT-FORM] Resend error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to send message" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[CONTACT-FORM] Message sent from ${email} — subject: ${subject}`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[CONTACT-FORM] Error:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
