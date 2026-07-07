import { ProviderHttpError, ProviderParseError, toProviderError } from "@/lib/providers/common/errors";
import type { ProviderName } from "@/lib/providers/common/types";

const DEFAULT_TIMEOUT_MS = 8_000;

/**
 * Fetches and parses JSON with a hard timeout, normalizing every failure
 * mode (non-2xx status, malformed JSON, network error, timeout) into a
 * `ProviderError` subtype. Every provider's `client.ts` should call this
 * instead of a bare `fetch`, so `service.ts` only ever has one error
 * shape to handle regardless of which provider it's calling.
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
  timeoutMs: number = DEFAULT_TIMEOUT_MS
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

export function nowIso(): string {
  return new Date().toISOString();
}

/** Parses a `0x`-prefixed hex string (as returned by JSON-RPC) into a number. */
export function hexToNumber(hex: string): number {
  return Number(BigInt(hex));
}

export function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
