import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { __resetCircuitBreakerForTests, CIRCUIT_BREAKER_CONFIG, getCircuitState } from "@/lib/providers/common/circuitBreaker";
import { __resetProviderTelemetryForTests, getProviderTelemetrySnapshot } from "@/lib/providers/common/telemetry";
import { fetchJson } from "@/lib/providers/common/utilities";

/**
 * V1-PHASE-2 (ADR V1-BLOCKER-001) — integration tests proving `fetchJson()`
 * actually drives the circuit breaker end to end (gate check, failure
 * classification, retry-counted-once), not just that the breaker's own
 * state machine works in isolation (covered in `circuitBreaker.test.ts`).
 * `global.fetch` is mocked directly; the real `AbortController`/backoff
 * logic inside `fetchJsonOnce`/`fetchJson` runs unmodified.
 */
const PROVIDER = "blockscout";
const URL = "https://base.blockscout.com/api/v2/stats";

function jsonResponse(status: number, body: unknown = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    json: async () => body,
  } as Response;
}

/** Mimics real `fetch()`'s own abort behavior: never resolves on its own, only rejects once `init.signal` fires — the same contract `fetchJsonOnce`'s `AbortController` timeout relies on. */
function abortableHang(_url: string, init?: RequestInit): Promise<never> {
  return new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => {
      const err = new Error("The operation was aborted");
      err.name = "AbortError";
      reject(err);
    });
  });
}

describe("fetchJson — circuit breaker integration", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    __resetCircuitBreakerForTests();
    __resetProviderTelemetryForTests();
    vi.useFakeTimers();
    delete process.env.CIRCUIT_BREAKER_DISABLED;
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("a healthy request succeeds unchanged and never touches the breaker's failure count", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    const result = await fetchJson<{ ok: boolean }>(PROVIDER, URL);

    expect(result).toEqual({ ok: true });
    expect(getCircuitState(PROVIDER)).toEqual({ state: "closed", consecutiveFailures: 0, openedAt: null });
  });

  it("HTTP 404 never trips the breaker", async () => {
    fetchMock.mockResolvedValue(jsonResponse(404));
    await expect(fetchJson(PROVIDER, URL, undefined, 1000, 0)).rejects.toThrow();
    expect(getCircuitState(PROVIDER).consecutiveFailures).toBe(0);
  });

  it("HTTP 429 never trips the breaker", async () => {
    fetchMock.mockResolvedValue(jsonResponse(429));
    await expect(fetchJson(PROVIDER, URL, undefined, 1000, 0)).rejects.toThrow();
    expect(getCircuitState(PROVIDER).consecutiveFailures).toBe(0);
  });

  it("HTTP 5xx counts toward the breaker", async () => {
    fetchMock.mockResolvedValue(jsonResponse(503));
    await expect(fetchJson(PROVIDER, URL, undefined, 1000, 0)).rejects.toThrow();
    expect(getCircuitState(PROVIDER).consecutiveFailures).toBe(1);
  });

  it("a timeout counts toward the breaker", async () => {
    fetchMock.mockImplementation(abortableHang);

    const pending = fetchJson(PROVIDER, URL, undefined, 1000, 0);
    const assertion = expect(pending).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;

    expect(getCircuitState(PROVIDER).consecutiveFailures).toBe(1);
  });

  it("repeated 5xx failures open the breaker at the configured threshold, then block further requests before any network attempt", async () => {
    fetchMock.mockResolvedValue(jsonResponse(500));

    for (let i = 0; i < CIRCUIT_BREAKER_CONFIG.tripThreshold; i++) {
      await expect(fetchJson(PROVIDER, URL, undefined, 1000, 0)).rejects.toThrow();
    }
    expect(getCircuitState(PROVIDER).state).toBe("open");

    fetchMock.mockClear();
    await expect(fetchJson(PROVIDER, URL, undefined, 1000, 0)).rejects.toThrow(/circuit breaker open/i);
    expect(fetchMock).not.toHaveBeenCalled(); // blocked before any network attempt
  });

  it("a call that retries internally before finally succeeding counts as exactly one success, never a mix of failure+success", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(500)).mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    const pending = fetchJson<{ ok: boolean }>(PROVIDER, URL, undefined, 1000, 1); // 1 retry available
    // Let the first attempt fail and the retry backoff (250ms) elapse.
    await vi.advanceTimersByTimeAsync(300);
    const result = await pending;

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2); // the retry genuinely happened
    expect(getCircuitState(PROVIDER)).toEqual({ state: "closed", consecutiveFailures: 0, openedAt: null }); // breaker only sees the final success
  });

  it("a call that exhausts its retries counts as exactly one breaker failure, not one per attempt", async () => {
    fetchMock.mockResolvedValue(jsonResponse(500));

    const pending = fetchJson(PROVIDER, URL, undefined, 1000, 2); // 3 total attempts
    const assertion = expect(pending).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(250); // first backoff
    await vi.advanceTimersByTimeAsync(500); // second backoff
    await assertion;

    expect(fetchMock).toHaveBeenCalledTimes(3); // 1 initial + 2 retries genuinely happened
    expect(getCircuitState(PROVIDER).consecutiveFailures).toBe(1); // but the breaker only recorded one outcome
  });

  it("the kill switch bypasses the breaker even when it would otherwise be open", async () => {
    fetchMock.mockResolvedValue(jsonResponse(500));
    for (let i = 0; i < CIRCUIT_BREAKER_CONFIG.tripThreshold; i++) {
      await expect(fetchJson(PROVIDER, URL, undefined, 1000, 0)).rejects.toThrow();
    }
    expect(getCircuitState(PROVIDER).state).toBe("open");

    process.env.CIRCUIT_BREAKER_DISABLED = "true";
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    const result = await fetchJson<{ ok: boolean }>(PROVIDER, URL, undefined, 1000, 0);
    expect(result).toEqual({ ok: true }); // real network attempt happened despite the open circuit
  });
});

