/**
 * V3-WALLET-004 — the one place every "did this wallet condition just
 * become true" predicate lives, each a pure function of two
 * `PortfolioIntelligence` snapshots (never raw holdings). Both `events.ts`
 * (the full 13-kind log) and `engine.ts` (the 6 automation rules) import
 * from here, so the actual threshold/transition logic exists in exactly one
 * place — the two tiers never redefine what "concentration became high"
 * means independently of each other.
 *
 * Every predicate is edge-triggered (returns true only on a genuine
 * transition), never level-triggered — a refresh that leaves a condition
 * unchanged (e.g. concentration was already high, still is) must produce
 * nothing, per the brief's explicit "refresh without changes produces no
 * new events" requirement. `previous === null` (the very first snapshot
 * this session has ever seen) never fires anything either — there is
 * nothing to have transitioned FROM yet.
 */

import type { PortfolioIntelligence } from "@/lib/portfolio-intelligence/types";

/** Below this, a portfolio's known pricing is considered materially incomplete — matches the brief's own worked example ("pricingCoverage < 80%"). */
export const PRICING_COVERAGE_THRESHOLD = 80;
/** Minimum point delta for `overallScore`/`healthScore` to count as a "significant" change, not rounding noise from an unrelated 1-2 point wobble. */
export const SCORE_CHANGE_THRESHOLD = 3;
/** Minimum relative change in total known USD value to count as real movement rather than sub-cent noise. */
export const VALUE_CHANGE_RATIO_THRESHOLD = 0.05;

function holdingKey(holding: PortfolioIntelligence["largestHolding"]): string | null {
  return holding ? `${holding.symbol}:${holding.address ?? "native"}` : null;
}

export function concentrationJustExceededHigh(previous: PortfolioIntelligence | null, current: PortfolioIntelligence): boolean {
  if (!previous) return false;
  return previous.concentrationRisk.level !== "high" && current.concentrationRisk.level === "high";
}

export function riskLevelChanged(previous: PortfolioIntelligence | null, current: PortfolioIntelligence): boolean {
  if (!previous) return false;
  return previous.concentrationRisk.level !== current.concentrationRisk.level;
}

export function scoreChangedSignificantly(previous: PortfolioIntelligence | null, current: PortfolioIntelligence): boolean {
  if (!previous) return false;
  return Math.abs(current.overallScore - previous.overallScore) >= SCORE_CHANGE_THRESHOLD;
}

export function healthChangedSignificantly(previous: PortfolioIntelligence | null, current: PortfolioIntelligence): boolean {
  if (!previous) return false;
  return Math.abs(current.healthScore - previous.healthScore) >= SCORE_CHANGE_THRESHOLD;
}

export function stablecoinExposureJustDropped(previous: PortfolioIntelligence | null, current: PortfolioIntelligence): boolean {
  if (!previous) return false;
  return previous.stablecoinExposure > 0 && current.stablecoinExposure === 0;
}

export function stablecoinExposureJustRecovered(previous: PortfolioIntelligence | null, current: PortfolioIntelligence): boolean {
  if (!previous) return false;
  return previous.stablecoinExposure === 0 && current.stablecoinExposure > 0;
}

export function pricingCoverageJustDropped(previous: PortfolioIntelligence | null, current: PortfolioIntelligence): boolean {
  if (!previous) return false;
  return previous.pricingCoverage >= PRICING_COVERAGE_THRESHOLD && current.pricingCoverage < PRICING_COVERAGE_THRESHOLD;
}

export function pricingCoverageJustRecovered(previous: PortfolioIntelligence | null, current: PortfolioIntelligence): boolean {
  if (!previous) return false;
  return previous.pricingCoverage < PRICING_COVERAGE_THRESHOLD && current.pricingCoverage >= PRICING_COVERAGE_THRESHOLD;
}

export function unknownAssetsIncreased(previous: PortfolioIntelligence | null, current: PortfolioIntelligence): boolean {
  if (!previous) return false;
  return current.unknownAssetCount > previous.unknownAssetCount;
}

export function largestHoldingChanged(previous: PortfolioIntelligence | null, current: PortfolioIntelligence): boolean {
  if (!previous) return false;
  return holdingKey(previous.largestHolding) !== holdingKey(current.largestHolding);
}

export function portfolioValueChangedSignificantly(previous: PortfolioIntelligence | null, current: PortfolioIntelligence): boolean {
  if (!previous || previous.totalUsdValue <= 0) return false;
  const delta = Math.abs(current.totalUsdValue - previous.totalUsdValue) / previous.totalUsdValue;
  return delta >= VALUE_CHANGE_RATIO_THRESHOLD;
}
