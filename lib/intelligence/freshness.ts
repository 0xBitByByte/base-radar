/**
 * Computes the `Freshness` section: how current the live sources behind a
 * `ProjectIntelligence` record are, as of `generatedAt`. Pure function —
 * takes an already-built `ProjectSources` bundle and a timestamp, no I/O
 * and no wall-clock reads of its own (so it's deterministic given its
 * inputs).
 */

import { SOURCE_TO_PROVIDER, sourceKeys } from "@/lib/intelligence/sources";
import type { Freshness, FreshnessLevel, ProjectSources } from "@/lib/intelligence/types";
import type { ProviderName } from "@/lib/providers/common/types";

// Intentionally coarse, global thresholds rather than per-provider ones
// (provider cache windows range from 20s to 10 minutes — see
// docs/API.md). Tune once real usage shows these need to be tighter or
// looser.
const FRESH_THRESHOLD_MS = 5 * 60_000;
const AGING_THRESHOLD_MS = 30 * 60_000;

export function computeFreshness(sources: ProjectSources, generatedAt: string): Freshness {
  const now = new Date(generatedAt).getTime();
  const ageMsBySource: Partial<Record<ProviderName, number>> = {};
  const liveFetchTimestamps: number[] = [];

  for (const key of sourceKeys(sources)) {
    const slice = sources[key];
    if (slice.status !== "live" || !slice.fetchedAt) continue;

    const fetchedAtMs = new Date(slice.fetchedAt).getTime();
    ageMsBySource[SOURCE_TO_PROVIDER[key]] = now - fetchedAtMs;
    liveFetchTimestamps.push(fetchedAtMs);
  }

  if (!liveFetchTimestamps.length) {
    return { newestSourceAt: null, oldestSourceAt: null, overall: "unknown", ageMsBySource };
  }

  const newest = Math.max(...liveFetchTimestamps);
  const oldest = Math.min(...liveFetchTimestamps);
  const maxAgeMs = now - oldest;

  const overall: FreshnessLevel =
    maxAgeMs <= FRESH_THRESHOLD_MS ? "fresh" : maxAgeMs <= AGING_THRESHOLD_MS ? "mixed" : "stale";

  return {
    newestSourceAt: new Date(newest).toISOString(),
    oldestSourceAt: new Date(oldest).toISOString(),
    overall,
    ageMsBySource,
  };
}
