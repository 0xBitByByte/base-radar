/**
 * V4-INTELLIGENCE-002 — Score Contributors: `positiveContributors`/
 * `negativeContributors`, generated ONLY by relabeling already-computed
 * signals (`healthBreakdown`, `warnings`, `opportunities`) — zero new
 * scoring math. Takes those three already-built arrays as input, never raw
 * assets.
 *
 * Deduplication: `healthBreakdown`'s "Concentration Risk" and "Unknown
 * Assets" items already state the same fact `warnings`' `concentration-*`/
 * `unpriced-assets`/`low-pricing-coverage` entries do, in a different
 * shape. When the health item actually fired (points > 0), the
 * corresponding warnings are excluded here so the same fact never appears
 * twice under two different card titles. Same idea for
 * `opportunities`' `good-diversification` card against `healthBreakdown`'s
 * own "Diversification" contribution.
 */

import type { PortfolioInsight, PortfolioWarning, ScoreContribution, ScoreContributor, ScoreContributorImportance } from "@/lib/portfolio-intelligence/types";

/** Health-item id → warning ids it already covers, once that health item has nonzero points. */
const HEALTH_COVERED_WARNING_IDS: Record<string, string[]> = {
  "concentration-risk": ["concentration-high", "concentration-elevated"],
  "unknown-assets": ["unpriced-assets", "low-pricing-coverage"],
};

/** Health-item id → opportunity ids it already covers, once that health item has nonzero points. */
const HEALTH_COVERED_OPPORTUNITY_IDS: Record<string, string[]> = {
  diversification: ["good-diversification"],
};

/** Absolute point thresholds, not a per-contribution relative %: a contribution's real point value is itself an honest importance signal, and every `healthBreakdown` contribution already shares the same 0-100-ish point scale (see `health.ts`'s calibration), so this stays simple rather than hardcoding each contribution's own max a second time here. */
function importanceFromPoints(points: number): ScoreContributorImportance {
  if (points >= 20) return "high";
  if (points >= 8) return "medium";
  return "low";
}

const SEVERITY_IMPORTANCE: Record<PortfolioWarning["severity"], ScoreContributorImportance> = {
  high: "high",
  elevated: "medium",
  moderate: "low",
};

function fromHealthContribution(contribution: ScoreContribution): ScoreContributor {
  return {
    id: `health:${contribution.id}`,
    title: contribution.label,
    description: contribution.explanation,
    importance: importanceFromPoints(contribution.points),
    reason: contribution.explanation,
  };
}

function fromWarning(warning: PortfolioWarning): ScoreContributor {
  return {
    id: `warning:${warning.id}`,
    title: warning.title,
    description: warning.description,
    importance: SEVERITY_IMPORTANCE[warning.severity],
    reason: warning.description,
  };
}

function fromOpportunity(insight: PortfolioInsight): ScoreContributor {
  return {
    id: `opportunity:${insight.id}`,
    title: insight.title,
    description: insight.description,
    // Opportunities carry no numeric magnitude to derive importance from (unlike health contributions' `points` or warnings' `severity`) — a fixed "medium" is an honest, non-fabricated default rather than guessing a rank this data doesn't support.
    importance: "medium",
    reason: insight.description,
  };
}

export function buildScoreContributors(
  healthBreakdown: ScoreContribution[],
  warnings: PortfolioWarning[],
  opportunities: PortfolioInsight[]
): { positiveContributors: ScoreContributor[]; negativeContributors: ScoreContributor[] } {
  const activeHealthPositive = healthBreakdown.filter((c) => c.direction === "positive" && c.points > 0);
  const activeHealthNegative = healthBreakdown.filter((c) => c.direction === "negative" && c.points > 0);

  const coveredOpportunityIds = new Set(activeHealthPositive.flatMap((c) => HEALTH_COVERED_OPPORTUNITY_IDS[c.id] ?? []));
  const coveredWarningIds = new Set(activeHealthNegative.flatMap((c) => HEALTH_COVERED_WARNING_IDS[c.id] ?? []));

  const positiveContributors: ScoreContributor[] = [
    ...activeHealthPositive.map(fromHealthContribution),
    ...opportunities.filter((o) => o.tone === "positive" && !coveredOpportunityIds.has(o.id)).map(fromOpportunity),
  ];

  const negativeContributors: ScoreContributor[] = [
    ...activeHealthNegative.map(fromHealthContribution),
    ...warnings.filter((w) => !coveredWarningIds.has(w.id)).map(fromWarning),
  ];

  return { positiveContributors, negativeContributors };
}
