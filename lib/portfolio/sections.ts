/**
 * Per-section pure builders for the Portfolio Intelligence pipeline
 * (`engine.ts`). Most of these are deliberately thin: four of the five
 * requested sections (Top Performers, Security Risks, Governance Watch,
 * Development Momentum) are already exactly what `DailyBrief`'s own
 * sections compute, so the honest, non-duplicative implementation is to
 * select them, not re-filter `IntelligenceAlert[]` a second time. Only
 * "Projects Needing Attention" has no Daily Brief equivalent — Daily Brief
 * never surfaces `"decline"`-narrative alerts on their own — so that one
 * builder is genuinely new.
 */

import type { IntelligenceAlert } from "@/lib/alerts/intelligence/types";
import type { BriefHighlight, DailyBrief } from "@/lib/brief/types";
import type { Watchlist } from "@/lib/watchlist/types";

const DOMINANT_NARRATIVE_COUNT = 3;
const ATTENTION_COUNT = 5;

export type PortfolioStats = {
  projectCount: number;
  averageConfidence: number;
  averageScore: number;
};

function computeAverageScore(alerts: IntelligenceAlert[]): number {
  if (alerts.length === 0) return 0;
  const total = alerts.reduce((sum, alert) => sum + alert.score, 0);
  return Math.round(total / alerts.length);
}

/**
 * `projectCount`/`averageConfidence` are read straight off `Watchlist`/
 * `DailyBrief` — never recomputed. `averageScore` is the one new
 * aggregate, over the same alert set `DailyBrief.averageConfidence` is
 * already scoped to.
 */
export function computePortfolioStats(
  watchlist: Watchlist,
  dailyBrief: DailyBrief,
  alerts: IntelligenceAlert[]
): PortfolioStats {
  return {
    projectCount: watchlist.items.length,
    averageConfidence: dailyBrief.averageConfidence,
    averageScore: computeAverageScore(alerts),
  };
}

/** `DailyBrief.topOpportunities`, reused unchanged — never re-filtered from `IntelligenceAlert[]`. */
export function buildTopPerformers(dailyBrief: DailyBrief): DailyBrief["topOpportunities"] {
  return dailyBrief.topOpportunities;
}

/** `DailyBrief.securityHighlights`, reused unchanged. */
export function buildSecurityRisks(dailyBrief: DailyBrief): BriefHighlight[] {
  return dailyBrief.securityHighlights;
}

/** `DailyBrief.governanceHighlights`, reused unchanged. */
export function buildGovernanceWatch(dailyBrief: DailyBrief): BriefHighlight[] {
  return dailyBrief.governanceHighlights;
}

/** `DailyBrief.developmentHighlights`, reused unchanged. */
export function buildDevelopmentMomentum(dailyBrief: DailyBrief): BriefHighlight[] {
  return dailyBrief.developmentHighlights;
}

/** `DailyBrief.emergingNarratives`, capped to the most prominent few — "dominant," not "every narrative present." */
export function buildNarratives(dailyBrief: DailyBrief): DailyBrief["emergingNarratives"] {
  return dailyBrief.emergingNarratives.slice(0, DOMINANT_NARRATIVE_COUNT);
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
 * Real `"decline"`-narrative alerts, highest-scored (most-corroborated)
 * first — the one section genuinely derived from `IntelligenceAlert[]`
 * directly rather than reused from `DailyBrief`, since Daily Brief has no
 * "decline" section of its own.
 */
export function buildProjectsNeedingAttention(alerts: IntelligenceAlert[]): BriefHighlight[] {
  return alerts
    .filter((alert) => alert.narrative === "decline")
    .sort((a, b) => b.score - a.score)
    .slice(0, ATTENTION_COUNT)
    .map(toHighlight);
}

/**
 * Deterministic, threshold-gated recommendation sentences, referencing
 * real Watchlist project names where applicable — never generated
 * unconditionally or at random.
 */
export function buildRecommendations(
  stats: PortfolioStats,
  topPerformers: DailyBrief["topOpportunities"],
  projectsNeedingAttention: BriefHighlight[],
  securityRisks: BriefHighlight[]
): string[] {
  const recommendations: string[] = [];

  if (stats.projectCount === 0) {
    recommendations.push("Your Watchlist is empty — add a project to start building Portfolio Intelligence.");
    return recommendations;
  }

  if (securityRisks.length > 0) {
    recommendations.push(
      `Review ${securityRisks.length} security-flagged project${securityRisks.length === 1 ? "" : "s"} before taking new positions.`
    );
  }

  if (projectsNeedingAttention.length > 0) {
    const names = projectsNeedingAttention.slice(0, 3).map((item) => item.projectName);
    recommendations.push(`Investigate ${names.join(", ")} — showing real decline signals.`);
  }

  if (topPerformers.length > 0) {
    recommendations.push(`${topPerformers[0].projectName} is your strongest current signal — consider deeper diligence.`);
  }

  if (stats.averageConfidence >= 80) {
    recommendations.push("Confidence is high across your portfolio's current signals.");
  }

  return recommendations;
}
