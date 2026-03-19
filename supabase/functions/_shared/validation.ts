/**
 * Shared Zod-like validation helpers for Edge Functions.
 * Lightweight validators to avoid importing full Zod in Deno edge functions.
 */

export class ValidationError extends Error {
  constructor(public field: string, message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/** Assert value is a non-empty string, trimmed. */
export function requireString(
  value: unknown,
  field: string,
  opts?: { maxLength?: number; minLength?: number }
): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(field, `${field} is required and must be a non-empty string`);
  }
  const trimmed = value.trim();
  if (opts?.maxLength && trimmed.length > opts.maxLength) {
    throw new ValidationError(field, `${field} must be at most ${opts.maxLength} characters`);
  }
  if (opts?.minLength && trimmed.length < opts.minLength) {
    throw new ValidationError(field, `${field} must be at least ${opts.minLength} characters`);
  }
  return trimmed;
}

/** Assert value is a valid UUID v4. */
export function requireUUID(value: unknown, field: string): string {
  const s = requireString(value, field);
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(s)) {
    throw new ValidationError(field, `${field} must be a valid UUID`);
  }
  return s;
}

/** Assert value is a valid email. */
export function requireEmail(value: unknown, field: string): string {
  const s = requireString(value, field, { maxLength: 255 });
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(s)) {
    throw new ValidationError(field, `${field} must be a valid email address`);
  }
  return s;
}

/** Assert value is one of the allowed values. */
export function requireEnum<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[]
): T {
  const s = requireString(value, field);
  if (!allowed.includes(s as T)) {
    throw new ValidationError(field, `${field} must be one of: ${allowed.join(", ")}`);
  }
  return s as T;
}

/** Optional string — returns undefined if missing/empty, validated string otherwise. */
export function optionalString(
  value: unknown,
  field: string,
  opts?: { maxLength?: number }
): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return requireString(value, field, opts);
}

/** Optional UUID. */
export function optionalUUID(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return requireUUID(value, field);
}

/** Assert value is an array of strings. */
export function requireStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) {
    throw new ValidationError(field, `${field} must be an array`);
  }
  return value.map((v, i) => requireString(v, `${field}[${i}]`));
}

/** Build a 400 JSON response from a ValidationError. */
export function validationErrorResponse(
  error: ValidationError,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({ error: error.message, field: error.field }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
