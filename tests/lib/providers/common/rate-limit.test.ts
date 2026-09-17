import { beforeEach, describe, expect, it } from "vitest";

import { assertRateLimit, resetRateLimitBucketsForTests, type RateLimitConfig } from "@/lib/providers/common/rate-limit";
import { __resetProviderTelemetryForTests, getProviderTelemetrySnapshot } from "@/lib/providers/common/telemetry";
import { ProviderRateLimitError } from "@/lib/providers/common/errors";

/**
 * PR-110 — focused coverage for `assertRateLimit`'s new telemetry hook.
 * `tryAcquire`'s own bucket-window mechanics are exercised end-to-end
 * elsewhere (every `service.ts`'s real usage); this file only proves the
 * new recording is correct and additive — never changes whether a call is
 * actually allowed or rejected.
 */
describe("assertRateLimit — PR-110 telemetry", () => {
  const CONFIG: RateLimitConfig = { limit: 2, windowMs: 60_000 };

  beforeEach(() => {
    resetRateLimitBucketsForTests();
    __resetProviderTelemetryForTests();
  });

  it("records an 'allowed' event for every call within budget", () => {
    assertRateLimit("github", CONFIG);
    assertRateLimit("github", CONFIG);

    expect(getProviderTelemetrySnapshot("github").rateLimiter).toEqual({ allowed: 2, rejected: 0 });
  });

  it("records a 'rejected' event once the budget is exhausted, and still throws exactly as before", () => {
    assertRateLimit("github", CONFIG);
    assertRateLimit("github", CONFIG);

    expect(() => assertRateLimit("github", CONFIG)).toThrow(ProviderRateLimitError);
    expect(getProviderTelemetrySnapshot("github").rateLimiter).toEqual({ allowed: 2, rejected: 1 });
  });

  it("providers are tracked independently", () => {
    assertRateLimit("coingecko", CONFIG);
    expect(getProviderTelemetrySnapshot("coingecko").rateLimiter.allowed).toBe(1);
    expect(getProviderTelemetrySnapshot("github").rateLimiter.allowed).toBe(0);
  });
});
