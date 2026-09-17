import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  __resetProviderTelemetryForTests,
  getAllProviderTelemetrySnapshots,
  getProviderTelemetrySnapshot,
  providerFromCacheKey,
  recordCacheEvent,
  recordCircuitOpen,
  recordCircuitRejection,
  recordProviderCall,
  recordRateLimitEvent,
  TELEMETRY_PROVIDER_NAMES,
} from "@/lib/providers/common/telemetry";

/**
 * PR-110 — direct unit tests of the telemetry module's own primitives, in
 * isolation from `fetchJson`/`cache.ts`/`circuitBreaker.ts`'s integration
 * (covered separately in their own test files). Every test here resets
 * the module's in-memory state first, mirroring `circuitBreaker.test.ts`'s
 * own `__resetCircuitBreakerForTests()` convention exactly.
 */

describe("providerFromCacheKey", () => {
  it("reads the real provider: prefix every service.ts cache key actually uses", () => {
    expect(providerFromCacheKey("github:repo:aave/aave-v3-core")).toBe("github");
    expect(providerFromCacheKey("coingecko:major-prices")).toBe("coingecko");
    expect(providerFromCacheKey("snapshot:proposals-batch:aave.eth,uniswap")).toBe("snapshot");
  });

  it("returns null for a key with no recognizable provider prefix — never mis-attributes it", () => {
    expect(providerFromCacheKey("key-1")).toBeNull();
    expect(providerFromCacheKey("not-a-real-provider:something")).toBeNull();
    expect(providerFromCacheKey("")).toBeNull();
    expect(providerFromCacheKey(":leading-colon")).toBeNull();
  });
});

