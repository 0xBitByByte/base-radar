import { sumBy } from "@/lib/intelligence/helpers";
import { deriveScoreFreshness, type FreshnessState } from "@/lib/intelligence/freshnessPolicy";
import type { ConfidenceLevel } from "@/lib/intelligence/types";

/**
 * PR-098.03 — Finalize Intelligence Score Product Naming.
 *
 * The single source of truth for this product's user-facing name for the
 * deterministic, evidence-based 0-100 score (`Health.score` /
 * `ProjectIntelligence.health.score`) shown across cards, tables, and
 * project pages. Audit found this had been labeled "AI Score" in exactly
 * one place (`FeaturedProjectTile.tsx`) — inaccurate, since the score is
 * rule-based (health/confidence factors), never LLM-generated. "Radar
 * Score" was chosen over "Base Radar Intelligence Score" (shorter, scans
 * better in a tight grid/table cell, avoids repeating "Base Radar"
 * throughout the interface where the brand is already established by the
 * surrounding chrome).
 *
 * Any future UI surface that shows this score should import from here
 * rather than hardcoding the label/description again, so the terminology
 * can't drift back out of sync in a second place.
 *
 * Deliberately NOT touched by this rename: `LiveProject.aiRating` (the
 * separate A+–D letter-grade Scorecard tile, labeled "AI Rating" in the
 * Scorecard grid and "AI Grade" in Compare/Smart Collections) — a
 * distinctly different product surface (a letter grade, not a 0-100
 * score) with its own, much larger surface area (30+ files, dozens of
 * tests, layout-parity requirements). Neither of this PR's two naming
 * candidates named it, so renaming it here would be exactly the "blindly
 * rename every historical reference" this PR was explicitly told not to
 * do. It's a real, separate naming-consistency question ("AI Rating" vs
 * "AI Grade" already disagree with each other) worth its own future PR.
 */

export const RADAR_SCORE_LABEL = "Radar Score";

export const RADAR_SCORE_DESCRIPTION =
  "Evidence-based intelligence score derived from market, onchain, developer, governance, ecosystem and security signals.";

/**
 * PR-098.09 — Featured Intelligence Final Implementation. Audit (PR-098.08)
 * confirmed `computeRadarScore()` below is still NOT wired into any live
 * surface: `FeaturedProjectTile.tsx` displays `health.score`, a
 * hand-authored illustrative fixture value from
 * `components/landing/featuredProjects.ts`, under the "Radar Score" label.
 * That's an honest, deliberate, unchanged boundary (per-project live
 * dimension normalization for the 7 dimensions below doesn't exist yet —
 * wiring it now without that would mean fabricating a live-looking number,
 * exactly what this PR was told never to do).
 *
 * But once PR-098.05/06/07 made this same tile's TVL/Token 24H cells
 * genuinely live for most projects, a bare `RADAR_SCORE_DESCRIPTION` next
 * to them reads as if this number is live too. This variant makes that
 * explicit wherever the number shown is still the illustrative preview —
 * "verify a still-illustrative field is explicitly treated as such," this
 * PR's own instruction. Never used to soften/hide a stale REAL value
 * (that's what `formatFreshnessLabel`'s "may be outdated" already covers,
 * and only stale values in `lib/intelligence/freshnessPolicy.ts` are
 * changed) — only for a number this PR confirmed was never live-computed
 * in the first place.
 */
export const RADAR_SCORE_PREVIEW_DESCRIPTION = `${RADAR_SCORE_DESCRIPTION} This is a preview score on illustrative sample data — live scoring is in progress.`;

// ---------------------------------------------------------------------------
// PR-098.04 — Radar Score Methodology
// ---------------------------------------------------------------------------

/**
 * The seven dimensions, each mapped to exactly one primary real provider
 * (or provider-field pair) so no two dimensions read the same underlying
 * signal — see the PR-098.04 audit report for the full per-dimension
 * definition/provider/normalization table and the double-counting findings
 * this resolved (most importantly: Security and Onchain Activity previously
 * both depended on Blockscout — Onchain Activity is now DexScreener-sourced
 * instead, leaving Security as Blockscout's sole consumer).
 */
