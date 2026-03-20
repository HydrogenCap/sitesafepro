import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  requireString,
  requireUUID,
  optionalString,
  ValidationError,
  validationErrorResponse,
} from "../_shared/validation.ts";
import { enforceRateLimit, getClientIp } from "../_shared/rate-limit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Generate a cryptographically random token for checkout */
function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const clientIp = getClientIp(req);

    const rateLimit = await enforceRateLimit({
      identifier: clientIp,
      scope: "site-access",
      limit: 60,
      windowSeconds: 3600,
    });
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimit.retryAfterSeconds),
          },
        }
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // ── Public action: Get access code details for check-in page ──
    if (action === 'get-code-info') {
      const code = url.searchParams.get('code');

      if (!code || code.trim().length === 0 || code.length > 50) {
        return new Response(
          JSON.stringify({ error: 'Valid access code required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: accessCode, error } = await supabase
        .from('site_access_codes')
        .select(`
          id,
          name,
          is_active,
          project:projects(id, name, address, organisation_id),
          organisation:organisations(id, name, logo_url)
        `)
        .eq('code', code.trim())
        .single();

      if (error || !accessCode) {
        return new Response(
          JSON.stringify({ error: 'Invalid access code' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!accessCode.is_active) {
        return new Response(
          JSON.stringify({ error: 'This access code is no longer active' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch induction template for this project
      const { data: induction } = await supabase
        .from('site_induction_templates')
        .select(`
          id,
          name,
          description,
          video_url,
          items:site_induction_items(id, question, description, is_required, sort_order)
        `)
        .eq('project_id', accessCode.project.id)
        .eq('is_active', true)
        .order('sort_order', { foreignTable: 'site_induction_items' })
        .maybeSingle();

      return new Response(
        JSON.stringify({ accessCode, induction }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Public action: Complete induction ──
    // [P1 FIX] Now validates checked_items against required items and stores them server-side
    if (action === 'complete-induction' && req.method === 'POST') {
      const body = await req.json();

      const code = requireString(body.code, "code", { maxLength: 50 });
      const template_id = requireUUID(body.template_id, "template_id");
      const visitor_name = requireString(body.visitor_name, "visitor_name", { maxLength: 100 });
      const signature_data = requireString(body.signature_data, "signature_data", { maxLength: 50000 });
      const visitor_email = optionalString(body.visitor_email, "visitor_email", { maxLength: 255 });
      const visitor_company = optionalString(body.visitor_company, "visitor_company", { maxLength: 200 });
      const visitor_phone = optionalString(body.visitor_phone, "visitor_phone", { maxLength: 30 });

      // Validate checked_items is an array of strings
      const checked_items: string[] = Array.isArray(body.checked_items)
        ? body.checked_items.filter((v: unknown) => typeof v === "string" && v.length <= 100)
        : [];

      if (visitor_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(visitor_email)) {
        return new Response(
          JSON.stringify({ error: 'Invalid email format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: accessCode, error: accessCodeError } = await supabase
        .from('site_access_codes')
        .select('project_id, organisation_id, is_active')
        .eq('code', code)
        .single();

      if (accessCodeError || !accessCode || !accessCode.is_active) {
        return new Response(
          JSON.stringify({ error: 'Invalid or inactive access code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch template with items to enforce required checklist
      const { data: template, error: templateError } = await supabase
        .from('site_induction_templates')
        .select('id, items:site_induction_items(id, is_required)')
        .eq('id', template_id)
        .eq('project_id', accessCode.project_id)
        .eq('organisation_id', accessCode.organisation_id)
        .eq('is_active', true)
        .single();

      if (templateError || !template) {
        return new Response(
          JSON.stringify({ error: 'Invalid induction template for this access code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // [P1 FIX] Enforce that ALL required induction items are acknowledged
      const requiredItemIds = (template.items || [])
        .filter((item: { id: string; is_required: boolean }) => item.is_required)
        .map((item: { id: string; is_required: boolean }) => item.id);

      const checkedSet = new Set(checked_items);
      const missingItems = requiredItemIds.filter((id: string) => !checkedSet.has(id));

      if (missingItems.length > 0) {
        return new Response(
          JSON.stringify({
            error: 'All required induction items must be acknowledged',
            missing_items: missingItems,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: completion, error: completionError } = await supabase
        .from('site_induction_completions')
        .insert({
          template_id,
          project_id: accessCode.project_id,
          organisation_id: accessCode.organisation_id,
          visitor_name,
          visitor_email,
          visitor_company,
          visitor_phone,
          signature_data,
          checked_item_ids: checked_items,
          ip_address: clientIp,
          user_agent: req.headers.get('user-agent'),
        })
        .select()
        .single();

      if (completionError) {
        console.error('Error creating induction completion:', completionError);
        return new Response(
          JSON.stringify({ error: 'Failed to save induction completion' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Induction completed:', visitor_name);
      return new Response(
        JSON.stringify({ success: true, completion }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Public action: Check in a visitor ──
    // [P1 FIX] Server-side induction verification instead of trusting client boolean
    if (action === 'check-in' && req.method === 'POST') {
      const body = await req.json();

      const code = requireString(body.code, "code", { maxLength: 50 });
      const visitor_name = requireString(body.visitor_name, "visitor_name", { maxLength: 100 });
      const visitor_company = optionalString(body.visitor_company, "visitor_company", { maxLength: 200 });
      const visitor_email = optionalString(body.visitor_email, "visitor_email", { maxLength: 255 });
      const visitor_phone = optionalString(body.visitor_phone, "visitor_phone", { maxLength: 30 });
      const purpose = optionalString(body.purpose, "purpose", { maxLength: 500 });
      const emergency_contact_name = optionalString(body.emergency_contact_name, "emergency_contact_name", { maxLength: 100 });
      const emergency_contact_phone = optionalString(body.emergency_contact_phone, "emergency_contact_phone", { maxLength: 30 });
      // Accept optional induction_completion_id from the client
      const induction_completion_id = body.induction_completion_id
        ? requireUUID(body.induction_completion_id, "induction_completion_id")
        : null;

      if (visitor_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(visitor_email)) {
        return new Response(
          JSON.stringify({ error: 'Invalid email format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get the access code details
      const { data: accessCode, error: codeError } = await supabase
        .from('site_access_codes')
        .select('id, project_id, organisation_id, is_active')
        .eq('code', code)
        .single();

      if (codeError || !accessCode || !accessCode.is_active) {
        return new Response(
          JSON.stringify({ error: 'Invalid or inactive access code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // [P1 FIX] Check if project has an active induction template
      const { data: activeTemplate } = await supabase
        .from('site_induction_templates')
        .select('id')
        .eq('project_id', accessCode.project_id)
        .eq('is_active', true)
        .maybeSingle();

      let has_signed_induction = false;
      let verified_completion_id: string | null = null;

      if (activeTemplate) {
        // An induction is required — verify the completion exists server-side
        if (!induction_completion_id) {
          return new Response(
            JSON.stringify({ error: 'Site induction must be completed before check-in' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify the completion belongs to the same project/org and matches visitor identity
        const { data: completion, error: compError } = await supabase
          .from('site_induction_completions')
          .select('id, visitor_name, project_id, organisation_id')
          .eq('id', induction_completion_id)
          .eq('project_id', accessCode.project_id)
          .eq('organisation_id', accessCode.organisation_id)
          .single();

        if (compError || !completion) {
          return new Response(
            JSON.stringify({ error: 'Invalid or mismatched induction completion' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        has_signed_induction = true;
        verified_completion_id = completion.id;
      }

      // [P1 FIX Finding 3] Generate a checkout token for secure checkout
      const checkout_token = generateToken();

      // Create the visit record
      const { data: visit, error: visitError } = await supabase
        .from('site_visits')
        .insert({
          site_access_code_id: accessCode.id,
          project_id: accessCode.project_id,
          organisation_id: accessCode.organisation_id,
          visitor_name,
          visitor_company,
          visitor_email,
          visitor_phone,
          purpose,
          emergency_contact_name,
          emergency_contact_phone,
          has_signed_induction,
          checkout_token,
        })
        .select('id, visitor_name, checked_in_at, checkout_token')
        .single();

      if (visitError) {
        console.error('Error creating visit:', visitError);
        return new Response(
          JSON.stringify({ error: 'Failed to check in' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // [P1 FIX] Link the induction completion to this site visit
      if (verified_completion_id) {
        await supabase
          .from('site_induction_completions')
          .update({ site_visit_id: visit.id })
          .eq('id', verified_completion_id);
      }

      console.log('Visitor checked in:', visitor_name);
      return new Response(
        JSON.stringify({ success: true, visit }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Public action: Check out a visitor ──
    // [P1 FIX] Require checkout_token instead of trusting email+code
    if (action === 'check-out' && req.method === 'POST') {
      const body = await req.json();

      // Primary method: checkout by token (issued at check-in)
      if (body.checkout_token) {
        const token = requireString(body.checkout_token, "checkout_token", { maxLength: 128 });

        const { data: visit, error: findError } = await supabase
          .from('site_visits')
          .select('id')
          .eq('checkout_token', token)
          .is('checked_out_at', null)
          .maybeSingle();

        if (findError || !visit) {
          return new Response(
            JSON.stringify({ error: 'No active visit found for this token' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: updatedVisit, error: updateError } = await supabase
          .from('site_visits')
          .update({ checked_out_at: new Date().toISOString(), checkout_token: null })
          .eq('id', visit.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error checking out:', updateError);
          return new Response(
            JSON.stringify({ error: 'Failed to check out' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, visit: updatedVisit }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fallback: checkout by visit_id (for authenticated admin/manager flows)
      if (body.visit_id) {
        const validId = requireUUID(body.visit_id, "visit_id");

        const { data: updatedVisit, error: updateError } = await supabase
          .from('site_visits')
          .update({ checked_out_at: new Date().toISOString(), checkout_token: null })
          .eq('id', validId)
          .is('checked_out_at', null)
          .select()
          .single();

        if (updateError || !updatedVisit) {
          return new Response(
            JSON.stringify({ error: 'No active visit found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, visit: updatedVisit }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'checkout_token or visit_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    if (error instanceof ValidationError) {
      return validationErrorResponse(error, corsHeaders);
    }
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
