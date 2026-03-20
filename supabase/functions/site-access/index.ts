import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  requireString,
  requireUUID,
  requireStringArray,
  optionalString,
  optionalUUID,
  ValidationError,
  validationErrorResponse,
} from "../_shared/validation.ts";
import { enforceRateLimit, getClientIp } from "../_shared/rate-limit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function normalizeOptionalString(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function sameOptionalValue(a: string | null, b: string | null): boolean {
  return normalizeOptionalString(a ?? undefined) === normalizeOptionalString(b ?? undefined);
}

Deno.serve(async (req) => {
  // Handle CORS preflight
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

    // Public action: Get access code details for check-in page
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

    // Public action: Complete induction
    if (action === 'complete-induction' && req.method === 'POST') {
      const body = await req.json();

      // Validate inputs
      const code = requireString(body.code, "code", { maxLength: 50 });
      const template_id = requireUUID(body.template_id, "template_id");
      const visitor_name = requireString(body.visitor_name, "visitor_name", { maxLength: 100 });
      const signature_data = requireString(body.signature_data, "signature_data", { maxLength: 50000 });
      const visitor_email = optionalString(body.visitor_email, "visitor_email", { maxLength: 255 });
      const visitor_company = optionalString(body.visitor_company, "visitor_company", { maxLength: 200 });
      const visitor_phone = optionalString(body.visitor_phone, "visitor_phone", { maxLength: 30 });
      const checked_items = Array.from(new Set(
        requireStringArray(body.checked_items ?? [], "checked_items").map((value, index) =>
          requireUUID(value, `checked_items[${index}]`)
        )
      ));

      // Validate email format if provided
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

      const { data: template, error: templateError } = await supabase
        .from('site_induction_templates')
        .select(`
          id,
          items:site_induction_items(id, is_required)
        `)
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

      const requiredItemIds = ((template.items as Array<{ id: string; is_required: boolean }> | null) ?? [])
        .filter((item) => item.is_required)
        .map((item) => item.id);

      const missingRequiredItems = requiredItemIds.filter((itemId) => !checked_items.includes(itemId));
      if (missingRequiredItems.length > 0) {
        return new Response(
          JSON.stringify({ error: 'All required induction items must be acknowledged' }),
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

    // Public action: Check in a visitor
    if (action === 'check-in' && req.method === 'POST') {
      const body = await req.json();

      // Validate inputs
      const code = requireString(body.code, "code", { maxLength: 50 });
      const visitor_name = requireString(body.visitor_name, "visitor_name", { maxLength: 100 });
      const visitor_company = optionalString(body.visitor_company, "visitor_company", { maxLength: 200 });
      const visitor_email = optionalString(body.visitor_email, "visitor_email", { maxLength: 255 });
      const visitor_phone = optionalString(body.visitor_phone, "visitor_phone", { maxLength: 30 });
      const purpose = optionalString(body.purpose, "purpose", { maxLength: 500 });
      const emergency_contact_name = optionalString(body.emergency_contact_name, "emergency_contact_name", { maxLength: 100 });
      const emergency_contact_phone = optionalString(body.emergency_contact_phone, "emergency_contact_phone", { maxLength: 30 });
      const has_signed_induction = body.has_signed_induction === true;
      const induction_completion_id = optionalUUID(body.induction_completion_id, "induction_completion_id");

      // Validate email format if provided
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

      const { data: activeInduction } = await supabase
        .from('site_induction_templates')
        .select('id')
        .eq('project_id', accessCode.project_id)
        .eq('organisation_id', accessCode.organisation_id)
        .eq('is_active', true)
        .maybeSingle();

      let verifiedHasSignedInduction = false;

      if (activeInduction) {
        if (!induction_completion_id) {
          return new Response(
            JSON.stringify({ error: 'A completed site induction is required before check-in' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: completion, error: completionError } = await supabase
          .from('site_induction_completions')
          .select(`
            id,
            template_id,
            project_id,
            organisation_id,
            visitor_name,
            visitor_email,
            visitor_company,
            visitor_phone,
            site_visit_id
          `)
          .eq('id', induction_completion_id)
          .single();

        if (completionError || !completion) {
          return new Response(
            JSON.stringify({ error: 'Invalid induction completion' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (
          completion.project_id !== accessCode.project_id ||
          completion.organisation_id !== accessCode.organisation_id ||
          completion.template_id !== activeInduction.id
        ) {
          return new Response(
            JSON.stringify({ error: 'Induction completion does not match this access code' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (completion.site_visit_id) {
          return new Response(
            JSON.stringify({ error: 'This induction completion has already been used for check-in' }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const sameIdentity =
          normalizeOptionalString(completion.visitor_name) === normalizeOptionalString(visitor_name) &&
          sameOptionalValue(completion.visitor_email, visitor_email ?? null) &&
          sameOptionalValue(completion.visitor_company, visitor_company ?? null) &&
          sameOptionalValue(completion.visitor_phone, visitor_phone ?? null);

        if (!sameIdentity) {
          return new Response(
            JSON.stringify({ error: 'Check-in details must match the completed induction record' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        verifiedHasSignedInduction = true;
      } else {
        verifiedHasSignedInduction = has_signed_induction;
      }

      const checkoutToken = crypto.randomUUID();

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
          has_signed_induction: verifiedHasSignedInduction,
          checkout_token: checkoutToken,
        })
        .select()
        .single();

      if (visitError) {
        console.error('Error creating visit:', visitError);
        return new Response(
          JSON.stringify({ error: 'Failed to check in' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (induction_completion_id) {
        const { error: linkError } = await supabase
          .from('site_induction_completions')
          .update({ site_visit_id: visit.id })
          .eq('id', induction_completion_id)
          .is('site_visit_id', null);

        if (linkError) {
          await supabase.from('site_visits').delete().eq('id', visit.id);
          console.error('Error linking induction completion to visit:', linkError);
          return new Response(
            JSON.stringify({ error: 'Failed to finalise induction check-in' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      console.log('Visitor checked in:', visitor_name);
      return new Response(
        JSON.stringify({ success: true, visit, checkout_token: checkoutToken }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Public action: Check out a visitor
    if (action === 'check-out' && req.method === 'POST') {
      const body = await req.json();
      const visit_id = requireUUID(body.visit_id, "visit_id");
      const checkout_token = requireString(body.checkout_token, "checkout_token", { maxLength: 255 });

      const { data: visit, error: findError } = await supabase
        .from('site_visits')
        .select('id')
        .eq('id', visit_id)
        .eq('checkout_token', checkout_token)
        .is('checked_out_at', null)
        .maybeSingle();

      if (findError || !visit) {
        return new Response(
          JSON.stringify({ error: 'No active visit found for this checkout token' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update the visit with checkout time
      const { data: updatedVisit, error: updateError } = await supabase
        .from('site_visits')
        .update({ checked_out_at: new Date().toISOString() })
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