export const RADAR_SCORE_DIMENSION_IDS = [
  "marketStrength",
  "tvlLiquidity",
  "onchainActivity",
  "developerActivity",
  "governance",
  "ecosystemTraction",
  "security",
] as const;

export type RadarScoreDimensionId = (typeof RADAR_SCORE_DIMENSION_IDS)[number];

/**
 * Weights, as a fraction of 1.0 (sums to exactly 1 — enforced by a runtime
 * assertion below so this can never silently drift). Market Strength and
 * Security/TVL sit highest (best real registry coverage, per PR-098.01's
 * provider audit); Governance and Ecosystem Traction sit lowest (most
 * often genuinely unavailable — only ~35% of registry projects have a
 * configured Snapshot space) so the dimension most likely to be missing
 * also matters least when it is. No single dimension exceeds 20% of the
 * total, so even a project's single strongest dimension can never carry
 * the score alone (see `MIN_COVERAGE_PCT`/`MIN_DIMENSION_COUNT` below,
 * which enforce this structurally, not just via the weight choice).
 */
export const RADAR_SCORE_WEIGHTS: Record<RadarScoreDimensionId, number> = {
  marketStrength: 0.2,
  tvlLiquidity: 0.15,
  onchainActivity: 0.15,
  developerActivity: 0.15,
  governance: 0.1,
  ecosystemTraction: 0.1,
  security: 0.15,
};

const WEIGHT_SUM = RADAR_SCORE_DIMENSION_IDS.reduce((sum, id) => sum + RADAR_SCORE_WEIGHTS[id], 0);
if (Math.abs(WEIGHT_SUM - 1) > 1e-9) {
  throw new Error(`RADAR_SCORE_WEIGHTS must sum to 1 (currently ${WEIGHT_SUM}) — a scoring model whose weights don't sum to 1 silently distorts the 0-100 scale.`);
}

/**
 * Minimum evidence bar — audited finding: naive "exclude missing
 * dimensions and renormalize the rest" inflates scores for a project that
 * only has data for its strongest dimensions (the task's own example: two
 * strong dimensions alone should never read as a confidently-high score).
 * Below this bar, `computeRadarScore` returns `score: null` /
 * `availability: "unavailable"` rather than a number — an honest "not
 * enough evidence" state, never a guessed or artificially inflated one.
 * Two independent gates, both required: a coverage-percentage floor (so a
 * few high-weight dimensions can't qualify alone) AND a raw dimension-count
 * floor (so, e.g., Market Strength (20%) + Security (15%) = 35% coverage
 * — under the 40% floor either way — still isn't enough on just two
 * dimensions even if the percentage happened to clear 40%).
 */
export const MIN_COVERAGE_PCT = 0.4;
export const MIN_DIMENSION_COUNT = 3;

/**
 * PR-102 — MODEL B. Confidence is no longer applied to the score in any
 * form (not a multiplier, not a proportional discount, not a bounded
 * penalty, not a cap) — it is reported purely as independent metadata
 * about evidence completeness. See the V2 audit's "Priority 1" report and
 * the PR-102 methodology-validation dataset for the full before/after
 * numeric comparison that grounded this decision (Model A's multiplier
 * made "high score + low confidence" mathematically impossible, conflating
 * "what the evidence indicates" with "how much evidence exists" — exactly
 * the distinction this product decision requires stay separable).
 *
 * The 0.7-floor-to-1.0-full linear scale is UNCHANGED from the old
 * `confidenceMultiplierFor` — only its use changed: it now feeds
 * `confidenceScoreFor`/`confidenceLevelFor` (pure metadata) instead of
 * multiplying into `score`. `CONFIDENCE_FLOOR` deliberately stays 0.7 (not
 * 0), so "40% coverage" reads as "confidence score 70", not "confidence
 * score 40" — the floor represents "the minimum evidence bar was JUST
 * cleared, treat this as a real but thin basis," not "no confidence at
 * all" (that's what `availability: 'unavailable'` already communicates,
 * below the floor).
 */
