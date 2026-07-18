/**
 * Per-section pure builders for the Daily Brief pipeline (`engine.ts`).
 * Every function here takes the same already-fetched `IntelligenceAlert[]`
 * (or the `MarketStats` derived from it) and returns one section of the
 * `DailyBrief` model — no fetching, no caching, no side effects. Each
 * highlight/opportunity reuses the source `IntelligenceAlert`'s own real
 * `headline`/`summary` rather than generating new prose, since the
 * Intelligence Engine (`lib/alerts/intelligence/summary.ts`) already did
 * that work honestly; this layer only selects and formats.
 */

import { NARRATIVE_TYPES } from "@/lib/alerts/intelligence/types";
import type { IntelligenceAlert, NarrativeType } from "@/lib/alerts/intelligence/types";
import type { BriefHighlight, BriefNarrativeTrend, BriefOpportunity } from "@/lib/brief/types";

const TOP_OPPORTUNITY_COUNT = 3;
const HIGHLIGHT_COUNT = 5;
/** Narratives read as a real, positive "opportunity" — deliberately excludes `governance-active`/`stable` (procedural/neutral) and `decline`/`security-risk` (not opportunities). */
const OPPORTUNITY_NARRATIVES: NarrativeType[] = ["growth", "accumulation", "development-active"];

function emptyNarrativeCounts(): Record<NarrativeType, number> {
  return Object.fromEntries(NARRATIVE_TYPES.map((narrative) => [narrative, 0])) as Record<NarrativeType, number>;
}

export type MarketStats = {
  narrativeCounts: Record<NarrativeType, number>;
  averageConfidence: number;
  highestScore: number;
  projectCount: number;
};

/**
 * The same aggregation `lib/hooks/useExecutiveSummary.ts` performs for the
 * Alerts page — intentionally reimplemented here rather than imported: that
 * hook is React-bound (`useMemo` over `useIntelligenceAlerts()`) and this
 * module must stay callable outside a component, with no dependency on
 * `lib/hooks`.
 */
export function computeMarketStats(alerts: IntelligenceAlert[]): MarketStats {
  const narrativeCounts = emptyNarrativeCounts();
  let confidenceTotal = 0;
  let highestScore = 0;

  for (const alert of alerts) {
    narrativeCounts[alert.narrative] += 1;
    confidenceTotal += alert.confidence;
    if (alert.score > highestScore) highestScore = alert.score;
  }

  return {
    narrativeCounts,
    averageConfidence: alerts.length === 0 ? 0 : Math.round(confidenceTotal / alerts.length),
    highestScore,
    projectCount: alerts.length,
  };
}

function byScoreDescending(a: IntelligenceAlert, b: IntelligenceAlert): number {
  return b.score - a.score;
}

function toHighlight(alert: IntelligenceAlert): BriefHighlight {
  return {
    projectId: alert.projectId,
    projectName: alert.projectName,
    headline: alert.headline,
    detail: alert.summary,
    severity: alert.severity,
  };
}

/**
 * "Market Summary" bullet lines. Deliberately avoids the word "increased"
 * for governance activity (unlike the PR brief's own worked example): a
 * trend word implies a comparison against a prior period, and this
 * pipeline has no persisted history to compare against (`storage.ts` is a
 * pure runtime cache, not a time series) — stating a real current count
 * honestly is preferred over implying a trend that was never measured.
 */
export function buildMarketSummarySection(stats: MarketStats): string[] {
  const lines: string[] = [];

  const growthCount = stats.narrativeCounts.growth;
  if (growthCount > 0) {
    lines.push(`${growthCount} Growth narrative${growthCount === 1 ? "" : "s"} detected`);
  }

  const securityCount = stats.narrativeCounts["security-risk"];
  if (securityCount > 0) {
    lines.push(`${securityCount} Security Risk${securityCount === 1 ? "" : "s"} flagged`);
  }

  const governanceCount = stats.narrativeCounts["governance-active"];
  if (governanceCount > 0) {
    lines.push(`Governance activity detected across ${governanceCount} project${governanceCount === 1 ? "" : "s"}`);
  }

  if (stats.projectCount > 0) {
    lines.push(`Average confidence ${stats.averageConfidence}%`);
  }

  return lines;
}

