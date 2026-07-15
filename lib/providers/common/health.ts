/**
 * Per-provider health tracking — in-memory, process-lifetime counters of
 * success/failure calls, incremented from `toProviderResult()` so every
 * provider call is tracked automatically without each `service.ts` needing
 * to instrument itself. Consumed by the Live Status Bar's "Provider
 * Status"/"API Health" fields (PR10 Part 5).
 *
 * Resets on server restart/redeploy, same lifetime as `common/cache.ts`'s
 * in-memory store — this is a lightweight operational signal, not a
 * durable metrics system.
 */

import { PROVIDER_NAMES, type ProviderName } from "@/lib/providers/common/types";

export type ProviderHealthStatus = {
  provider: ProviderName;
  successCount: number;
  failureCount: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastError: string | null;
};

function createEmptyStatus(provider: ProviderName): ProviderHealthStatus {
  return {
    provider,
    successCount: 0,
    failureCount: 0,
    lastSuccessAt: null,
    lastFailureAt: null,
    lastError: null,
  };
}

const health = new Map<ProviderName, ProviderHealthStatus>(
  PROVIDER_NAMES.map((provider) => [provider, createEmptyStatus(provider)])
);

export function recordProviderSuccess(provider: ProviderName, fetchedAt: string): void {
  const entry = health.get(provider) ?? createEmptyStatus(provider);
  entry.successCount += 1;
  entry.lastSuccessAt = fetchedAt;
  health.set(provider, entry);
}

export function recordProviderFailure(provider: ProviderName, errorMessage: string): void {
  const entry = health.get(provider) ?? createEmptyStatus(provider);
  entry.failureCount += 1;
  entry.lastFailureAt = new Date().toISOString();
  entry.lastError = errorMessage;
  health.set(provider, entry);
}

/** A provider is "healthy" if its most recent outcome (by timestamp) was a success, or it has never been called yet. */
export function isProviderHealthy(provider: ProviderName): boolean {
  const entry = health.get(provider);
  if (!entry || (entry.successCount === 0 && entry.failureCount === 0)) return true;
  if (!entry.lastFailureAt) return true;
  if (!entry.lastSuccessAt) return false;
  return entry.lastSuccessAt > entry.lastFailureAt;
}

export function getProviderHealth(provider: ProviderName): ProviderHealthStatus {
  return { ...(health.get(provider) ?? createEmptyStatus(provider)) };
}

export function getAllProviderHealth(): ProviderHealthStatus[] {
  return PROVIDER_NAMES.map((provider) => getProviderHealth(provider));
}