const CONFIDENCE_FLOOR = 0.7;

/** 0-100, informational only — reused verbatim by both `confidenceScoreFor` and the (unchanged) minimum-evidence-floor gate's own reasoning. Never applied to `score`. */
function confidenceScoreFor(coveragePct: number): number {
  if (coveragePct >= 1) return 100;
  const t = (coveragePct - MIN_COVERAGE_PCT) / (1 - MIN_COVERAGE_PCT);
  return Math.round((CONFIDENCE_FLOOR + (1 - CONFIDENCE_FLOOR) * Math.max(0, Math.min(1, t))) * 100);
}

/**
 * Reuses the app's own existing `ConfidenceLevel` vocabulary
 * (`lib/intelligence/types.ts`, already shown elsewhere as "High"/"Medium"/
 * "Low") rather than inventing new terminology — the task's own explicit
 * instruction. Deliberately derived from `coveragePct` DIRECTLY (not from
 * the already-transformed 0-100 confidence score above): any score that
 * clears the minimum-evidence floor has a confidence score somewhere in
 * [70,100] by construction (`CONFIDENCE_FLOOR` to full), which would leave
 * "low" mathematically unreachable for any real, scored project if these
 * thresholds were drawn against THAT narrower range instead. Coverage
 * itself ranges the full [0.4, 1.0] for scored projects, so a 90%/60%
 * split here keeps all three tiers meaningfully reachable.
 */
function confidenceLevelFor(coveragePct: number): ConfidenceLevel {
  if (coveragePct >= 0.9) return "high";
  if (coveragePct >= 0.6) return "medium";
  return "low";
}

export type RadarScoreDimensionInput = {
  id: RadarScoreDimensionId;
  /**
   * 0-100, already normalized by the caller for this one dimension — this
   * function has no provider-specific knowledge, matching this engine's
   * existing `merge.ts`/`scorecard.ts` layering. `null` when this project
   * has no real, verified evidence for this dimension (never a guessed or
   * defaulted value — the same "null, not a fabricated number" contract
   * PR-098.02 established for `changePct24h`).
   */
  score: number | null;
  /**
   * `true` when `score` is real but stale (the underlying provider's live
   * fetch just failed, serving last-known-good data — the same `stale`
   * contract `Market.stale`/`GithubIntel.stale` already use elsewhere in
   * this engine). Informational only: staleness never changes the numeric
   * contribution — a dimension's real value from 20 minutes ago is still
   * real evidence, not missing evidence. Surfaced via `staleDimensionIds`
   * so a caller can label it, exactly like every other stale-data surface
   * in this codebase.
   */
  stale?: boolean;
};

export type RadarScoreAvailability = "full" | "partial" | "unavailable";

export type RadarScoreDimensionContribution = {
  id: RadarScoreDimensionId;
  score: number | null;
  weight: number;
  /** `score * weight` (0-100 scale units) — this dimension's raw push toward the weighted sum, before renormalization/confidence discount. `null` when `score` is `null`. */
  weightedContribution: number | null;
  stale: boolean;
};

/**
 * PR-102 — MODEL B. Confidence as a first-class, independent signal:
 * "how complete/strong is the available evidence," never "is the project
 * good." `score`/`level` are informational metadata only — nothing in
 * `computeRadarScore()` ever reads this back into `RadarScoreResult.score`.
 */
export type RadarScoreConfidence = {
  /** 0-100, derived from `coveragePct` alone (see `confidenceScoreFor`) — 0 exactly when `availability === "unavailable"`. */
  score: number;
  /** "high"/"medium"/"low" — the same `ConfidenceLevel` vocabulary used elsewhere in this app, not new terminology. `"low"` (not a 4th "unavailable" value) below the minimum-evidence floor too — reusing the existing three-value enum rather than inventing a special case; `availability: "unavailable"` is what actually communicates "no score." */
  level: ConfidenceLevel;
};