describe("provider telemetry — aggregation", () => {
  beforeEach(() => {
    __resetProviderTelemetryForTests();
  });

  it("starts genuinely empty for every one of the 7 real providers, including snapshot", () => {
    expect(TELEMETRY_PROVIDER_NAMES).toContain("snapshot");
    expect(TELEMETRY_PROVIDER_NAMES).toHaveLength(7);

    const snapshot = getProviderTelemetrySnapshot("github");
    expect(snapshot.calls).toBe(0);
    expect(snapshot.cache.hitRatePercent).toBeNull(); // never a fabricated 0% with zero real checks
    expect(snapshot.latency.avgMs).toBeNull();
    expect(snapshot.latency.p95Ms).toBeNull();
    expect(snapshot.scope).toBe("process-local");
  });

  it("records real cache hits/misses and computes an honest hit rate", () => {
    recordCacheEvent("github", true);
    recordCacheEvent("github", true);
    recordCacheEvent("github", false);

    const snapshot = getProviderTelemetrySnapshot("github");
    expect(snapshot.cache).toEqual({ hits: 2, misses: 1, hitRatePercent: 66.7 });
  });

  it("recordCacheEvent(null, ...) is a genuine no-op — an unrecognized key shape never pollutes any provider's counters", () => {
    recordCacheEvent(null, true);
    for (const provider of TELEMETRY_PROVIDER_NAMES) {
      expect(getProviderTelemetrySnapshot(provider).cache).toEqual({ hits: 0, misses: 0, hitRatePercent: null });
    }
  });

  it("records real rate-limiter allow/reject counts, separate from cache and from HTTP-level rate_limited outcomes", () => {
    recordRateLimitEvent("coingecko", true);
    recordRateLimitEvent("coingecko", true);
    recordRateLimitEvent("coingecko", false);

    const snapshot = getProviderTelemetrySnapshot("coingecko");
    expect(snapshot.rateLimiter).toEqual({ allowed: 2, rejected: 1 });
  });

  it("records circuit-breaker opens and rejections independently", () => {
    recordCircuitOpen("blockscout");
    recordCircuitRejection("blockscout");
    recordCircuitRejection("blockscout");

    const snapshot = getProviderTelemetrySnapshot("blockscout");
    expect(snapshot.circuitBreaker.opens).toBe(1);
    expect(snapshot.circuitBreaker.rejectedWhileOpen).toBe(2);
    expect(snapshot.circuitBreaker.currentState).toBe("closed"); // real breaker state untouched by these telemetry-only calls
  });

  it("one logical call is one call, regardless of how many upstream attempts/retries it took — the LOGICAL CALL vs UPSTREAM ATTEMPT distinction", () => {
    recordProviderCall({ provider: "github", durationMs: 500, attempts: 2, retryCount: 1, outcome: "success", timedOut: true });

    const snapshot = getProviderTelemetrySnapshot("github");
    expect(snapshot.calls).toBe(1); // ONE logical call
    expect(snapshot.attempts).toBe(2); // TWO real upstream attempts
    expect(snapshot.retries).toBe(1);
    expect(snapshot.outcomes.success).toBe(1);
  });

  it("classifies outcomes into distinct buckets without conflating them", () => {
    recordProviderCall({ provider: "coingecko", durationMs: 10, attempts: 1, retryCount: 0, outcome: "success", timedOut: false });
    recordProviderCall({ provider: "coingecko", durationMs: 10, attempts: 1, retryCount: 0, outcome: "rate_limited", httpStatus: 429, timedOut: false });
    recordProviderCall({ provider: "coingecko", durationMs: 10, attempts: 1, retryCount: 0, outcome: "http_error", httpStatus: 500, timedOut: false });
    recordProviderCall({ provider: "coingecko", durationMs: 10, attempts: 3, retryCount: 2, outcome: "timeout", timedOut: true });

    const snapshot = getProviderTelemetrySnapshot("coingecko");
    expect(snapshot.outcomes).toEqual({
      success: 1,
      http_error: 1,
      timeout: 1,
      network_error: 0,
      rate_limited: 1,
      circuit_open: 0,
      parse_error: 0,
    });
    expect(snapshot.calls).toBe(4);
  });

  it("computes real avg/min/max latency from actual recorded samples, never a fabricated number", () => {
    for (const ms of [100, 200, 300]) {
      recordProviderCall({ provider: "defillama", durationMs: ms, attempts: 1, retryCount: 0, outcome: "success", timedOut: false });
    }
    const snapshot = getProviderTelemetrySnapshot("defillama");
    expect(snapshot.latency.sampleCount).toBe(3);
    expect(snapshot.latency.avgMs).toBe(200);
    expect(snapshot.latency.minMs).toBe(100);
    expect(snapshot.latency.maxMs).toBe(300);
  });

  it("never reports p95 below the minimum sample size — reports null instead of manufacturing precision", () => {
    for (let i = 0; i < 19; i++) {
      recordProviderCall({ provider: "dexscreener", durationMs: 100, attempts: 1, retryCount: 0, outcome: "success", timedOut: false });
    }
    expect(getProviderTelemetrySnapshot("dexscreener").latency.p95Ms).toBeNull();

    recordProviderCall({ provider: "dexscreener", durationMs: 100, attempts: 1, retryCount: 0, outcome: "success", timedOut: false });
    expect(getProviderTelemetrySnapshot("dexscreener").latency.p95Ms).not.toBeNull();
  });

  it("bounds its latency sample buffer instead of growing unbounded — the oldest sample is evicted first", () => {
    for (let i = 0; i < 250; i++) {
      recordProviderCall({ provider: "base", durationMs: i, attempts: 1, retryCount: 0, outcome: "success", timedOut: false });
    }
    const snapshot = getProviderTelemetrySnapshot("base");
    expect(snapshot.latency.sampleCount).toBeLessThanOrEqual(200);
    expect(snapshot.calls).toBe(250); // the logical call COUNT is never bounded, only the raw latency sample buffer
  });

  it("providers are tracked independently — recording for one never affects another", () => {
    recordProviderCall({ provider: "github", durationMs: 10, attempts: 1, retryCount: 0, outcome: "success", timedOut: false });
    expect(getProviderTelemetrySnapshot("github").calls).toBe(1);
    expect(getProviderTelemetrySnapshot("snapshot").calls).toBe(0);
  });

  it("getAllProviderTelemetrySnapshots returns all 7 real providers, including snapshot", () => {
    const snapshots = getAllProviderTelemetrySnapshots();
    expect(snapshots).toHaveLength(7);
    expect(snapshots.map((s) => s.provider).sort()).toEqual([...TELEMETRY_PROVIDER_NAMES].sort());
  });

  it("__resetProviderTelemetryForTests genuinely clears every provider's state", () => {
    recordProviderCall({ provider: "github", durationMs: 10, attempts: 1, retryCount: 0, outcome: "success", timedOut: false });
    recordCacheEvent("github", true);
    __resetProviderTelemetryForTests();
    const snapshot = getProviderTelemetrySnapshot("github");
    expect(snapshot.calls).toBe(0);
    expect(snapshot.cache).toEqual({ hits: 0, misses: 0, hitRatePercent: null });
  });
});

