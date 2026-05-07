/**
 * Sync debug recorder. Each syncCloudData call creates a trace; every
 * step appends a structured event. Traces are buffered in memory and
 * exposed on window.__routyneSync so failures can be diagnosed without
 * code changes.
 *
 *   In DevTools:
 *     window.__routyneSync.last        // most recent trace
 *     window.__routyneSync.traces      // last 10 traces
 *     window.__routyneSync.dump()      // copy to clipboard
 */

export interface SyncEvent {
  ts: string;
  step: string;
  data?: Record<string, unknown>;
  error?: string;
}

export interface SyncTrace {
  id: string;
  userId: string;
  startedAt: string;
  finishedAt: string | null;
  ok: boolean | null;
  events: SyncEvent[];
}

const MAX_TRACES = 10;
const traces: SyncTrace[] = [];

function nowIso(): string {
  return new Date().toISOString();
}

function publish(): void {
  if (typeof window === 'undefined') return;
  const w = window as unknown as { __routyneSync?: unknown };
  w.__routyneSync = {
    last: traces[traces.length - 1] ?? null,
    traces,
    dump() {
      const text = JSON.stringify(traces, null, 2);
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(text).catch(() => {});
      }
      console.log('[Sync] trace dump\n' + text);
      return text;
    },
  };
}

export function startTrace(userId: string): SyncTrace {
  const trace: SyncTrace = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    userId,
    startedAt: nowIso(),
    finishedAt: null,
    ok: null,
    events: [],
  };
  traces.push(trace);
  while (traces.length > MAX_TRACES) traces.shift();
  publish();
  return trace;
}

export function logEvent(
  trace: SyncTrace,
  step: string,
  data?: Record<string, unknown>,
  error?: unknown
): void {
  const event: SyncEvent = {
    ts: nowIso(),
    step,
    ...(data ? { data } : {}),
    ...(error ? { error: error instanceof Error ? error.message : String(error) } : {}),
  };
  trace.events.push(event);
  publish();

  const prefix = `[Sync ${trace.id}] ${step}`;
  if (error) {
    console.error(prefix, data ?? {}, error);
  } else {
    console.info(prefix, data ?? {});
  }
}

export function finishTrace(trace: SyncTrace, ok: boolean): void {
  trace.finishedAt = nowIso();
  trace.ok = ok;
  publish();
}
