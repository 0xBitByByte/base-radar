import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { withBoundedWait } from "@/lib/providers/common/utilities";
import type { ProviderResult } from "@/lib/providers/common/types";

/**
 * PR-105 — Provider-Latency Resilience. `withBoundedWait` is the one new
 * primitive this PR adds: it must never reject (every `ProviderResult`
 * caller already only expects a resolved value), never fabricate real
 * data, and never abandon the wrapped promise's own in-flight work just
 * because this render stopped waiting for it.
 */

function ok<T>(data: T): ProviderResult<T> {
  return { ok: true, data, source: "blockscout", fetchedAt: new Date().toISOString() };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("withBoundedWait", () => {
  it("passes through a fast, real success unchanged", async () => {
    const value = ok({ real: true });
    const result = await withBoundedWait("blockscout", Promise.resolve(value), 5_000);
    expect(result).toBe(value); // exact same object, nothing rewritten
  });

  it("passes through a fast, real failure unchanged (never converts a real failure into a timeout)", async () => {
    const failure: ProviderResult<unknown> = { ok: false, source: "blockscout", error: { code: "network_error", message: "real failure" } };
    const result = await withBoundedWait("blockscout", Promise.resolve(failure), 5_000);
    expect(result).toBe(failure);
  });

  it("resolves to a real value that arrives just before the bound, not a timeout", async () => {
    const { promise, resolve } = deferred<ProviderResult<string>>();
    const racePromise = withBoundedWait("defillama", promise, 5_000);

    await vi.advanceTimersByTimeAsync(4_999);
    resolve(ok("just in time"));
    const result = await racePromise;

    expect(result.ok).toBe(true);
    expect(result.ok && result.data).toBe("just in time");
  });

  it("resolves to a synthetic ok:false with code 'timeout' when the bound elapses first — never rejects", async () => {
    const { promise } = deferred<ProviderResult<string>>(); // never resolves during this test
    const racePromise = withBoundedWait("defillama", promise, 5_000);

    await vi.advanceTimersByTimeAsync(5_000);
    const result = await racePromise;

    expect(result.ok).toBe(false);
    expect(result.ok || result.error.code).toBe("timeout");
    expect(result.ok || result.error.message).toContain("defillama");
  });

  it("never fabricates data on timeout — the timeout result carries no `data` field at all", async () => {
    const { promise } = deferred<ProviderResult<{ tvl: number }>>();
    const racePromise = withBoundedWait("defillama", promise, 1_000);

    await vi.advanceTimersByTimeAsync(1_000);
    const result = await racePromise;

    expect(result.ok).toBe(false);
    expect("data" in result).toBe(false);
  });

  it("the wrapped promise keeps running after timeout — resolving it later does not throw or cause an unhandled rejection", async () => {
    const { promise, resolve } = deferred<ProviderResult<string>>();
    const racePromise = withBoundedWait("blockscout", promise, 1_000);

    await vi.advanceTimersByTimeAsync(1_000);
    const result = await racePromise;
    expect(result.ok).toBe(false);

    // The real call is still "in flight" from this function's point of view
    // — resolving it now (as the real underlying fetch eventually would,
    // populating the provider's own cache for the next request) must be
    // safe and inert from this already-settled race's perspective.
    expect(() => resolve(ok("arrived late"))).not.toThrow();
    await Promise.resolve(); // let the resolution settle
  });

  it("clears its internal timer once the real promise wins — no dangling timer fires afterward", async () => {
    const clearSpy = vi.spyOn(global, "clearTimeout");
    await withBoundedWait("blockscout", Promise.resolve(ok("fast")), 5_000);
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  it("documents current behavior: a genuinely rejecting wrapped promise still propagates as a rejection (not swallowed into a timeout-shaped result)", async () => {
    // `withBoundedWait` only bounds how long a caller waits — it is not a
    // blanket try/catch. Every real `ProviderResult`-returning export never
    // rejects in practice (see `toProviderResult`'s own doc comment), so
    // this path is not expected to occur in production; this test exists
    // so that boundary is explicit and intentional, not an unstated
    // assumption.
    const rejecting = Promise.reject(new Error("should never happen in real usage"));
    rejecting.catch(() => {}); // avoid an unrelated unhandled-rejection warning for this deliberately-rejecting fixture
    await expect(withBoundedWait("blockscout", rejecting as Promise<ProviderResult<string>>, 5_000)).rejects.toThrow();
  });
});
