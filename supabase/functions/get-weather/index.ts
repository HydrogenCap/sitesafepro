import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { location, date } = await req.json();
    
    if (!location) {
      return new Response(
        JSON.stringify({ error: 'Location is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`Fetching weather for ${location} on ${date}`);

    const systemPrompt = `You are a weather information assistant. Based on the location and date provided, generate realistic weather information for a UK construction site. You must respond using the suggest_weather function.

Consider typical UK weather patterns for the time of year. Be realistic - UK weather is often cloudy, rainy, or overcast. Temperature should be in Celsius.

For conditions, pick 1-3 from this list only: Clear, Sunny, Partly Cloudy, Cloudy, Overcast, Light Rain, Heavy Rain, Showers, Thunderstorms, Snow, Sleet, Fog, Frost, Windy, Hot, Cold`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate weather for: ${location}, UK on ${date}` }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'suggest_weather',
              description: 'Return weather information for the specified location and date',
              parameters: {
                type: 'object',
                properties: {
                  weather_morning: {
                    type: 'string',
                    description: 'Morning weather description, e.g. "Cloudy, 8°C"'
                  },
                  weather_afternoon: {
                    type: 'string', 
                    description: 'Afternoon weather description, e.g. "Light rain, 12°C"'
                  },
                  temperature_high: {
                    type: 'number',
                    description: 'High temperature in Celsius'
                  },
                  temperature_low: {
                    type: 'number',
                    description: 'Low temperature in Celsius'
                  },
                  conditions: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Array of weather conditions from the allowed list'
                  },
                  weather_impact: {
                    type: 'string',
                    description: 'Potential impact on construction works, or "No significant impact expected" if weather is good'
                  }
                },
                required: ['weather_morning', 'weather_afternoon', 'temperature_high', 'temperature_low', 'conditions'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'suggest_weather' } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add funds to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response:', JSON.stringify(data));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error('No weather data returned from AI');
    }

    const weather = JSON.parse(toolCall.function.arguments);
    console.log('Parsed weather:', weather);

    return new Response(
      JSON.stringify(weather),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-weather function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to fetch weather' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
