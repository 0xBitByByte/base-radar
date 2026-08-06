/**
 * Fixed-window rate limiter, keyed per provider (or per provider+operation).
 * Guards outbound calls to free public APIs whose limits are shared across
 * every request this process makes, independent of Next.js's per-request
 * fetch cache. A fixed window is a deliberate simplification over a sliding
 * log — see docs/API.md for the documented limit each provider currently
 * uses this against (e.g. GitHub's 60 req/hour unauthenticated cap).
 */

import { ProviderRateLimitError } from "@/lib/providers/common/errors";
import type { ProviderName } from "@/lib/providers/common/types";

type Bucket = {
  count: number;
  windowStart: number;
};

export type RateLimitConfig = {
  limit: number;
  windowMs: number;
};

const buckets = new Map<string, Bucket>();

/**
 * Records one call against `key`'s budget and returns whether it was
 * allowed. Returns `false` without side effects once the window's `limit`
 * has been reached, until `windowMs` has elapsed since the window started.
 */
export function tryAcquire(key: string, config: RateLimitConfig): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart >= config.windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (bucket.count >= config.limit) {
    return false;
  }

  bucket.count += 1;
  return true;
}

/**
 * Throwing convenience wrapper around `tryAcquire`, keyed by provider.
 * This is what every provider's `service.ts` calls before an actual
 * network request — centralized here so the "not allowed → throw
 * `ProviderRateLimitError`" behavior is defined once instead of being
 * repeated per provider.
 */
export function assertRateLimit(provider: ProviderName, config: RateLimitConfig): void {
  if (!tryAcquire(provider, config)) {
    throw new ProviderRateLimitError(provider);
  }
}

/** Clears a single key's budget. Primarily useful for tests. */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

/**
 * PR-074 REVIEW #8 — real-time read of a key's current budget window,
 * without mutating it (unlike `tryAcquire`). This is what lets the Evidence
 * & Sources panel show exact "N/M requests remaining, resets in Ts" for
 * every rate-limited provider (previously only GitHub had this, via a
 * separate ad hoc mechanism reading GitHub's own response headers — this
 * covers every provider using this shared app-enforced limiter the same
 * way). `null` when this key has never made a request yet in the current
 * process lifetime — there's honestly nothing to report.
 */
export function getRateLimitStatus(key: string, config: RateLimitConfig): { remaining: number; limit: number; resetAt: string } | null {
  const bucket = buckets.get(key);
  if (!bucket) return null;
  const now = Date.now();
  if (now - bucket.windowStart >= config.windowMs) {
    // This window has already lapsed — the next real call will start a fresh one at `config.limit`.
    return { remaining: config.limit, limit: config.limit, resetAt: new Date(now).toISOString() };
  }
  return {
    remaining: Math.max(0, config.limit - bucket.count),
    limit: config.limit,
    resetAt: new Date(bucket.windowStart + config.windowMs).toISOString(),
  };
}