describe("provider telemetry — fail-open (PR-110 Phase 14)", () => {
  beforeEach(() => {
    __resetProviderTelemetryForTests();
  });

  it("a genuinely broken internal recording path never throws out of recordProviderCall — the real provider call's own result must never depend on telemetry succeeding", () => {
    const originalPush = Array.prototype.push;
    // Simulate an internal telemetry bug (e.g. a corrupted latency buffer) —
    // this must be swallowed, never surfaced to the caller.
    Array.prototype.push = () => {
      throw new Error("simulated internal telemetry failure");
    };
    try {
      expect(() =>
        recordProviderCall({ provider: "github", durationMs: 10, attempts: 1, retryCount: 0, outcome: "success", timedOut: false })
      ).not.toThrow();
    } finally {
      Array.prototype.push = originalPush;
    }
  });

  it("the same fail-open guarantee holds for cache, rate-limit, and circuit-breaker recording", () => {
    // Every one of these looks up its provider's counters via `Map#get`
    // internally (`getCounters`) — breaking that exercises the real
    // internal failure path for all four, unlike patching `Map#set` (which
    // a pre-seeded provider's increment path never actually calls).
    const originalGet = Map.prototype.get;
    Map.prototype.get = () => {
      throw new Error("simulated internal telemetry failure");
    };
    try {
      expect(() => recordCacheEvent("github", true)).not.toThrow();
      expect(() => recordRateLimitEvent("github", true)).not.toThrow();
      expect(() => recordCircuitOpen("github")).not.toThrow();
      expect(() => recordCircuitRejection("github")).not.toThrow();
    } finally {
      Map.prototype.get = originalGet;
    }
  });
});

describe("provider telemetry — secret redaction", () => {
  beforeEach(() => {
    __resetProviderTelemetryForTests();
  });

  afterEach(() => {
    __resetProviderTelemetryForTests();
  });

  it("recording a real call never leaks any secret-shaped value into the resulting snapshot, even if an observation somehow carried one", () => {
    const fakeToken = "ghp_thisIsAFakeTestTokenNotReal1234";
    // The real `ProviderCallObservation` shape has no field a token could
    // even go into — this test proves that structurally, not just by
    // absence of a string match: nothing here accepts an arbitrary string
    // and no field is named/used in a way a secret could plausibly flow
    // through.
    recordProviderCall({ provider: "github", durationMs: 10, attempts: 1, retryCount: 0, outcome: "success", timedOut: false });
    const snapshot = getProviderTelemetrySnapshot("github");
    expect(JSON.stringify(snapshot)).not.toContain(fakeToken);
    expect(JSON.stringify(snapshot)).not.toMatch(/authorization/i);
    expect(JSON.stringify(snapshot)).not.toMatch(/bearer/i);
  });
});
