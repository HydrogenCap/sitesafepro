import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const today = new Date();
    const intervals = [
      { days: 30, column: "expiry_reminder_sent_30" },
      { days: 14, column: "expiry_reminder_sent_14" },
      { days: 7, column: "expiry_reminder_sent_7" },
      { days: 1, column: "expiry_reminder_sent_1" },
      { days: 0, column: "expiry_reminder_sent_0" },
    ];

    let totalNotified = 0;

    for (const interval of intervals) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + interval.days);
      const dateStr = targetDate.toISOString().split("T")[0];

      // Find documents expiring on this date that haven't been reminded yet
      const { data: docs, error } = await supabase
        .from("documents")
        .select("id, name, organisation_id, uploaded_by, project_id, expiry_date")
        .eq("expiry_date", dateStr)
        .eq(interval.column, false);

      if (error) {
        console.error(`Error fetching docs for ${interval.days}d interval:`, error);
        continue;
      }

      if (!docs || docs.length === 0) continue;

      for (const doc of docs) {
        // Get org admins
        const { data: admins } = await supabase
          .from("organisation_members")
          .select("profile_id")
          .eq("organisation_id", doc.organisation_id)
          .in("role", ["owner", "admin"])
          .eq("status", "active");

        const recipientIds = new Set<string>();
        if (doc.uploaded_by) recipientIds.add(doc.uploaded_by);
        admins?.forEach((a) => recipientIds.add(a.profile_id));

        if (recipientIds.size > 0) {
          const daysText =
            interval.days === 0
              ? "today"
              : `in ${interval.days} day${interval.days > 1 ? "s" : ""}`;

          // Send notification via existing send-notification function
          try {
            await supabase.functions.invoke("send-notification", {
              body: {
                recipientIds: Array.from(recipientIds),
                subject: `Document Expiring ${interval.days === 0 ? "Today" : "Soon"}: ${doc.name}`,
                message: `The document "${doc.name}" is expiring ${daysText} (${doc.expiry_date}). Please review and renew if necessary.`,
                type: "document_expiry",
                entityId: doc.id,
                entityType: "document",
                organisationId: doc.organisation_id,
              },
            });
          } catch (notifError) {
            console.error(`Failed to send notification for doc ${doc.id}:`, notifError);
          }
        }

        // Mark as reminded
        await supabase
          .from("documents")
          .update({ [interval.column]: true } as any)
          .eq("id", doc.id);

        totalNotified++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, notified: totalNotified }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("check-document-expiry error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
