import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // Public action: Get access code details for check-in page
    if (action === 'get-code-info') {
      const code = url.searchParams.get('code');
      
      if (!code) {
        return new Response(
          JSON.stringify({ error: 'Access code required' }),
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
        .eq('code', code)
        .single();

      if (error || !accessCode) {
        console.error('Error fetching access code:', error);
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
      const { 
        template_id,
        project_id,
        organisation_id,
        visitor_name,
        visitor_email,
        visitor_company,
        visitor_phone,
        signature_data,
      } = body;

      if (!template_id || !visitor_name || !signature_data) {
        return new Response(
          JSON.stringify({ error: 'Template ID, visitor name, and signature are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: completion, error: completionError } = await supabase
        .from('site_induction_completions')
        .insert({
          template_id,
          project_id,
          organisation_id,
          visitor_name,
          visitor_email,
          visitor_company,
          visitor_phone,
          signature_data,
          ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip'),
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
      const { 
        code, 
        visitor_name, 
        visitor_company, 
        visitor_email, 
        visitor_phone,
        purpose,
        emergency_contact_name,
        emergency_contact_phone,
        has_signed_induction
      } = body;

      if (!code || !visitor_name) {
        return new Response(
          JSON.stringify({ error: 'Access code and visitor name are required' }),
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
          has_signed_induction: has_signed_induction || false,
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

      console.log('Visitor checked in:', visitor_name);
      return new Response(
        JSON.stringify({ success: true, visit }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Public action: Check out a visitor
    if (action === 'check-out' && req.method === 'POST') {
      const body = await req.json();
      const { visit_id, code, visitor_email } = body;

      // Find the active visit
      let query = supabase
        .from('site_visits')
        .select('id')
        .is('checked_out_at', null);

      if (visit_id) {
        query = query.eq('id', visit_id);
      } else if (code && visitor_email) {
        // Find by access code and email
        const { data: accessCode } = await supabase
          .from('site_access_codes')
          .select('id')
          .eq('code', code)
          .single();

        if (accessCode) {
          query = query
            .eq('site_access_code_id', accessCode.id)
            .eq('visitor_email', visitor_email);
        }
      }

      const { data: visits, error: findError } = await query;

      if (findError || !visits || visits.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No active visit found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update the visit with checkout time
      const { data: updatedVisit, error: updateError } = await supabase
        .from('site_visits')
        .update({ checked_out_at: new Date().toISOString() })
        .eq('id', visits[0].id)
        .select()
        .single();

      if (updateError) {
        console.error('Error checking out:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to check out' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Visitor checked out:', visits[0].id);
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
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
