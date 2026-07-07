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

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

export async function getOrSet<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const cached = store.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value as T;
  }

  const pending = inFlight.get(key);
  if (pending) {
    return pending as Promise<T>;
  }

  const promise = fn()
    .then((value) => {
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}

/** Removes a single cached entry, forcing the next call to refetch. */
export function invalidate(key: string): void {
  store.delete(key);
}

/** Clears the entire cache. Primarily useful for tests. */
export function clearCache(): void {
  store.clear();
  inFlight.clear();
}
