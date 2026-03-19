import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface RateLimitOptions {
  identifier: string;
  scope: string;
  limit: number;
  windowSeconds: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export async function enforceRateLimit(
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data, error } = await supabase.rpc("consume_rate_limit", {
    p_rate_key: `${options.scope}:${options.identifier}`,
    p_limit: options.limit,
    p_window_seconds: options.windowSeconds,
  });

  if (error) {
    throw new Error(`Rate limit check failed: ${error.message}`);
  }

  const result = Array.isArray(data) ? data[0] : data;

  return {
    allowed: Boolean(result?.allowed),
    remaining: Number(result?.remaining ?? 0),
    retryAfterSeconds: Number(result?.retry_after_seconds ?? options.windowSeconds),
  };
}
