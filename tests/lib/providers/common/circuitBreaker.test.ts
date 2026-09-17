import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CIRCUIT_BREAKER_CONFIG,
  __resetCircuitBreakerForTests,
  getCircuitState,
  recordRequestOutcome,
  shouldAllowRequest,
} from "@/lib/providers/common/circuitBreaker";

/**
 * V1-PHASE-2 (ADR V1-BLOCKER-001) — direct unit tests of the breaker's own
 * state machine, independent of `fetchJson()`'s integration (covered
 * separately in `fetchJson.test.ts`). Uses fake timers for the
 * cooldown/Half-Open transition, the same pattern already established for
 * `cache.ts`'s TTL logic in this session's Phase 1 tests.
 */
const PROVIDER = "blockscout";

describe("circuitBreaker", () => {
  beforeEach(() => {
    __resetCircuitBreakerForTests();
    vi.useFakeTimers();
    delete process.env.CIRCUIT_BREAKER_DISABLED;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts closed and allows requests", () => {
    expect(shouldAllowRequest(PROVIDER)).toBe(true);
    expect(getCircuitState(PROVIDER).state).toBe("closed");
  });

  it("a healthy success does not open the breaker and resets any prior failure count", () => {
    recordRequestOutcome(PROVIDER, "failure");
    recordRequestOutcome(PROVIDER, "failure");
    recordRequestOutcome(PROVIDER, "success");
    const state = getCircuitState(PROVIDER);
    expect(state.state).toBe("closed");
    expect(state.consecutiveFailures).toBe(0);
  });

  it("repeated consecutive failures open the breaker at the configured threshold", () => {
    for (let i = 0; i < CIRCUIT_BREAKER_CONFIG.tripThreshold - 1; i++) {
      recordRequestOutcome(PROVIDER, "failure");
      expect(getCircuitState(PROVIDER).state).toBe("closed");
    }
    recordRequestOutcome(PROVIDER, "failure");
    expect(getCircuitState(PROVIDER).state).toBe("open");
  });

  it("an open breaker blocks requests before the cooldown elapses", () => {
    for (let i = 0; i < CIRCUIT_BREAKER_CONFIG.tripThreshold; i++) recordRequestOutcome(PROVIDER, "failure");
    expect(getCircuitState(PROVIDER).state).toBe("open");
    expect(shouldAllowRequest(PROVIDER)).toBe(false);
  });

  it("after the cooldown elapses, the next check transitions Open -> Half-Open and allows exactly one trial", () => {
    for (let i = 0; i < CIRCUIT_BREAKER_CONFIG.tripThreshold; i++) recordRequestOutcome(PROVIDER, "failure");
    expect(shouldAllowRequest(PROVIDER)).toBe(false);

    vi.advanceTimersByTime(CIRCUIT_BREAKER_CONFIG.cooldownMs + 1);

    expect(shouldAllowRequest(PROVIDER)).toBe(true);
    expect(getCircuitState(PROVIDER).state).toBe("half-open");

    // V1-IMPLEMENT-002A — a second and third caller arriving while that one
    // trial is still unresolved must be rejected outright, not admitted as
    // additional trials.
    expect(shouldAllowRequest(PROVIDER)).toBe(false);
    expect(shouldAllowRequest(PROVIDER)).toBe(false);
  });

  it("only one trial is admitted while Half-Open — concurrent callers are rejected until it resolves, then normal admission resumes", () => {
    for (let i = 0; i < CIRCUIT_BREAKER_CONFIG.tripThreshold; i++) recordRequestOutcome(PROVIDER, "failure");
    vi.advanceTimersByTime(CIRCUIT_BREAKER_CONFIG.cooldownMs + 1);

    expect(shouldAllowRequest(PROVIDER)).toBe(true); // the one admitted trial
    expect(shouldAllowRequest(PROVIDER)).toBe(false); // second caller
    expect(shouldAllowRequest(PROVIDER)).toBe(false); // third caller

    recordRequestOutcome(PROVIDER, "success"); // the trial resolves

    expect(getCircuitState(PROVIDER).state).toBe("closed");
    expect(shouldAllowRequest(PROVIDER)).toBe(true); // normal admission resumed, no longer gated
  });

  it("a failed trial reopens the breaker and clears the in-flight trial, so the next cooldown admits exactly one fresh trial (not zero, not several)", () => {
    for (let i = 0; i < CIRCUIT_BREAKER_CONFIG.tripThreshold; i++) recordRequestOutcome(PROVIDER, "failure");
    vi.advanceTimersByTime(CIRCUIT_BREAKER_CONFIG.cooldownMs + 1);
    expect(shouldAllowRequest(PROVIDER)).toBe(true); // trial admitted

    recordRequestOutcome(PROVIDER, "failure"); // trial fails
    expect(getCircuitState(PROVIDER).state).toBe("open");
    expect(shouldAllowRequest(PROVIDER)).toBe(false); // back to blocking

    vi.advanceTimersByTime(CIRCUIT_BREAKER_CONFIG.cooldownMs + 1);

    expect(shouldAllowRequest(PROVIDER)).toBe(true); // exactly one fresh trial admitted
    expect(shouldAllowRequest(PROVIDER)).toBe(false); // and it alone, not a second one
  });

  it("a trial whose outcome is never reported (mirrors a 404/429/parse_error, which fetchJson never records) is treated as abandoned after a full cooldown, instead of permanently blocking the provider", () => {
    for (let i = 0; i < CIRCUIT_BREAKER_CONFIG.tripThreshold; i++) recordRequestOutcome(PROVIDER, "failure");
    vi.advanceTimersByTime(CIRCUIT_BREAKER_CONFIG.cooldownMs + 1);
    expect(shouldAllowRequest(PROVIDER)).toBe(true); // trial admitted
    expect(shouldAllowRequest(PROVIDER)).toBe(false); // concurrent caller rejected as expected

    // No recordRequestOutcome call ever follows — simulating a trial that
    // ended in an outcome `fetchJson` doesn't report to the breaker at all.
    vi.advanceTimersByTime(CIRCUIT_BREAKER_CONFIG.cooldownMs + 1);

    expect(shouldAllowRequest(PROVIDER)).toBe(true); // self-heals instead of staying wedged closed forever
  });

  it("a success while Half-Open closes the breaker and resets the failure count", () => {
    for (let i = 0; i < CIRCUIT_BREAKER_CONFIG.tripThreshold; i++) recordRequestOutcome(PROVIDER, "failure");
    vi.advanceTimersByTime(CIRCUIT_BREAKER_CONFIG.cooldownMs + 1);
    shouldAllowRequest(PROVIDER); // triggers Open -> Half-Open
    expect(getCircuitState(PROVIDER).state).toBe("half-open");

    recordRequestOutcome(PROVIDER, "success");

    const state = getCircuitState(PROVIDER);
    expect(state.state).toBe("closed");
    expect(state.consecutiveFailures).toBe(0);
  });

  it("a failure while Half-Open reopens the breaker (does not fall back to closed)", () => {
    for (let i = 0; i < CIRCUIT_BREAKER_CONFIG.tripThreshold; i++) recordRequestOutcome(PROVIDER, "failure");
    vi.advanceTimersByTime(CIRCUIT_BREAKER_CONFIG.cooldownMs + 1);
    shouldAllowRequest(PROVIDER); // triggers Open -> Half-Open
    expect(getCircuitState(PROVIDER).state).toBe("half-open");

    recordRequestOutcome(PROVIDER, "failure");

    expect(getCircuitState(PROVIDER).state).toBe("open");
    expect(shouldAllowRequest(PROVIDER)).toBe(false);
  });

  it("the kill switch bypasses the breaker completely, regardless of state", () => {
    for (let i = 0; i < CIRCUIT_BREAKER_CONFIG.tripThreshold; i++) recordRequestOutcome(PROVIDER, "failure");
    expect(getCircuitState(PROVIDER).state).toBe("open");

    process.env.CIRCUIT_BREAKER_DISABLED = "true";

    expect(shouldAllowRequest(PROVIDER)).toBe(true);
    // recordRequestOutcome is also a no-op while disabled — state never evolves.
    recordRequestOutcome(PROVIDER, "failure");
    expect(getCircuitState(PROVIDER).state).toBe("open"); // unchanged, not further mutated
  });

  it("providers are tracked independently — one provider's breaker does not affect another's", () => {
    for (let i = 0; i < CIRCUIT_BREAKER_CONFIG.tripThreshold; i++) recordRequestOutcome("blockscout", "failure");
    expect(getCircuitState("blockscout").state).toBe("open");
    expect(getCircuitState("github").state).toBe("closed");
    expect(shouldAllowRequest("github")).toBe(true);
  });

  it("logs exactly on state transitions, and never for a routine success/failure that doesn't cross a boundary", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    recordRequestOutcome(PROVIDER, "failure"); // below threshold — no transition
    recordRequestOutcome(PROVIDER, "success"); // closed -> closed — no transition
    expect(warnSpy).not.toHaveBeenCalled();

    for (let i = 0; i < CIRCUIT_BREAKER_CONFIG.tripThreshold; i++) recordRequestOutcome(PROVIDER, "failure");
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]![0]).toContain("closed->open");

    warnSpy.mockRestore();
  });
});
