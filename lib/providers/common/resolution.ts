/**
 * The Provider Resolution Engine (PR-052).
 *
 * The single place in this codebase that decides which provider's value
 * wins for a metric more than one real, integrated provider can supply.
 * Lives in the Provider Layer's shared `common/` module — a sibling of
 * `cache.ts`/`rate-limit.ts` — because deciding among providers is a
 * provider-layer concern, not an intelligence-layer one: this file has no
 * dependency on `lib/intelligence/*`, `data/projects/*`, or any
 * project-registry concept, and nothing here ever will. That keeps the
 * dependency direction the target architecture requires:
 *
 *   Registry -> Providers -> Provider Resolution -> Intelligence Service
 *
 * Both the Project Intelligence Engine (`lib/intelligence/`, Project
 * Profile + Explorer) and the dashboard/landing aggregation layer
 * (`lib/data/aggregate.ts`) import this same module — there is exactly one
 * `resolveMetric` implementation in this codebase, not two independently
 * duplicated ones. See docs/PR-052_UNIFIED_INTELLIGENCE_LAYER.md for the
 * audit that motivated consolidating this out of `lib/intelligence/`.
 *
 * Originally lived at `lib/intelligence/resolution.ts` /
 * `lib/intelligence/types.ts` (PR-050) — moved here, unchanged in
 * behavior, once a second real consumer (`lib/data/aggregate.ts`) needed
 * the exact same fallback/confidence/provenance logic. `lib/intelligence/types.ts`
 * re-exports every type below so no existing import path broke.
 */

import type { ProviderName, ProviderResult } from "@/lib/providers/common/types";

export type SourceStatus = "live" | "unavailable" | "not_configured";

/** One provider's attribution for a single data point — real status/timing/reason, never a guess. */
export type SourceAttribution = {
  provider: ProviderName;
  status: SourceStatus;
  fetchedAt: string | null;
  /** Why the status is what it is, e.g. "No coingeckoId configured" or a real provider error message. */
  detail: string | null;
  /** PR-075 — `true` when `status: "live"` is real but stale (served from cache after a live refetch failed), mirroring `ProviderSlice.stale`. */
  stale?: boolean;
};

export type MetricConfidence = "high" | "medium" | "low";

export type ProviderAttempt = {
  provider: ProviderName;
  /** `"success"` when this provider actually supplied the value; otherwise its real `SourceAttribution` status. */
  status: SourceStatus | "success";
  /** Real reason this provider didn't supply the value — `null` when `status === "success"`. */
  detail: string | null;
};

export type MetricResolution<T> = {
  value: T | null;
  provider: ProviderName | null;
  attemptedProviders: ProviderAttempt[];
  /** `true` when the winning provider wasn't the first candidate tried. */
  fallbackUsed: boolean;
  lastUpdated: string | null;
  confidence: MetricConfidence | null;
  /** Set only when every candidate failed — a real, specific explanation, never a bare "unavailable." */
  failureReason: string | null;
};

export type MetricCandidate<T> = {
  provider: ProviderName;
  /** This provider's real value for the metric, or `null`/`undefined` when it has none to offer. */
  value: T | null | undefined;
  /** This provider's real attribution (status/detail/fetchedAt). */
  attribution: SourceAttribution;
  /** Defaults to `"high"` for the winning candidate — override for a provider whose match is inherently less exact (e.g. a fuzzy name match, or a broader-scoped fallback value). */
  confidence?: MetricConfidence;
};

/**
 * Tries each candidate in the priority order the caller supplies (highest
 * priority first) and returns the first one with a real, non-null value.
 * Every candidate is recorded in `attemptedProviders` regardless of outcome,
 * so a reader can always see the full resolution path — which providers
 * were checked, and why each one that didn't win came up empty.
 */
export function resolveMetric<T>(candidates: MetricCandidate<T>[]): MetricResolution<T> {
  const attemptedProviders = candidates.map((c) => {
    const succeeded = c.value !== null && c.value !== undefined;
    return {
      provider: c.provider,
      status: succeeded ? ("success" as const) : c.attribution.status,
      detail: succeeded ? null : c.attribution.detail,
    };
  });

  const winnerIndex = candidates.findIndex((c) => c.value !== null && c.value !== undefined);

  if (winnerIndex === -1) {
    return {
      value: null,
      provider: null,
      attemptedProviders,
      fallbackUsed: false,
      lastUpdated: null,
      confidence: null,
      failureReason:
        candidates.length > 0
          ? `No configured provider currently supplies this metric (checked: ${candidates.map((c) => c.provider).join(", ")}).`
          : "No provider is integrated for this metric.",
    };
  }

  const winner = candidates[winnerIndex];
  return {
    value: winner.value ?? null,
    provider: winner.provider,
    attemptedProviders,
    fallbackUsed: winnerIndex > 0,
    lastUpdated: winner.attribution.fetchedAt,
    confidence: winner.confidence ?? "high",
    failureReason: null,
  };
}

/**
 * Adapts a raw `ProviderResult<T>` (the envelope every `service.ts`
 * function resolves to) into the generic `SourceAttribution` a
 * `MetricCandidate` needs — the shared counterpart to
 * `lib/intelligence/sources.ts`'s project-registry-specific
 * `unavailableSlice`/`notConfiguredSlice` helpers, for callers (like
 * `lib/data/aggregate.ts`) that resolve a metric directly from a provider
 * call rather than through a `ProjectSources` match. `result` is typically
 * read straight from a `Promise.allSettled` slot — pass `null` when that
 * settled promise itself rejected or hasn't resolved.
 */
export function attributionFromProviderResult<T>(provider: ProviderName, result: ProviderResult<T> | null): SourceAttribution {
  if (!result) {
    return { provider, status: "unavailable", fetchedAt: null, detail: "No response was received from this provider." };
  }
  if (result.ok) {
    return { provider, status: "live", fetchedAt: result.fetchedAt, detail: null };
  }
  return { provider, status: "unavailable", fetchedAt: null, detail: result.error.message };
}
