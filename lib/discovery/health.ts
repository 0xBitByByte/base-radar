/**
 * Per-discovery-source health tracking — in-memory, process-lifetime,
 * mirroring the pattern already established by
 * `lib/providers/common/health.ts`. Deliberately a separate module rather
 * than an extension of that one: that file tracks the six *live
 * intelligence* providers (`ProviderName` — coingecko, dexscreener,
 * defillama, blockscout, github, base), keyed to `getAllProviderHealth()`'s
 * Live Status Bar use case. This file tracks the eight *discovery sources*
 * (`DiscoverySource`) — a different set (it includes `base-ecosystem`,
 * `farcaster`, `community`, `ai-discovery`, none of which are live
 * intelligence providers) — and a different signal ("how many candidates
 * did this source surface last time"), not request success/failure alone.
 */

import { DISCOVERY_SOURCES, type DiscoverySource } from "@/data/projects/enums";

export type DiscoveryHealthStatus = "healthy" | "degraded" | "unknown";

export type DiscoveryProviderHealth = {
  source: DiscoverySource;
  status: DiscoveryHealthStatus;
  lastSuccessfulSyncAt: string | null;
  lastFailureAt: string | null;
  lastError: string | null;
  /** Candidates returned by the most recent successful `discover()` call — not a running total. */
  itemsDiscovered: number;
};

function createEmptyStatus(source: DiscoverySource): DiscoveryProviderHealth {
  return { source, status: "unknown", lastSuccessfulSyncAt: null, lastFailureAt: null, lastError: null, itemsDiscovered: 0 };
}

const health = new Map<DiscoverySource, DiscoveryProviderHealth>(
  DISCOVERY_SOURCES.map((source) => [source, createEmptyStatus(source)])
);

export function recordDiscoverySuccess(source: DiscoverySource, itemsDiscovered: number, syncedAt: string): void {
  health.set(source, {
    ...createEmptyStatus(source),
    ...health.get(source),
    status: "healthy",
    lastSuccessfulSyncAt: syncedAt,
    itemsDiscovered,
  });
}

export function recordDiscoveryFailure(source: DiscoverySource, errorMessage: string): void {
  const entry = health.get(source) ?? createEmptyStatus(source);
  health.set(source, { ...entry, status: "degraded", lastFailureAt: new Date().toISOString(), lastError: errorMessage });
}

export function getDiscoveryProviderHealth(source: DiscoverySource): DiscoveryProviderHealth {
  return { ...(health.get(source) ?? createEmptyStatus(source)) };
}

export function getAllDiscoveryProviderHealth(): DiscoveryProviderHealth[] {
  return DISCOVERY_SOURCES.map((source) => getDiscoveryProviderHealth(source));
}