/** Highest-scored projects among the real "opportunity" narratives, capped at `TOP_OPPORTUNITY_COUNT`. */
export function buildTopOpportunities(alerts: IntelligenceAlert[]): BriefOpportunity[] {
  return alerts
    .filter((alert) => OPPORTUNITY_NARRATIVES.includes(alert.narrative))
    .sort(byScoreDescending)
    .slice(0, TOP_OPPORTUNITY_COUNT)
    .map((alert) => ({
      projectId: alert.projectId,
      projectName: alert.projectName,
      headline: alert.headline,
      reason: alert.summary,
      score: alert.score,
      confidence: alert.confidence,
      narrative: alert.narrative,
      timestamp: alert.timestamp,
    }));
}

/** Real `security-risk` narrative projects — the Brief's "Projects At Risk" equivalent, scoped to genuine security/contract events rather than every negative-reading narrative. */
export function buildSecurityHighlights(alerts: IntelligenceAlert[]): BriefHighlight[] {
  return alerts
    .filter((alert) => alert.narrative === "security-risk")
    .sort(byScoreDescending)
    .slice(0, HIGHLIGHT_COUNT)
    .map(toHighlight);
}

export function buildGovernanceHighlights(alerts: IntelligenceAlert[]): BriefHighlight[] {
  return alerts
    .filter((alert) => alert.narrative === "governance-active")
    .sort(byScoreDescending)
    .slice(0, HIGHLIGHT_COUNT)
    .map(toHighlight);
}

export function buildDevelopmentHighlights(alerts: IntelligenceAlert[]): BriefHighlight[] {
  return alerts
    .filter((alert) => alert.narrative === "development-active")
    .sort(byScoreDescending)
    .slice(0, HIGHLIGHT_COUNT)
    .map(toHighlight);
}

/** TVL is a signal CATEGORY, not a narrative — this reads `categories` (which can co-occur with any narrative), unlike the narrative-scoped highlight builders above. */
export function buildTvlHighlights(alerts: IntelligenceAlert[]): BriefHighlight[] {
  return alerts
    .filter((alert) => alert.categories.includes("tvl"))
    .sort(byScoreDescending)
    .slice(0, HIGHLIGHT_COUNT)
    .map(toHighlight);
}

/**
 * One row per narrative actually present today, sorted by how many
 * projects show it (then by average score) — "emerging" here means
 * "currently detected across the Watchlist," not a trend against a prior
 * period, for the same no-persisted-history reason `buildMarketSummarySection`
 * documents above.
 */
export function buildEmergingNarratives(alerts: IntelligenceAlert[]): BriefNarrativeTrend[] {
  return NARRATIVE_TYPES.map((narrative) => {
    const matching = alerts.filter((alert) => alert.narrative === narrative);
    const averageScore =
      matching.length === 0 ? 0 : Math.round(matching.reduce((sum, alert) => sum + alert.score, 0) / matching.length);
    return { narrative, count: matching.length, averageScore };
  })
    .filter((trend) => trend.count > 0)
    .sort((a, b) => b.count - a.count || b.averageScore - a.averageScore);
}

/**
 * Deterministic, threshold-based recommendation sentences — every line is
 * gated on a real computed condition, never emitted unconditionally or at
 * random.
 */
export function buildRecommendations(
  stats: MarketStats,
  securityHighlights: BriefHighlight[],
  governanceHighlights: BriefHighlight[]
): string[] {
  const recommendations: string[] = [];

  if (stats.projectCount === 0) {
    recommendations.push("No scoreable signals for your Watchlist right now — check back after more activity accrues.");
    return recommendations;
  }

  if (securityHighlights.length > 0) {
    recommendations.push("Review security-flagged projects before taking new positions.");
  }

  if (stats.narrativeCounts.growth >= 2) {
    recommendations.push("Multiple growth signals detected — consider deeper diligence on the top-scoring projects.");
  }

  if (governanceHighlights.length > 0) {
    recommendations.push("Active governance proposals detected — review before votes close.");
  }

  if (stats.averageConfidence >= 80) {
    recommendations.push("Confidence is high across today's signals — multiple independent sources corroborate them.");
  }

  return recommendations;
}
