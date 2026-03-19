/**
 * Shared CORS configuration for all Edge Functions.
 *
 * In production, only allow requests from our own domains.
 * During local development (Deno env DENO_DEPLOYMENT_ID absent),
 * localhost origins are also accepted.
 */

const ALLOWED_ORIGINS = [
  "https://sitesafe.cloud",
  "https://www.sitesafe.cloud",
  "https://sitesafepro.lovable.app",
];

const LOCAL_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:8080",
  "http://localhost:3000",
];

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const isLocal = !Deno.env.get("DENO_DEPLOYMENT_ID");

  const allowed = ALLOWED_ORIGINS.includes(origin)
    || origin.endsWith(".lovable.app")
    || (isLocal && LOCAL_ORIGINS.includes(origin));

  return {
    "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

/**
 * Handle a CORS preflight request.
 * Usage: if (req.method === 'OPTIONS') return handleCorsPrelight(req);
 */
export function handleCorsPreflight(req: Request): Response {
  return new Response(null, { headers: getCorsHeaders(req) });
}