describe("fetchJson — PR-110 telemetry integration", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    __resetCircuitBreakerForTests();
    __resetProviderTelemetryForTests();
    vi.useFakeTimers();
    delete process.env.CIRCUIT_BREAKER_DISABLED;
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("a plain success records exactly one logical call, one attempt, zero retries, outcome success", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    await fetchJson<{ ok: boolean }>(PROVIDER, URL);

    const snapshot = getProviderTelemetrySnapshot(PROVIDER);
    expect(snapshot.calls).toBe(1);
    expect(snapshot.attempts).toBe(1);
    expect(snapshot.retries).toBe(0);
    expect(snapshot.outcomes.success).toBe(1);
    expect(snapshot.latency.sampleCount).toBe(1);
  });

  it("a real HTTP 429 is classified rate_limited, distinct from a generic http_error", async () => {
    fetchMock.mockResolvedValue(jsonResponse(429));
    await expect(fetchJson(PROVIDER, URL, undefined, 1000, 0)).rejects.toThrow();

    const snapshot = getProviderTelemetrySnapshot(PROVIDER);
    expect(snapshot.outcomes.rate_limited).toBe(1);
    expect(snapshot.outcomes.http_error).toBe(0);
  });

  it("a 5xx is classified http_error", async () => {
    fetchMock.mockResolvedValue(jsonResponse(503));
    await expect(fetchJson(PROVIDER, URL, undefined, 1000, 0)).rejects.toThrow();

    expect(getProviderTelemetrySnapshot(PROVIDER).outcomes.http_error).toBe(1);
  });

  it("a call that retries after a timeout then succeeds records ONE logical call, TWO attempts, ONE retry, timedOut true, outcome success — never counted as two logical calls", async () => {
    fetchMock.mockImplementationOnce(abortableHang).mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    const pending = fetchJson<{ ok: boolean }>(PROVIDER, URL, undefined, 1000, 1);
    await vi.advanceTimersByTimeAsync(1000); // the hung first attempt times out
    await vi.advanceTimersByTimeAsync(300); // retry backoff
    const result = await pending;

    expect(result).toEqual({ ok: true });
    const snapshot = getProviderTelemetrySnapshot(PROVIDER);
    expect(snapshot.calls).toBe(1); // ONE logical call, not two
    expect(snapshot.attempts).toBe(2);
    expect(snapshot.retries).toBe(1);
    expect(snapshot.outcomes.success).toBe(1);
    expect(snapshot.outcomes.timeout).toBe(0); // the eventual outcome is success — the timeout is only reflected in timedOut, not double-counted as its own outcome
  });

  it("a call that exhausts its retries records ONE logical call with the final outcome and the real total attempt count", async () => {
    fetchMock.mockResolvedValue(jsonResponse(500));

    const pending = fetchJson(PROVIDER, URL, undefined, 1000, 2); // 3 total attempts
    const assertion = expect(pending).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(250);
    await vi.advanceTimersByTimeAsync(500);
    await assertion;

    const snapshot = getProviderTelemetrySnapshot(PROVIDER);
    expect(snapshot.calls).toBe(1);
    expect(snapshot.attempts).toBe(3);
    expect(snapshot.retries).toBe(2);
    expect(snapshot.outcomes.http_error).toBe(1);
  });

  it("a circuit-open rejection is recorded as its own outcome, with zero attempts — no network call was ever made", async () => {
    fetchMock.mockResolvedValue(jsonResponse(500));
    for (let i = 0; i < CIRCUIT_BREAKER_CONFIG.tripThreshold; i++) {
      await expect(fetchJson(PROVIDER, URL, undefined, 1000, 0)).rejects.toThrow();
    }
    fetchMock.mockClear();

    await expect(fetchJson(PROVIDER, URL, undefined, 1000, 0)).rejects.toThrow(/circuit breaker open/i);

    expect(fetchMock).not.toHaveBeenCalled();
    const snapshot = getProviderTelemetrySnapshot(PROVIDER);
    expect(snapshot.outcomes.circuit_open).toBe(1);
    const circuitOpenCall = snapshot.calls; // the trip-threshold http_errors + this one circuit_open call
    expect(circuitOpenCall).toBe(CIRCUIT_BREAKER_CONFIG.tripThreshold + 1);
  });

  it("never records a real secret/header value anywhere in the recorded observation or snapshot", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    await fetchJson<{ ok: boolean }>("github", "https://api.github.com/repos/example/example", {
      headers: { authorization: "Bearer ghp_fakeTestTokenShouldNeverAppear" },
    });

    const snapshot = getProviderTelemetrySnapshot("github");
    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toContain("ghp_fakeTestTokenShouldNeverAppear");
    expect(serialized).not.toMatch(/authorization/i);
    expect(serialized).not.toMatch(/bearer/i);
  });
});
