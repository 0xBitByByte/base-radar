/**
 * V4-INTELLIGENCE-002 (Phase 4) — the one clean public surface for this
 * directory, so a future AI/Analytics/Automation/History module can import
 * `@/lib/portfolio-intelligence` instead of reaching into individual
 * internal files. `buildPortfolioIntelligence` itself is unchanged (still
 * exported from `engine.ts`, re-exported here too) — everything below is
 * either a direct re-export of an already-existing function (zero new
 * logic) or a thin composition wrapper that calls straight through to
 * functions this directory already had (bundles a few already-existing
 * calls into one convenient return value, still zero duplicated logic).
 */

import type { HoldingAsset } from "@/lib/holdings/types";
import { diversificationScore } from "@/lib/portfolio-intelligence/diversification";
import { buildHealthBreakdown, healthScoreFromBreakdown } from "@/lib/portfolio-intelligence/health";
import { buildOpportunities } from "@/lib/portfolio-intelligence/opportunities";
import { buildRecommendations } from "@/lib/portfolio-intelligence/recommendations";
import { buildWarnings, concentrationRisk, riskScore } from "@/lib/portfolio-intelligence/risk";
import { buildSummary } from "@/lib/portfolio-intelligence/summary";
import type { ConcentrationRisk, PortfolioWarning, ScoreContribution } from "@/lib/portfolio-intelligence/types";

export { buildPortfolioIntelligence } from "@/lib/portfolio-intelligence/engine";
export type * from "@/lib/portfolio-intelligence/types";

/** Bundles `health.ts`'s two functions into the one call a future consumer actually wants — the headline number plus its breakdown, computed once. */
export function buildPortfolioHealth(assets: HoldingAsset[], totalUsdValue: number): { healthScore: number; healthBreakdown: ScoreContribution[] } {
  const healthBreakdown = buildHealthBreakdown(assets, totalUsdValue);
  return { healthScore: healthScoreFromBreakdown(healthBreakdown), healthBreakdown };
}

/** Bundles `risk.ts`'s three functions the same way `buildPortfolioIntelligence` itself already calls them together. */
export function buildPortfolioRisk(assets: HoldingAsset[], totalUsdValue: number): { riskScore: number; concentrationRisk: ConcentrationRisk; warnings: PortfolioWarning[] } {
  return { riskScore: riskScore(assets, totalUsdValue), concentrationRisk: concentrationRisk(assets), warnings: buildWarnings(assets, totalUsdValue) };
}

export { buildPortfolioQuality } from "@/lib/portfolio-intelligence/quality";
export { buildAllocationBreakdown } from "@/lib/portfolio-intelligence/allocation";
export { buildConfidence } from "@/lib/portfolio-intelligence/confidence";
export { buildPortfolioFingerprint } from "@/lib/portfolio-intelligence/fingerprint";
export { buildScoreContributors } from "@/lib/portfolio-intelligence/contributors";
export { buildExecutiveSummary } from "@/lib/portfolio-intelligence/executiveSummary";

/** Alias for `recommendations.ts`'s own export — needs `diversificationScoreValue`, so it's computed here rather than forcing every caller to pass it in separately. */
export function buildPortfolioRecommendations(assets: HoldingAsset[], totalUsdValue: number) {
  return buildRecommendations(assets, totalUsdValue, diversificationScore(assets));
}

/** Alias for `opportunities.ts`'s own export — same `diversificationScoreValue` convenience as `buildPortfolioRecommendations` above. */
export function buildPortfolioOpportunities(assets: HoldingAsset[], totalUsdValue: number) {
  return buildOpportunities(assets, totalUsdValue, diversificationScore(assets));
}

/** Alias for `summary.ts`'s own export, under the naming convention this phase's Phase 4 asks for. */
export function buildPortfolioSummary(assets: HoldingAsset[], totalUsdValue: number): string {
  return buildSummary(assets, totalUsdValue, diversificationScore(assets));
}

export { pricingCoverage } from "@/lib/portfolio-intelligence/score";
export { classificationCoverage, protocolConcentration, topHoldings } from "@/lib/portfolio-intelligence/allocation";
export { verifiedSharePct } from "@/lib/portfolio-intelligence/health";
export { diversificationRating } from "@/lib/portfolio-intelligence/diversification";
