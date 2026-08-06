import { unstable_rethrow } from "next/navigation";

import {
  ProviderError,
  ProviderHttpError,
  ProviderParseError,
  ProviderTimeoutError,
  toProviderError,
} from "@/lib/providers/common/errors";
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
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetchJsonOnce<T>(provider, url, init, timeoutMs, onHeaders);
    } catch (err) {
      if (attempt >= retries || !isRetryable(err)) throw err;
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
