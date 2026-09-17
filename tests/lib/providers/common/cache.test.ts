import { beforeEach, describe, expect, it, vi } from "vitest";

import { __resetProviderCacheForTests, getOrSet, getStale, invalidate } from "@/lib/providers/common/cache";
import { __resetProviderTelemetryForTests, getProviderTelemetrySnapshot } from "@/lib/providers/common/telemetry";

/**
 * MASTER HARDENING PASS — Concern 2 (concurrency deduplication). Direct,
 * primitive-level tests of `getOrSet`'s in-flight-dedup contract — no
 * `cache.test.ts` existed before this pass, despite every provider and
 * (as of this pass) the Featured Intelligence snapshot itself depending on
 * this exact guarantee. Complements the integration-level coverage in
 * `tests/lib/data/featuredIntelligenceProviderLoad.test.ts` (which exercises
 * the real provider stack, with its own retry logic layered on top) by
 * testing the dedup primitive in isolation, with a fully controllable `fn`.
 */

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("getOrSet — concurrency dedup", () => {
  beforeEach(() => {
    __resetProviderCacheForTests();
    __resetProviderTelemetryForTests();
  });

  it("1 caller: fetches once and returns the value", async () => {
    const fn = vi.fn(async () => "value");
    const result = await getOrSet("key-1", 60_000, fn);
    expect(result).toBe("value");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("repeated sequential callers within the TTL: only the first fetches, the rest read the cache", async () => {
    const fn = vi.fn(async () => "value");
    for (let i = 0; i < 5; i++) {
      await getOrSet("key-2", 60_000, fn);
    }
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("repeated sequential callers AFTER the TTL expires: a fresh fetch happens again", async () => {
    vi.useFakeTimers();
    try {
      const fn = vi.fn(async () => "value");
      await getOrSet("key-3", 1_000, fn);
      expect(fn).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1_500);
      await getOrSet("key-3", 1_000, fn);
      expect(fn).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("20 concurrent callers for the SAME key: only one real fetch occurs, and every caller gets the identical resolved value", async () => {
    let callCount = 0;
    const fn = vi.fn(async () => {
      callCount += 1;
      return `value-${callCount}`;
    });

    const results = await Promise.all(Array.from({ length: 20 }, () => getOrSet("key-4", 60_000, fn)));

    expect(fn).toHaveBeenCalledTimes(1);
    expect(new Set(results).size).toBe(1); // every caller got the exact same value
    expect(results[0]).toBe("value-1");
  });

  it("concurrent calls for DIFFERENT keys never share or block on each other's in-flight promise", async () => {
    const aDeferred = deferred<string>();
    const bFn = vi.fn(async () => "b-value");

    const aPromise = getOrSet("key-a", 60_000, () => aDeferred.promise);
    const bPromise = getOrSet("key-b", 60_000, bFn);

    // "b" resolves immediately, independent of "a" still being pending —
    // proving the two keys' in-flight state is genuinely isolated, not
    // accidentally serialized behind one shared lock.
    expect(await bPromise).toBe("b-value");
    expect(bFn).toHaveBeenCalledTimes(1);

    aDeferred.resolve("a-value");
    expect(await aPromise).toBe("a-value");
  });

  it("failure during a shared in-flight request: every concurrent caller sees the same rejection, never a fabricated value", async () => {
    const fn = vi.fn(async () => {
      throw new Error("simulated transient failure");
    });

    const results = await Promise.allSettled(Array.from({ length: 5 }, () => getOrSet("key-5", 60_000, fn)));

    expect(fn).toHaveBeenCalledTimes(1); // the failure itself was still deduped — no thundering-herd retry storm
    for (const result of results) {
      expect(result.status).toBe("rejected");
      if (result.status === "rejected") {
        expect((result.reason as Error).message).toBe("simulated transient failure");
      }
    }
  });

  it("a failed fetch does not poison the cache: a subsequent call genuinely retries and can succeed", async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error("transient")).mockResolvedValueOnce("recovered");

    await expect(getOrSet("key-6", 60_000, fn)).rejects.toThrow("transient");
    const result = await getOrSet("key-6", 60_000, fn);

    expect(result).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(2); // the retry was a REAL second attempt, not served from a poisoned cache entry
  });

  it("a failed fetch never leaves a stale-looking cache entry behind for getStale() to return", async () => {
    const fn = vi.fn(async () => {
      throw new Error("first attempt fails");
    });
    await expect(getOrSet("key-7", 60_000, fn)).rejects.toThrow();
    expect(getStale("key-7")).toBeUndefined(); // nothing to fall back to — a real, first-ever failure, not fabricated
  });

  it("stale fallback: a prior success survives a later failure via getStale(), honestly separate from getOrSet()'s own TTL-expired value", async () => {
    vi.useFakeTimers();
    try {
      const fn = vi.fn(async () => "good-value");
      await getOrSet("key-8", 1_000, fn);

      await vi.advanceTimersByTimeAsync(1_500); // past TTL
      const failingFn = vi.fn(async () => {
        throw new Error("now failing");
      });
      await expect(getOrSet("key-8", 1_000, failingFn)).rejects.toThrow();

      // getOrSet itself honestly propagates the failure (never silently
      // substitutes stale data on its own) — callers that want graceful
      // degradation opt in explicitly via getStale(), exactly the
      // `withStaleFallback` pattern the provider layer already uses.
      const stale = getStale<string>("key-8");
      expect(stale?.value).toBe("good-value");
    } finally {
      vi.useRealTimers();
    }
  });

  it("invalidate() clears a key so the next call is a genuine fresh fetch, not a cached one", async () => {
    const fn = vi.fn(async () => "value");
    await getOrSet("key-9", 60_000, fn);
    expect(fn).toHaveBeenCalledTimes(1);

    invalidate("key-9");
    await getOrSet("key-9", 60_000, fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  describe("PR-110 — cache telemetry", () => {
    it("a real provider-prefixed key records a genuine miss on first fetch, then a genuine hit on the cached re-read", async () => {
      const fn = vi.fn(async () => "value");
      await getOrSet("github:repo:aave/aave-v3-core", 60_000, fn);
      expect(getProviderTelemetrySnapshot("github").cache).toEqual({ hits: 0, misses: 1, hitRatePercent: 0 });

      await getOrSet("github:repo:aave/aave-v3-core", 60_000, fn);
      expect(getProviderTelemetrySnapshot("github").cache).toEqual({ hits: 1, misses: 1, hitRatePercent: 50 });
    });

    it("a key with no recognizable provider prefix records no telemetry for any provider — cache.ts stays genuinely provider-agnostic", async () => {
      const fn = vi.fn(async () => "value");
      await getOrSet("not-a-provider-key", 60_000, fn);
      await getOrSet("not-a-provider-key", 60_000, fn);
      for (const provider of ["github", "coingecko", "base", "blockscout", "defillama", "dexscreener", "snapshot"] as const) {
        expect(getProviderTelemetrySnapshot(provider).cache).toEqual({ hits: 0, misses: 0, hitRatePercent: null });
      }
    });

  });
});
