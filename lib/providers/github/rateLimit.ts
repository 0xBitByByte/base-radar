/**
 * PR-074 REVIEW #1/#11 — in-memory snapshot of GitHub's own rate-limit
 * headers (`x-ratelimit-limit`/`-remaining`/`-reset`), updated from every
 * real request this process makes to GitHub, success or failure alike —
 * GitHub sends these headers even on a 403 rate-limit response, so a
 * blocked call still tells us exactly when it'll unblock. This is what lets
 * the Evidence & Sources panel show a real "Rate limited — 0/60 remaining,
 * resets in 18 minutes" instead of a generic "Unavailable," and is the
 * concrete signal the app needs to stop silently depending on the 60/hr
 * unauthenticated ceiling.
 */

export type GithubRateLimitSnapshot = {
  limit: number;
  remaining: number;
  /** ISO timestamp GitHub's own `x-ratelimit-reset` (unix seconds) converts to. */
  resetAt: string;
  /** Whether `GITHUB_TOKEN` was set for the request that produced this snapshot. */
  authenticated: boolean;
};

let snapshot: GithubRateLimitSnapshot | null = null;

export function recordGithubRateLimitHeaders(headers: Headers): void {
  const limit = headers.get("x-ratelimit-limit");
  const remaining = headers.get("x-ratelimit-remaining");
  const reset = headers.get("x-ratelimit-reset");
  if (limit === null || remaining === null || reset === null) return;

  snapshot = {
    limit: Number(limit),
    remaining: Number(remaining),
    resetAt: new Date(Number(reset) * 1000).toISOString(),
    authenticated: Boolean(process.env.GITHUB_TOKEN),
  };
}

/** `null` until this process has made at least one real GitHub request. */
export function getGithubRateLimitSnapshot(): GithubRateLimitSnapshot | null {
  return snapshot;
}
