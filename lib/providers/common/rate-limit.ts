/**
 * Fixed-window rate limiter, keyed per provider (or per provider+operation).
 * Guards outbound calls to free public APIs whose limits are shared across
 * every request this process makes, independent of Next.js's per-request
 * fetch cache. A fixed window is a deliberate simplification over a sliding
 * log — see docs/API.md for the documented limit each provider currently
 * uses this against (e.g. GitHub's 60 req/hour unauthenticated cap).
 */

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

/** Clears a single key's budget. Primarily useful for tests. */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}
