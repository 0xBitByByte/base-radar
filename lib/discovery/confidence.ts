/**
 * PR-053 — Discovery Confidence Model (Task 6). Real, evidence-weighted
 * score for a deduplicated candidate — replaces the flat, source-only
 * `CandidateProject.confidence` (PR-039's `SOURCE_CONFIDENCE[source]`,
 * unchanged and still the starting baseline here) with a genuine
 * per-candidate assessment, following the same "neutral baseline + real
 * signal deltas, clamped 0-100" shape `lib/intelligence/confidence.ts`
 * already established for registry-project confidence — a deliberately
 * familiar pattern for anyone who already knows that module, not a new
 * invented shape.
 *
 * Every signal below is checked against real, already-computed evidence
 * (the candidate's own fields, `dedupe.ts`'s source list, `enrich.ts`'s
 * evidence) — never a guess, and never silently assumed present.
 * `Snapshot`/governance evidence is included in the model (per the
 * brief's own example signal list) but is honestly always absent today —
 * no discovery source surfaces a Snapshot space (see docs/
 * DISCOVERY_ENGINE.md's provider table) — this factor exists for when a
 * future source changes that, not to pad the score now.
 */

import type { DeduplicatedCandidate } from "@/lib/discovery/dedupe";
import type { EnrichmentEvidence } from "@/lib/discovery/enrich";
import type { RegistryMatch } from "@/lib/discovery/registryMatch";

export type DiscoveryConfidenceLevel = "high" | "medium" | "low";

export type DiscoveryConfidence = {
  /** 0-100, clamped. */
  score: number;
  level: DiscoveryConfidenceLevel;
  /** Plain-English, one line per signal that actually contributed — never a signal that wasn't present. */
  factors: string[];
};

const SIGNAL_POINTS = {
  officialWebsite: 10,
  coingeckoId: 15,
  defillamaSlug: 8,
  github: 15,
  contract: 20,
  snapshot: 15,
  multipleProviderAgreement: 20,
  registryMatch: 10,
  liveMarketOrTvlData: 10,
} as const;

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function computeDiscoveryConfidence(
  deduped: DeduplicatedCandidate,
  registryMatch: RegistryMatch,
  evidence: EnrichmentEvidence
): DiscoveryConfidence {
  const candidate = deduped.primary;
  const factors: string[] = [];
  let score = candidate.confidence;
  factors.push(`Source trust baseline (${candidate.source}): ${candidate.confidence}`);

  if (candidate.website) {
    score += SIGNAL_POINTS.officialWebsite;
    factors.push(`Official website present (+${SIGNAL_POINTS.officialWebsite})`);
  }
  if (candidate.coingeckoId) {
    score += SIGNAL_POINTS.coingeckoId;
    factors.push(`Real CoinGecko id on record (+${SIGNAL_POINTS.coingeckoId})`);
  }
  if (candidate.defillamaSlug) {
    score += SIGNAL_POINTS.defillamaSlug;
    factors.push(`DefiLlama slug (best-effort) on record (+${SIGNAL_POINTS.defillamaSlug})`);
  }
  if (candidate.github) {
    score += SIGNAL_POINTS.github;
    factors.push(`GitHub reference present (+${SIGNAL_POINTS.github})`);
  }
  if (candidate.contracts.length > 0) {
    score += SIGNAL_POINTS.contract;
    factors.push(`On-chain contract address present (+${SIGNAL_POINTS.contract})`);
  }
  // Always false today — no discovery source surfaces governance data yet.
  // See this file's own header comment.
  const hasSnapshotEvidence = false;
  if (hasSnapshotEvidence) {
    score += SIGNAL_POINTS.snapshot;
    factors.push(`Snapshot governance space on record (+${SIGNAL_POINTS.snapshot})`);
  }
  if (deduped.sources.length > 1) {
    score += SIGNAL_POINTS.multipleProviderAgreement;
    factors.push(`Corroborated by ${deduped.sources.length} independent sources: ${deduped.sources.join(", ")} (+${SIGNAL_POINTS.multipleProviderAgreement})`);
  }
  if (registryMatch.type !== "new") {
    score += SIGNAL_POINTS.registryMatch;
    factors.push(`Matches an existing registry project (+${SIGNAL_POINTS.registryMatch})`);
  }
  if (evidence.hasLiveMarketData || evidence.hasLiveTvlData) {
    score += SIGNAL_POINTS.liveMarketOrTvlData;
    factors.push(`Live market or TVL data confirmed (+${SIGNAL_POINTS.liveMarketOrTvlData})`);
  }

  const clamped = clampScore(score);
  const level: DiscoveryConfidenceLevel = clamped >= 70 ? "high" : clamped >= 40 ? "medium" : "low";

  return { score: clamped, level, factors };
}
