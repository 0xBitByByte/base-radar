/**
 * The health-check capability a backend must provide. Interface only —
 * no implementation lives here.
 */

export type BackendHealth = {
  healthy: boolean;
  message?: string;
  /**
   * PR-108.2 — present only when `healthy` is false, distinguishing why.
   * `"not-configured"`: this deployment never expected persistence to work
   * (e.g. Vercel, where no persistent SQLite volume exists) — an
   * intentional, documented deployment characteristic, not an operational
   * alarm. `"error"`: persistence was expected to work here (Fly.io, local
   * dev) and didn't — a real problem.
   */
  reason?: "not-configured" | "error";
};

export type HealthService = {
  check(): Promise<BackendHealth>;
};
