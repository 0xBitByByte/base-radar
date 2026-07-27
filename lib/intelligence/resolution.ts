/**
 * Centralized multi-provider metric resolution (PR-050 final pass, Req 8/9).
 *
 * This is the single place in the codebase that decides which provider's
 * value wins for a metric more than one real, already-integrated provider
 * can supply. UI components never implement fallback themselves; they
 * receive a `MetricResolution<T>` (defined in `types.ts`, alongside
 * `SourceAttribution` — see that file's comment for why the type lives
 * there rather than here) and render whatever it contains.
 *
 * Deliberately never invents a fallback provider that doesn't actually
 * exist in this codebase's Provider Layer — see each call site in
 * `merge.ts` for exactly which providers are real candidates for which
 * metric, and inline comments there for metrics that genuinely have only
 * one real source today.
 */

import type { MetricConfidence, MetricResolution, SourceAttribution } from "@/lib/intelligence/types";
import type { ProviderName } from "@/lib/providers/common/types";

export type MetricCandidate<T> = {
  provider: ProviderName;
  /** This provider's real value for the metric, or `null`/`undefined` when it has none to offer. */
  value: T | null | undefined;
  /** This provider's real attribution (status/detail/fetchedAt) — reused from `sources.ts`/`ProviderSlice`, never recomputed. */
  attribution: SourceAttribution;
  /** Defaults to `"high"` for the winning candidate — override for a provider whose match is inherently less exact (e.g. a fuzzy name match). */
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