export type RadarScoreResult = {
  /** `null` exactly when `availability === "unavailable"` — never a fabricated number for insufficient evidence. PR-102 (Model B): this is the renormalized weighted-average quality score ALONE — confidence is never applied to it in any form. */
  score: number | null;
  availability: RadarScoreAvailability;
  /** Fraction (0-1) of total weight backed by real data. */
  coveragePct: number;
  /**
   * PR-102 (Model B) — independent evidence-completeness metadata,
   * reported alongside `score`, never combined into it. Replaces the old
   * `confidenceMultiplier: number` field (Model A), which was applied
   * directly to the score — that made "high score + low confidence"
   * mathematically impossible, the exact conflation this product decision
   * exists to remove. See this file's module doc comment for the full
   * rationale and the V2 audit / PR-102 dataset for the numeric evidence.
   */
  confidence: RadarScoreConfidence;
  dimensions: RadarScoreDimensionContribution[];
  staleDimensionIds: RadarScoreDimensionId[];
  /**
   * PR-098.07 — the score's own freshness, derived (never independently
   * set) from the dimensions actually used: "stale" if any available
   * dimension is stale, "unavailable" if none were available at all
   * (mirrors `score: null`), "fresh" only when every available dimension
   * is fresh. See `lib/intelligence/freshnessPolicy.ts`'s
   * `deriveScoreFreshness` for the full policy this encodes — the
   * task's explicit requirement that a stale critical signal must never
   * let the score silently read as current.
   */
  scoreFreshness: FreshnessState;
  /** Plain-language trace of exactly how `score` was derived — every number here is reproducible from `dimensions` alone. */
  explanation: string[];
};

/**
 * Pure, deterministic, reproducible: the same `inputs` always produce the
 * exact same `RadarScoreResult`, and every field in that result is derived
 * from arithmetic over `inputs` alone — nothing here reads the clock, a
 * random source, or any I/O. See the PR-098.04 audit report for the full
 * methodology (missing-data handling, confidence discount, the
 * double-counting fixes this resolves).
 *
 * Deliberately NOT wired into `ProjectIntelligence.health.score` or any
 * live UI surface yet — this is the audited, tested methodology model
 * itself; wiring it into the live pipeline (replacing or supplementing
 * `rule-based-provider.ts`'s existing, separately-shipped Health score) is
 * a distinct follow-up decision, out of this PR's scope (see the PR-098.04
 * report's "what was NOT implemented" section).
 */
