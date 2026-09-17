import { unstable_rethrow } from "next/navigation";

import {
  ProviderCircuitOpenError,
  ProviderError,
  ProviderHttpError,
  ProviderParseError,
  ProviderTimeoutError,
  toProviderError,
} from "@/lib/providers/common/errors";
import { getStale } from "@/lib/providers/common/cache";
import { recordRequestOutcome, shouldAllowRequest } from "@/lib/providers/common/circuitBreaker";
import { recordProviderFailure, recordProviderSuccess } from "@/lib/providers/common/health";
import type { ProviderName, ProviderResult } from "@/lib/providers/common/types";

const DEFAULT_TIMEOUT_MS = 8_000;
/** Total attempts = 1 + this. Only transient failures (timeout, network error, 5xx) are retried — see `isRetryable`. */
const DEFAULT_RETRY_ATTEMPTS = 2;
const RETRY_BASE_DELAY_MS = 250;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Whether a failure is worth retrying. Rate limits and 4xx client errors
 * (bad request, unauthorized, not found) won't succeed on immediate retry —
 * only timeouts, network errors, and 5xx server errors are transient.
 */
function isRetryable(err: unknown): boolean {
  if (err instanceof ProviderHttpError) return err.status >= 500;
  if (err instanceof ProviderTimeoutError) return true;
  if (err instanceof ProviderError) return err.code === "network_error";
  return false;
}

