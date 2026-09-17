/**
 * PR-103 — lightweight, production-safe server-side timing instrumentation
 * for Project Profile's critical-path data loading (`app/dashboard/
 * projects/[slug]/page.tsx`). Not a new infrastructure layer: a structured
 * `console.log` per page render, synchronous, no I/O, no new dependency, no
 * persisted store, no UI. Opt-in via `PERF_TRACE_PROJECT_PROFILE=1` so it
 * costs nothing (not even a log line) unless explicitly enabled for an
 * investigation like this one.
 *
 * `timed()` wraps a promise purely to observe it — it re-throws whatever
 * the wrapped promise rejects with, unchanged, so a caller (e.g. this
 * page's own `Promise.allSettled`) sees the exact same fulfilled/rejected
 * outcome it would have without this wrapper. Adding this wrapper must
 * never change what the page renders, only what gets logged alongside it.
 */

export const PERF_TRACE_ENABLED = process.env.PERF_TRACE_PROJECT_PROFILE === "1";

export type TimingEntry = {
  label: string;
  durationMs: number;
  ok: boolean;
  error?: string;
};

/** Wraps `promise`, pushing one `TimingEntry` onto `sink` when it settles. Resolve/reject behavior is untouched. */
export function timed<T>(label: string, promise: Promise<T>, sink: TimingEntry[]): Promise<T> {
  if (!PERF_TRACE_ENABLED) return promise;
  const start = performance.now();
  return promise.then(
    (value) => {
      sink.push({ label, durationMs: Math.round(performance.now() - start), ok: true });
      return value;
    },
    (err: unknown) => {
      sink.push({ label, durationMs: Math.round(performance.now() - start), ok: false, error: err instanceof Error ? err.message : String(err) });
      throw err;
    }
  );
}

/** Synchronous convenience for a non-Promise timed span (e.g. wall-clock around a whole phase). */
export function markStart(): number {
  return performance.now();
}

export function markDuration(start: number): number {
  return Math.round(performance.now() - start);
}

export type ProjectProfileTimingSummary = {
  slug: string;
  totalMs: number;
  criticalBatchMs: number;
  postBatchMs: number;
  entries: TimingEntry[];
};

/** One structured log line per render — grep `perf:project-profile` in server logs to correlate a request end-to-end. */
export function logProjectProfileTiming(summary: ProjectProfileTimingSummary): void {
  if (!PERF_TRACE_ENABLED) return;
  console.log(JSON.stringify({ tag: "perf:project-profile", ...summary }));
}