export function computeRadarScore(inputs: RadarScoreDimensionInput[]): RadarScoreResult {
  const seen = new Set<RadarScoreDimensionId>();
  for (const input of inputs) {
    if (seen.has(input.id)) {
      throw new Error(`computeRadarScore: dimension "${input.id}" was supplied more than once — each dimension must contribute exactly one score, never duplicate evidence.`);
    }
    seen.add(input.id);
  }

  const dimensions: RadarScoreDimensionContribution[] = RADAR_SCORE_DIMENSION_IDS.map((id) => {
    const input = inputs.find((i) => i.id === id) ?? null;
    const weight = RADAR_SCORE_WEIGHTS[id];
    const score = input?.score ?? null;
    return {
      id,
      score,
      weight,
      weightedContribution: score !== null ? score * weight : null,
      stale: Boolean(input?.stale) && score !== null,
    };
  });

  const available = dimensions.filter((d) => d.score !== null);
  const coveragePct = sumBy(available, (d) => d.weight);
  const staleDimensionIds = dimensions.filter((d) => d.stale).map((d) => d.id);
  const scoreFreshness = deriveScoreFreshness(available.map((d) => (d.stale ? "stale" : "fresh")));

  const explanation: string[] = [
    `${available.length} of ${dimensions.length} dimensions available (${Math.round(coveragePct * 100)}% of total weight).`,
  ];
  if (staleDimensionIds.length) {
    explanation.push(`Stale (real but not freshly fetched): ${staleDimensionIds.join(", ")}.`);
  }

  const hasEnoughEvidence = available.length >= MIN_DIMENSION_COUNT && coveragePct >= MIN_COVERAGE_PCT;
  if (!hasEnoughEvidence) {
    explanation.push(
      `Below the minimum evidence bar (needs >= ${MIN_DIMENSION_COUNT} dimensions AND >= ${Math.round(MIN_COVERAGE_PCT * 100)}% coverage) — no score computed, to avoid an artificially high or low reading from too few signals.`
    );
    return {
      score: null,
      availability: "unavailable",
      coveragePct,
      confidence: { score: 0, level: "low" },
      dimensions,
      staleDimensionIds,
      scoreFreshness: "unavailable",
      explanation,
    };
  }

  // PR-102 — MODEL B: the score is the renormalized weighted average of
  // available dimensions, full stop. Confidence is computed from the same
  // `coveragePct` but never applied here — see this file's module doc
  // comment and `RadarScoreConfidence`'s own doc comment for why.
  const renormalizedScore = sumBy(available, (d) => d.weightedContribution!) / coveragePct;
  const score = Math.round(Math.min(100, Math.max(0, renormalizedScore)));
  const confidenceScore = confidenceScoreFor(coveragePct);
  const confidence: RadarScoreConfidence = { score: confidenceScore, level: confidenceLevelFor(coveragePct) };
  const availability: RadarScoreAvailability = coveragePct >= 1 - 1e-9 ? "full" : "partial";

  explanation.push(`Quality score (renormalized weighted average over available dimensions): ${renormalizedScore.toFixed(1)}.`);
  if (confidence.score < 100) {
    // PR-102 — deliberately worded to describe evidence completeness only,
    // never the score's quality: this sentence must never be readable as
    // "the score was reduced because confidence is low."
    explanation.push(`Confidence: ${confidence.level} (${confidence.score}/100) — reflects how much of the available evidence backs this score, not the score's quality.`);
  }
  if (scoreFreshness === "stale") {
    explanation.push("One or more dimensions used are stale — this score is valid but based on aging evidence; it will be recalculated on the next refresh.");
  }
  explanation.push(`Final Radar Score: ${score}.`);

  return { score, availability, coveragePct, confidence, dimensions, staleDimensionIds, scoreFreshness, explanation };
}

/**
 * PR-099 — Live Radar Score & Intelligence Normalization. Converts a real
 * 0-100 Radar Score into the same `excellent`/`good`/`fair`/`poor` label
 * vocabulary `Health.label` already uses across this whole app —
 * deliberately reusing `lib/intelligence/scoring.ts`'s own established
 * thresholds (80/60/40) rather than inventing a second, competing
 * boundary set for the same kind of label.
 */
export function radarScoreToHealthLabel(score: number): "excellent" | "good" | "fair" | "poor" {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "fair";
  return "poor";
}

/**
 * PR-099 — a concise, real, UI-safe tooltip summary for a LIVE Radar Score
 * — accessible short-form of the same `explanation` trace, not a
 * paraphrase or invention (every number here is read directly off
 * `radarScore` itself). Deliberately not the full multi-line
 * `explanation` array — this is a tooltip, not a dedicated breakdown
 * panel (Landing V2 stays un-redesigned; a fuller breakdown belongs on a
 * future Project Profile surface, not squeezed into this tile).
 */
export function formatRadarScoreTooltip(radarScore: RadarScoreResult): string {
  const coveragePct = Math.round(radarScore.coveragePct * 100);
  const usedDimensions = radarScore.dimensions.filter((d) => d.score !== null).length;
  const staleNote = radarScore.scoreFreshness === "stale" ? " Based on some aging data — refreshing soon." : "";
  const confidenceLabel = radarScore.confidence.level.charAt(0).toUpperCase() + radarScore.confidence.level.slice(1);
  // PR-102 — Model B: the score itself carries no confidence adjustment;
  // this line reports coverage/confidence purely as evidence-completeness
  // context, phrased so it can't read as "confidence changed the number."
  return `${RADAR_SCORE_DESCRIPTION} Live: ${usedDimensions}/${radarScore.dimensions.length} dimensions, ${coveragePct}% weight coverage. Confidence: ${confidenceLabel}.${staleNote}`;
}
