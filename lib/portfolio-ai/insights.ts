/**
 * V4-INTELLIGENCE-003 — AI Insights: a retiered view of
 * `intelligence.positiveContributors`/`negativeContributors`
 * (`lib/portfolio-intelligence/contributors.ts`, already deduplicated
 * against `healthBreakdown`/`warnings`/`opportunities`), plus exactly one
 * "observation"-tier entry for the portfolio's own `fingerprint`. No new
 * scoring, no re-derivation of anything `contributors.ts` already decided —
 * this module only assigns each already-built contributor to one of this
 * phase's five priority tiers and sorts the result.
 */

import { comparePriorityTier } from "@/lib/portfolio-ai/priorities";
import type { AIInsight, AIPriorityTier } from "@/lib/portfolio-ai/types";
import type { PortfolioIntelligence, ScoreContributor } from "@/lib/portfolio-intelligence/types";

/**
 * Contributor ids (from `contributors.ts`'s own `health:`/`warning:`/
 * `opportunity:` prefixing) that concern a single, already-known asset or
 * protocol — mapped to which `PortfolioIntelligence` field names it. Ids
 * not listed here (e.g. diversification, stablecoin exposure, unpriced-
 * asset counts) are honestly portfolio-wide facts with no single subject,
 * so they get no `relatedAssets` rather than a guessed one.
 */
const RELATED_ASSET_SOURCE: Record<string, "largestHolding" | "largestProtocol"> = {
  "health:concentration-risk": "largestHolding",
  "warning:concentration-high": "largestHolding",
  "warning:concentration-elevated": "largestHolding",
  "opportunity:high-concentration": "largestHolding",
  "warning:protocol-dependency": "largestProtocol",
  "opportunity:monitor-protocol-dependency": "largestProtocol",
};

function relatedAssetsFor(contributorId: string, intelligence: PortfolioIntelligence): string[] {
  const source = RELATED_ASSET_SOURCE[contributorId];
  if (!source) return [];
  const holding = source === "largestHolding" ? intelligence.largestHolding : intelligence.largestProtocol;
  return holding ? [holding.symbol] : [];
}

function toInsight(contributor: ScoreContributor, priority: AIPriorityTier, intelligence: PortfolioIntelligence): AIInsight {
  return {
    id: contributor.id,
    title: contributor.title,
    summary: contributor.description,
    importance: contributor.importance,
    reason: contributor.reason,
    relatedAssets: relatedAssetsFor(contributor.id, intelligence),
    priority,
  };
}

export function buildAIInsights(intelligence: PortfolioIntelligence): AIInsight[] {
  const insights: AIInsight[] = [];

  // Every negative contributor (health deductions + non-overlapping
  // warnings) is a risk by construction — `contributors.ts` only ever puts
  // genuinely risk-flavored signals in this array.
  for (const contributor of intelligence.negativeContributors) {
    insights.push(toInsight(contributor, "critical-risk", intelligence));
  }

  // Positive contributors split by source: an `opportunity:`-prefixed one
  // is forward-looking (something to lean into further), a `health:`-
  // prefixed one is a static, already-attained state — the real
  // distinction this phase's "major opportunities" vs. "positive
  // achievements" tiers are asking for, already knowable from the id
  // `contributors.ts` assigned rather than re-derived here.
  for (const contributor of intelligence.positiveContributors) {
    const priority: AIPriorityTier = contributor.id.startsWith("opportunity:") ? "major-opportunity" : "positive-achievement";
    insights.push(toInsight(contributor, priority, intelligence));
  }

  // One honest observation: the portfolio's own rule-based classification —
  // real, already-computed (`fingerprint.ts`), genuinely non-actionable.
  insights.push({
    id: "fingerprint",
    title: "Portfolio Type",
    summary: `This portfolio reads as ${intelligence.fingerprint}.`,
    importance: "low",
    reason: intelligence.fingerprintReason,
    relatedAssets: [],
    priority: "observation",
  });

  return insights.sort((a, b) => comparePriorityTier(a.priority, b.priority));
}
