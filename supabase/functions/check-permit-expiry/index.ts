import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ExpiringPermit {
  id: string;
  title: string;
  permit_number: string;
  valid_until: string;
  requested_by: string;
  organisation_id: string;
  project_id: string | null;
  projects?: { name: string } | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Checking for expiring permits...");

    // Get permits expiring in the next 24 hours
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find permits that:
    // 1. Are active (status = 'active')
    // 2. Have valid_until within the next 24 hours
    // 3. Have a requested_by user
    const { data: expiringPermits, error: permitsError } = await supabase
      .from("permits_to_work")
      .select(`
        id,
        title,
        permit_number,
        valid_until,
        requested_by,
        organisation_id,
        project_id,
        projects:project_id(name)
      `)
      .eq("status", "active")
      .not("valid_until", "is", null)
      .not("requested_by", "is", null)
      .gte("valid_until", now.toISOString())
      .lte("valid_until", tomorrow.toISOString());

    if (permitsError) {
      console.error("Error fetching expiring permits:", permitsError);
      throw permitsError;
    }

    console.log(`Found ${expiringPermits?.length || 0} expiring permits`);

    if (!expiringPermits || expiringPermits.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No expiring permits", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: { permitId: string; success: boolean; error?: string }[] = [];

    // Send notification for each expiring permit
    for (const permit of expiringPermits as ExpiringPermit[]) {
      // Calculate hours until expiry
      const validUntil = new Date(permit.valid_until);
      const hoursUntilExpiry = Math.floor(
        (validUntil.getTime() - now.getTime()) / (1000 * 60 * 60)
      );

      const expiresIn =
        hoursUntilExpiry <= 1
          ? "less than 1 hour"
          : hoursUntilExpiry <= 6
          ? `${hoursUntilExpiry} hours`
          : "today";

      try {
        // Call the send-notification function
        const { error: notifyError } = await supabase.functions.invoke(
          "send-notification",
          {
            body: {
              organisationId: permit.organisation_id,
              recipientProfileId: permit.requested_by,
              type: "permit_expiring",
              data: {
                permitTitle: `${permit.permit_number} - ${permit.title}`,
                projectName: permit.projects?.name || "General",
                expiresIn,
              },
              link: `/permits`,
              triggerReferenceId: permit.id,
            },
          }
        );

        if (notifyError) {
          console.error(`Error notifying for permit ${permit.id}:`, notifyError);
          results.push({ permitId: permit.id, success: false, error: notifyError.message });
        } else {
          console.log(`Notification sent for permit ${permit.id}`);
          results.push({ permitId: permit.id, success: true });
        }
      } catch (err: any) {
        console.error(`Exception notifying for permit ${permit.id}:`, err);
        results.push({ permitId: permit.id, success: false, error: err.message });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${successCount}/${results.length} permit expiry notifications`,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in check-permit-expiry:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
