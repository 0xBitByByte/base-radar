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
  timeoutMs: number
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { cache: "no-store", ...init, signal: controller.signal });
    if (!res.ok) {
      throw new ProviderHttpError(provider, res.status, `${provider} request failed: ${res.status} ${url}`);
    }
    try {
      return (await res.json()) as T;
    } catch (parseErr) {
      throw new ProviderParseError(provider, `Failed to parse JSON from ${url}`, parseErr);
    }
  } catch (err) {
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
  retries: number = DEFAULT_RETRY_ATTEMPTS
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetchJsonOnce<T>(provider, url, init, timeoutMs);
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
    const providerError = toProviderError(provider, err);
    recordProviderFailure(provider, providerError.message);
    return { ok: false, source: provider, error: providerError };
  }
}
