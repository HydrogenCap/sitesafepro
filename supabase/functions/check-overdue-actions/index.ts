import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface OverdueAction {
  id: string;
  title: string;
  due_date: string;
  priority: string;
  assigned_to: string;
  organisation_id: string;
  project_id: string;
  projects?: { name: string };
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

    console.log("Checking for overdue actions...");

    // Get today's date
    const today = new Date().toISOString().split("T")[0];

    // Find overdue actions that:
    // 1. Are not closed
    // 2. Have a due date before today
    // 3. Are assigned to a specific user (not just company)
    const { data: overdueActions, error: actionsError } = await supabase
      .from("corrective_actions")
      .select(`
        id,
        title,
        due_date,
        priority,
        assigned_to,
        organisation_id,
        project_id,
        projects:project_id(name)
      `)
      .not("status", "eq", "closed")
      .not("status", "eq", "awaiting_verification")
      .lt("due_date", today)
      .not("assigned_to", "is", null);

    if (actionsError) {
      console.error("Error fetching overdue actions:", actionsError);
      throw actionsError;
    }

    console.log(`Found ${overdueActions?.length || 0} overdue actions`);

    if (!overdueActions || overdueActions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No overdue actions", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: { actionId: string; success: boolean; error?: string }[] = [];

    // Send notification for each overdue action
    for (const action of overdueActions as OverdueAction[]) {
      // Calculate days overdue
      const dueDate = new Date(action.due_date);
      const todayDate = new Date(today);
      const daysOverdue = Math.floor(
        (todayDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      try {
        // Call the send-notification function
        const { error: notifyError } = await supabase.functions.invoke(
          "send-notification",
          {
            body: {
              organisationId: action.organisation_id,
              recipientProfileId: action.assigned_to,
              type: "action_overdue",
              data: {
                actionTitle: action.title,
                projectName: action.projects?.name || "Unknown Project",
                priority: action.priority,
                daysOverdue: daysOverdue.toString(),
                dueDate: action.due_date,
              },
              link: `/actions/${action.id}`,
              triggerReferenceId: action.id,
            },
          }
        );

        if (notifyError) {
          console.error(`Error notifying for action ${action.id}:`, notifyError);
          results.push({ actionId: action.id, success: false, error: notifyError.message });
        } else {
          console.log(`Notification sent for action ${action.id}`);
          results.push({ actionId: action.id, success: true });
        }
      } catch (err: any) {
        console.error(`Exception notifying for action ${action.id}:`, err);
        results.push({ actionId: action.id, success: false, error: err.message });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${successCount}/${results.length} overdue notifications`,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in check-overdue-actions:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
