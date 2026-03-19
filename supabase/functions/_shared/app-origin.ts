const DEFAULT_APP_ORIGIN = "https://sitesafepro.lovable.app";
const DEFAULT_ALLOWED_ORIGINS = [
  "https://sitesafepro.lovable.app",
  "https://sitesafe.cloud",
  "https://www.sitesafe.cloud",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

function normalizeOrigin(value: string | null | undefined): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

function getConfiguredAppOrigin(): string {
  return (
    normalizeOrigin(
      Deno.env.get("APP_URL") ??
        Deno.env.get("PUBLIC_APP_URL") ??
        Deno.env.get("SITE_URL"),
    ) ?? DEFAULT_APP_ORIGIN
  );
}

function getAllowedOrigins(): Set<string> {
  const configuredOrigin = getConfiguredAppOrigin();
  const fromEnv = (Deno.env.get("ALLOWED_APP_ORIGINS") ?? "")
    .split(",")
    .map((value) => normalizeOrigin(value.trim()))
    .filter((value): value is string => Boolean(value));

  return new Set([configuredOrigin, ...DEFAULT_ALLOWED_ORIGINS, ...fromEnv]);
}

export function getTrustedAppOrigin(req: Request): string {
  const requestOrigin = normalizeOrigin(req.headers.get("origin"));
  const allowedOrigins = getAllowedOrigins();

  if (requestOrigin && allowedOrigins.has(requestOrigin)) {
    return requestOrigin;
  }

  return getConfiguredAppOrigin();
}

export function getTemplateBaseUrl(): string {
  return (
    normalizeOrigin(Deno.env.get("TEMPLATE_BASE_URL")) ??
    getConfiguredAppOrigin()
  );
}
