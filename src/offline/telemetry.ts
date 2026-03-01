interface TelemetryEvent {
  event: string;
  properties: Record<string, unknown>;
  timestamp: number;
  session_id: string;
  app_version: string;
  user_agent: string;
}

const SESSION_ID = crypto.randomUUID();
const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? 'dev';
const IS_DEV = import.meta.env.DEV;

const buffer: TelemetryEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function buildEvent(event: string, properties: Record<string, unknown>): TelemetryEvent {
  return {
    event,
    properties,
    timestamp: Date.now(),
    session_id: SESSION_ID,
    app_version: APP_VERSION,
    user_agent: navigator.userAgent,
  };
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(flush, 30_000);
}

async function flush() {
  flushTimer = null;
  if (buffer.length === 0) return;
  const batch = buffer.splice(0, buffer.length);

  if (IS_DEV) {
    console.groupCollapsed('[Telemetry] Flushing batch', batch.length);
    batch.forEach(e => console.log(e.event, e.properties));
    console.groupEnd();
    return;
  }

  try {
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ingest-telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: batch }),
      signal: AbortSignal.timeout(5000),
    }).catch(() => { /* swallow */ });
  } catch { /* swallow */ }
}

export const telemetry = {
  track(event: string, properties: Record<string, unknown> = {}) {
    buffer.push(buildEvent(event, properties));
    if (buffer.length >= 50) flush();
    else scheduleFlush();
  },

  error(event: string, properties: Record<string, unknown> = {}) {
    const e = buildEvent(`error.${event}`, { ...properties, level: 'error' });
    buffer.push(e);
    if (IS_DEV) console.error(`[Telemetry:error] ${event}`, properties);
    flush();
  },

  flushNow: flush,
};

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => { telemetry.flushNow(); });
}