async function fetchJsonOnce<T>(
  provider: ProviderName,
  url: string,
  init: RequestInit | undefined,
  timeoutMs: number,
  onHeaders?: (headers: Headers) => void
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { cache: "no-store", ...init, signal: controller.signal });
    // Read response headers before checking `.ok` — a rate-limited 403/429
    // still carries real, useful headers (e.g. GitHub's `x-ratelimit-*`).
    onHeaders?.(res.headers);
    if (!res.ok) {
      throw new ProviderHttpError(provider, res.status, `${provider} request failed: ${res.status} ${url}`);
    }
    try {
      return (await res.json()) as T;
    } catch (parseErr) {
      throw new ProviderParseError(provider, `Failed to parse JSON from ${url}`, parseErr);
    }
  } catch (err) {
    // Next.js signals its own control-flow (e.g. a `no-store` fetch hit
    // during a static-shell render pass throws `DynamicServerError`) by
    // throwing — it must be rethrown as-is here, before `toProviderError`
    // replaces it with a plain `ProviderError` that loses the `digest` Next
    // needs to recognize it. See `unstable_rethrow` in the Next.js docs.
    unstable_rethrow(err);
    throw toProviderError(provider, err);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fetches and parses JSON with a hard timeout and bounded retry,
 * normalizing every failure mode (non-2xx status, malformed JSON, network
 * error, timeout) into a `ProviderError` subtype. Every provider's
 * `client.ts` should call this instead of a bare `fetch`, so `service.ts`
 * only ever has one error shape to handle regardless of which provider
 * it's calling.
 *
 * Retries with exponential backoff (250ms, 500ms, ...) only on transient
 * failures — a rate limit or 4xx response fails immediately since retrying
 * won't help.
 *
 * Always requests `cache: "no-store"` (overridable via `init`) — this
 * layer owns freshness itself via `common/cache.ts`'s explicit TTLs, so it
 * deliberately opts out of Next.js's own implicit fetch caching rather
 * than layering two independent cache policies on top of each other.
 */
export async function fetchJson<T>(
  provider: ProviderName,
  url: string,
  init?: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
  retries: number = DEFAULT_RETRY_ATTEMPTS,
  /** PR-074 REVIEW #11 — lets a provider's `client.ts` inspect real response headers (e.g. GitHub's `x-ratelimit-*`) without every provider needing its own fetch wrapper. */
  onHeaders?: (headers: Headers) => void
): Promise<T> {
  // V1-PHASE-2 (ADR V1-BLOCKER-001) — the circuit breaker gate. Checked once,
  // here, before this call's own retry loop even starts — never inside
  // `fetchJsonOnce` (that would gate each individual retry attempt
  // separately, the wrong unit — see `circuitBreaker.ts`'s own doc comment).
  // When open, this throws before any network attempt is made and never
  // touches `recordRequestOutcome` — a skipped call is not itself a new
  // failure to count.
  if (!shouldAllowRequest(provider)) {
    throw new ProviderCircuitOpenError(provider);
  }

  for (let attempt = 0; ; attempt++) {
    try {
      const result = await fetchJsonOnce<T>(provider, url, init, timeoutMs, onHeaders);
      // One outcome per logical `fetchJson()` call, recorded exactly once —
      // never once per raw retry attempt, matching the ADR's own explicit
      // "retries occur first, breaker observes only the final outcome" rule.
      recordRequestOutcome(provider, "success");
      return result;
    } catch (err) {
      if (attempt >= retries || !isRetryable(err)) {
        // `isRetryable` is reused unmodified as the breaker's own failure
        // classifier too — the two questions ("is this worth retrying?" and
        // "does this count as evidence the provider is down?") resolve to
        // the exact same set of conditions (timeout/network_error/5xx),
        // confirmed by direct comparison against the ADR's required failure
        // table: a 404/429/parse_error is already excluded from retries by
        // this same predicate, and must also never trip the breaker.
        if (isRetryable(err)) recordRequestOutcome(provider, "failure");
        throw err;
      }
      await delay(RETRY_BASE_DELAY_MS * 2 ** attempt);
    }
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Parses a `0x`-prefixed hex string (as returned by JSON-RPC) into a number. */
export function hexToNumber(hex: string): number {
  return Number(BigInt(hex));
}

/**
 * Runs `fn` and wraps the outcome as a `ProviderResult<T>` — success tagged
 * with the provider name and a fetch timestamp, failure normalized via
 * `toProviderError`. Every `service.ts` export should be a thin call to
 * this rather than repeating its own try/catch, so the success/failure
 * envelope shape is defined once for the whole provider layer.
 *
 * Also records the outcome in `common/health.ts`'s per-provider tracker —
 * every provider call goes through this function, so health tracking
 * happens automatically without each `service.ts` instrumenting itself.
 */
export async function toProviderResult<T>(
  provider: ProviderName,
  fn: () => Promise<T>
): Promise<ProviderResult<T>> {
  try {
    const data = await fn();
    const fetchedAt = nowIso();
    recordProviderSuccess(provider, fetchedAt);
    return { ok: true, data, source: provider, fetchedAt };
  } catch (err) {
    // Defense in depth: `fn` isn't necessarily `fetchJson` (e.g. cache-layer
    // code could call a Next API directly) — same rethrow requirement as
    // `fetchJsonOnce` above.
    unstable_rethrow(err);
    const providerError = toProviderError(provider, err);
    recordProviderFailure(provider, providerError.message);
    // `providerError` is a `ProviderError` instance (extends `Error`). Any
    // `Promise` resolving to a value containing a live `Error` instance gets
    // its message silently redacted by React's Flight serializer the moment
    // it crosses into a "use client" component via `use()` — production
    // builds replace it with a generic "Server Components render" message,
    // discarding the real, specific reason this whole layer exists to
    // surface. Spreading into a plain object keeps the same
    // `ProviderErrorInfo` shape without the `Error` prototype, so it
    // serializes untouched.
    return { ok: false, source: provider, error: { code: providerError.code, message: providerError.message } };
  }
}

/**
 * Final Production Readiness PR — extends the graceful-degradation pattern
 * `CoinGecko`'s `getMarketsByIds`/GitHub's `getRepoStats` already prove out
 * (see `types.ts`'s `ProviderSuccess.stale` doc comment, which already
 * documents this as the intended cross-provider design) to any other
 * `service.ts` call, without each one repeating the same
 * "if failed, check `getStale`, re-tag as stale" block by hand.
 *
 * Call with the same `cacheKey` passed to the `getOrSet` inside `fn`, on
 * the `ProviderResult` `toProviderResult(fn)` already produced. A genuine
 * failure with no prior successful fetch for that key passes through
 * unchanged (`getStale` returns `undefined`) — this never fabricates data
 * for a real first-ever failure, only degrades an already-proven-good read.
 */
export function withStaleFallback<T>(provider: ProviderName, cacheKey: string, result: ProviderResult<T>): ProviderResult<T> {
  if (result.ok) return result;
  const stale = getStale<T>(cacheKey);
  if (!stale) return result;
  return { ok: true, data: stale.value, source: provider, fetchedAt: stale.fetchedAt, stale: true };
}

/**
 * PR-105 — Provider-Latency Resilience. Bounds how long a caller waits for
 * a `ProviderResult` before treating it as unavailable, for calls that are
 * deferred/streamed (never on a page's awaited critical path — see the
 * `whalePromise` race in `app/dashboard/projects/[slug]/page.tsx` for the
 * existing, already-shipped precedent this generalizes, one layer down so
 * any deferred caller can reuse it instead of hand-rolling its own race).
 *
 * Never rejects — every `ProviderResult`-returning export already only
 * ever resolves (see `toProviderResult` above), and this preserves that
 * contract exactly: a timeout resolves to the same `{ok: false, error}`
 * shape a genuine provider failure already produces, so every existing
 * N/A/error-state UI path handles it unchanged. Never fabricates a value —
 * `data` is simply absent on timeout, exactly like a real failure.
 *
 * `promise` is NEVER cancelled or abandoned on timeout — it keeps running
 * in the background (every `service.ts` export this wraps already calls
 * `getOrSet`/`withStaleFallback` internally), so a slow-but-eventually-
 * successful call still populates the provider cache for the *next*
 * request even when this render stopped waiting for it. This only bounds
 * one render's wait; it never discards real in-flight work or changes what
 * gets cached.
 *
 * Deliberately not used for every provider call in this codebase — only at
 * specific deferred call sites where real, evidenced elevated tail latency
 * was measured (PR-105's own investigation: DefiLlama TVL history up to
 * ~2.5s, Blockscout token-transfers up to ~1.7s, even when each
 * individually "succeeds") and where the existing `DEFAULT_TIMEOUT_MS`
 * (8s) plus retries (up to ~24.75s worst case) had no bound at all on how
 * long that could extend a deferred Suspense boundary's resolution — never
 * applied to the awaited critical-path batch, which already has its own,
 * separate, already-proven timeout treatment (the whale race) and is
 * explicitly out of this PR's scope.
 */
export async function withBoundedWait<T>(provider: ProviderName, promise: Promise<ProviderResult<T>>, timeoutMs: number): Promise<ProviderResult<T>> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timedOut: Promise<ProviderResult<T>> = new Promise((resolve) => {
    timeoutHandle = setTimeout(
      () =>
        resolve({
          ok: false,
          source: provider,
          error: {
            code: "timeout",
            message: `Timed out after ${timeoutMs}ms waiting for ${provider} (deferred call) — the underlying request keeps running in the background for the next request's cache.`,
          },
        }),
      timeoutMs
    );
  });

  try {
    return await Promise.race([promise, timedOut]);
  } finally {
    clearTimeout(timeoutHandle);
  }
}
