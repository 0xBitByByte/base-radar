import type { IntelligenceConfidenceLevel } from "@/lib/ai-intelligence/confidence";
import type { IntelligenceImpactLevel } from "@/lib/ai-intelligence/impact";
import type { AIIntelligenceBrief } from "@/lib/ai-intelligence/types";

/**
 * Deterministic priority ranking — no ML, no randomness. Every input here
 * is a real field already on `AIIntelligenceBrief`; nothing is invented to
 * produce a score. See docs/DAILY_BRIEF_GENERATOR.md "Ranking Strategy"
 * for the full worked rationale; the weights below are a starting
 * heuristic, not a statistically validated model — same caveat as
 * `rules.ts`'s thresholds and `confidence.ts`'s derivation.
 */

const IMPACT_WEIGHT: Record<IntelligenceImpactLevel, number> = {
  informational: 1,
  moderate: 2,
  significant: 3,
  critical: 4,
};

const CONFIDENCE_WEIGHT: Record<IntelligenceConfidenceLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
  "very-high": 4,
};

/** Evidence count and source diversity both flatten out past a point — a brief with 20 signals isn't 4x as important as one with 5, it's just well-documented. Capped so neither can out-weigh `impact`, the dominant axis. */
const EVIDENCE_COUNT_CAP = 10;
const SOURCE_DIVERSITY_CAP = 5;

/** Freshness decays linearly to zero over this window, then contributes nothing — an old brief isn't penalized further, just no longer boosted for recency. */
const FRESHNESS_WINDOW_MS = 24 * 60 * 60 * 1000;

function freshnessScore(generatedAt: string, now: string): number {
  const ageMs = new Date(now).getTime() - new Date(generatedAt).getTime();
  if (ageMs <= 0) return 1;
  if (ageMs >= FRESHNESS_WINDOW_MS) return 0;
  return 1 - ageMs / FRESHNESS_WINDOW_MS;
}

/**
 * Weighted sum of the five inputs the brief names (Impact, Confidence,
 * Evidence count, Source diversity, Freshness). Impact and Confidence
 * dominate (weight 100/40) since they're the two axes
 * docs/AI_INTELLIGENCE_ENGINE.md defines as load-bearing; evidence count,
 * source diversity, and freshness are tie-breaking refinements (weight
 * 5/8/20) on top of that, never able to push a `moderate`-impact brief
 * above a `critical` one on their own.
 */
export function computePriorityScore(brief: AIIntelligenceBrief, now: string): number {
  const distinctSources = new Set(brief.supportingSignals.map((signal) => signal.source)).size;

  const impactScore = IMPACT_WEIGHT[brief.impact] * 100;
  const confidenceScore = CONFIDENCE_WEIGHT[brief.confidence.level] * 40;
  const evidenceScore = Math.min(brief.confidence.evidenceCount, EVIDENCE_COUNT_CAP) * 5;
  const diversityScore = Math.min(distinctSources, SOURCE_DIVERSITY_CAP) * 8;
  const freshness = freshnessScore(brief.generatedAt, now) * 20;

  return impactScore + confidenceScore + evidenceScore + diversityScore + freshness;
}

/**
 * Sorts briefs highest-priority first. Ties (identical score, which is
 * common — e.g. two `critical`/`very-high` briefs generated in the same
 * run) break first by `generatedAt` descending (more recent first), then
 * by `id` ascending — both real, stable fields, so the final order is
 * fully deterministic even when scores tie exactly.
 */
export function rankBriefs(briefs: AIIntelligenceBrief[], now: string): AIIntelligenceBrief[] {
  return [...briefs].sort((a, b) => {
    const scoreDiff = computePriorityScore(b, now) - computePriorityScore(a, now);
    if (scoreDiff !== 0) return scoreDiff;

    const dateDiff = new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime();
    if (dateDiff !== 0) return dateDiff;

    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}
