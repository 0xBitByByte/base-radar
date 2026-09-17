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

/**
 * PR-111 — a plain module-scope `let snapshot = ...` is not a true
 * process-wide singleton under Next.js: the framework compiles each route
 * (a Page, a Route Handler) into its own server bundle, and this module's
 * code can end up duplicated into several of them rather than loaded
 * once and shared — confirmed by directly grepping the compiled
 * `.next/server` output, which found this exact module's code present in
 * 6 separate chunk files. A real GitHub call made while serving a Page
 * route was, as a result, invisible to the Admin Observability Route
 * Handler reading `getGithubRateLimitSnapshot()` from a different bundle
 * — reproduced live in PR-110.1's investigation.
 *
 * `globalThis` is the one true per-process object, unaffected by how many
 * separate copies of this module's code exist — storing the snapshot
 * there (behind a `Symbol.for(...)` key, collision-resistant by
 * construction) makes every bundle's copy resolve to the same value. See
 * `lib/providers/common/telemetry.ts`'s own top-of-fix comment for the
 * full reasoning; this module gets the identical treatment because it's
 * read by that same admin route and exhibited the identical defect.
 */
const GITHUB_RATE_LIMIT_GLOBAL_KEY = Symbol.for("base-radar:github-rate-limit-snapshot:v1");

type GithubRateLimitGlobalStore = {
  snapshot: GithubRateLimitSnapshot | null;
};

function getGlobalStore(): GithubRateLimitGlobalStore {
  const globalRef = globalThis as Record<symbol, GithubRateLimitGlobalStore | undefined>;
  let store = globalRef[GITHUB_RATE_LIMIT_GLOBAL_KEY];
  if (!store) {
    store = { snapshot: null };
    globalRef[GITHUB_RATE_LIMIT_GLOBAL_KEY] = store;
  }
  return store;
}

export function recordGithubRateLimitHeaders(headers: Headers): void {
  const limit = headers.get("x-ratelimit-limit");
  const remaining = headers.get("x-ratelimit-remaining");
  const reset = headers.get("x-ratelimit-reset");
  if (limit === null || remaining === null || reset === null) return;

  getGlobalStore().snapshot = {
    limit: Number(limit),
    remaining: Number(remaining),
    resetAt: new Date(Number(reset) * 1000).toISOString(),
    authenticated: Boolean(process.env.GITHUB_TOKEN),
  };
}

/** `null` until this process has made at least one real GitHub request. */
export function getGithubRateLimitSnapshot(): GithubRateLimitSnapshot | null {
  return getGlobalStore().snapshot;
}

/** Test-only reset — production code never calls this. Mirrors every other provider module's own `__reset*ForTests()` convention. */
export function __resetGithubRateLimitSnapshotForTests(): void {
  getGlobalStore().snapshot = null;
}
