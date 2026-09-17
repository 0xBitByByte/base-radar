/**
 * Provider-agnostic, in-memory TTL cache. Deliberately independent of
 * Next.js's `fetch` data cache: this layer is meant to work anywhere it's
 * imported (a Server Component today, a script or background job later),
 * not only inside a Next.js request. See docs/DATABASE.md for the future
 * Redis upgrade path this is designed to be swapped for.
 *
 * Concurrent calls for the same key while a fetch is in flight share the
 * same promise, so a burst of requests never triggers duplicate upstream
 * calls (and never double-counts against a rate limit).
 */

import { providerFromCacheKey, recordCacheEvent } from "@/lib/providers/common/telemetry";

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
  fetchedAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

export async function getOrSet<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const cached = store.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    // PR-110 — a real cache hit: this call is answered without a new
    // upstream fetch. `providerFromCacheKey` reads only the safe
    // `provider:` prefix already documented on that function; recording
    // never changes what's returned below.
    recordCacheEvent(providerFromCacheKey(key), true);
    return cached.value as T;
  }

  const pending = inFlight.get(key);
  if (pending) {
    // A concurrent caller for the same key — genuinely deduped (no new
    // upstream fetch either), but distinct from a warm-cache hit, so it's
    // not double-counted as one here; the eventual `fn()` below is what
    // actually earns the one real "miss" this key produces.
    return pending as Promise<T>;
  }

  recordCacheEvent(providerFromCacheKey(key), false);

  const promise = fn()
    .then((value) => {
      store.set(key, { value, expiresAt: Date.now() + ttlMs, fetchedAt: Date.now() });
      return value;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}

/**
 * PR-074 DATA INTEGRITY AUDIT — the last real, successfully-fetched value
 * for `key`, regardless of whether its TTL has expired (entries are never
 * evicted on expiry, only overwritten on the next successful fetch — so
 * this is always available once a fetch has ever succeeded). Lets a
 * provider degrade gracefully to real, honestly-timestamped stale data
 * when a live call fails, instead of surfacing nothing. `undefined` if
 * this key has never been successfully fetched in this process.
 */
export function getStale<T>(key: string): { value: T; fetchedAt: string } | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  return { value: entry.value as T, fetchedAt: new Date(entry.fetchedAt).toISOString() };
}

/**
 * V3-WALLET-002 — the one addition to this module: an explicit way to drop
 * a key before its TTL naturally expires. Every existing caller of
 * `getOrSet`/`getStale` is unaffected (this is additive, not a change to
 * either function's behavior) — it exists because a manual "Refresh" action
 * on wallet holdings needs to force a genuinely fresh read, not just wait
 * out an already-short balance-cache window. `getStale` shares this same
 * `store`, so this also clears whatever stale-fallback value existed for
 * `key` — an accepted tradeoff for a user-initiated refresh (they asked for
 * current data, not a graceful degrade), unlike a passive TTL expiry.
 */
export function invalidate(key: string): void {
  store.delete(key);
}

/**
 * PR-098.06 — test-only reset, mirroring `circuitBreaker.ts`'s
 * `__resetCircuitBreakerForTests()` exactly: production code never calls
 * this. Exists so a provider-call-count test (e.g. "cold cache" vs "warm
 * cache" for the Featured Intelligence refresh cycle) can start from a
 * genuinely empty cache instead of leaking state across test cases via
 * this module's own singleton `store`/`inFlight` maps.
 */
export function __resetProviderCacheForTests(): void {
  store.clear();
  inFlight.clear();
}

