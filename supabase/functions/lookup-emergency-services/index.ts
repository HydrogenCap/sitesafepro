import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { address } = await req.json();

    if (!address || address.trim().length < 5) {
      return new Response(
        JSON.stringify({ error: 'Please provide a valid site address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Looking up emergency services for address: ${address}`);

    const prompt = `You are a UK emergency services locator assistant. Given a UK construction site address, provide the nearest emergency services information.

For the address: "${address}"

Please provide realistic information for:
1. Nearest A&E (Accident & Emergency) hospital
2. Nearest Fire Station
3. Nearest Police Station

For UK addresses, use real NHS hospitals, fire stations, and police stations that would logically be near this location. If you're not certain of exact names, provide the most likely options based on the general area.

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks):
{
  "nearest_ae_name": "Hospital name with A&E department",
  "nearest_ae_address": "Full address including postcode",
  "nearest_ae_distance": "Estimated distance and drive time, e.g. '2.3 miles / ~8 mins by car'",
  "nearest_fire_station_name": "Fire station name",
  "nearest_fire_station_address": "Full address including postcode",
  "nearest_police_station_name": "Police station name",
  "nearest_police_station_address": "Full address including postcode"
}

Be specific with real place names and realistic estimates. If the address is not in the UK or is invalid, provide a helpful response with null values.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to lookup emergency services' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in AI response:', aiResponse);
      return new Response(
        JSON.stringify({ error: 'No response from AI service' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('AI Response:', content);

    // Parse the JSON response, handling potential markdown code blocks
    let cleanedContent = content.trim();
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent.slice(7);
    } else if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.slice(3);
    }
    if (cleanedContent.endsWith('```')) {
      cleanedContent = cleanedContent.slice(0, -3);
    }
    cleanedContent = cleanedContent.trim();

    let emergencyInfo;
    try {
      emergencyInfo = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError, cleanedContent);
      return new Response(
        JSON.stringify({ error: 'Failed to parse emergency services data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Parsed emergency info:', emergencyInfo);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: emergencyInfo,
        source: 'ai_lookup'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in lookup-emergency-services:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
