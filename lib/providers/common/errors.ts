/**
 * Typed error hierarchy for the provider layer. Every provider surfaces
 * failures as one of these instead of a bare `Error`, so `service.ts`
 * functions (and anything that later consumes a `ProviderResult`) can
 * branch on `.code` without needing to know which provider raised it.
 */

import type { ProviderErrorInfo, ProviderName } from "@/lib/providers/common/types";

export type ProviderErrorCode = "http_error" | "timeout" | "rate_limited" | "parse_error" | "network_error";

export class ProviderError extends Error implements ProviderErrorInfo {
  readonly provider: ProviderName;
  readonly code: ProviderErrorCode;
  override readonly cause?: unknown;

  constructor(provider: ProviderName, code: ProviderErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "ProviderError";
    this.provider = provider;
    this.code = code;
    this.cause = cause;
  }
}

export class ProviderHttpError extends ProviderError {
  readonly status: number;

  constructor(provider: ProviderName, status: number, message: string, cause?: unknown) {
    super(provider, "http_error", message, cause);
    this.name = "ProviderHttpError";
    this.status = status;
  }
}

export class ProviderTimeoutError extends ProviderError {
  constructor(provider: ProviderName, message = "Request timed out", cause?: unknown) {
    super(provider, "timeout", message, cause);
    this.name = "ProviderTimeoutError";
  }
}

export class ProviderRateLimitError extends ProviderError {
  constructor(provider: ProviderName, message = "Rate limit exceeded", cause?: unknown) {
    super(provider, "rate_limited", message, cause);
    this.name = "ProviderRateLimitError";
  }
}

export class ProviderParseError extends ProviderError {
  constructor(provider: ProviderName, message = "Failed to parse provider response", cause?: unknown) {
    super(provider, "parse_error", message, cause);
    this.name = "ProviderParseError";
  }
}

/**
 * Normalizes anything caught in a provider call into a `ProviderError`.
 * Passes an existing `ProviderError` through unchanged so a `client.ts`
 * call that already threw a typed error (e.g. `ProviderHttpError`) isn't
 * double-wrapped.
 */
export function toProviderError(provider: ProviderName, err: unknown): ProviderError {
  if (err instanceof ProviderError) return err;
  if (err instanceof Error && err.name === "AbortError") {
    return new ProviderTimeoutError(provider, "Request timed out", err);
  }
  const message = err instanceof Error ? err.message : "Unknown provider error";
  return new ProviderError(provider, "network_error", message, err);
}
