/**
 * V3-WALLET-003 — `overallScore`, a transparent average of the sub-scores
 * this module already computes elsewhere (`diversification.ts`, `risk.ts`,
 * and `health.ts`'s own breakdown-derived `healthScore`) — never a
 * black-box number, and never fabricated when there's simply no data yet
 * (an empty/unpriced wallet honestly scores 0, not a guessed middle value).
 *
 * V4-INTELLIGENCE-001 — the old blended `healthScore(diversification, risk,
 * pricing)` (a single opaque formula: `diversification*0.4 + (100-risk)*0.4
 * + pricing*0.2`) has been removed from this file. It's replaced by
 * `health.ts`'s `buildHealthBreakdown` + `healthScoreFromBreakdown`, which
 * produce the same kind of 0-100 number but as the sum of five named,
 * independently-explainable contributions instead of a formula nobody could
 * point to a single number and say "that's why." `overallScore` below is
 * unchanged — it still averages `diversification`, `(100 - risk)`, and
 * whatever `health` value it's given.
 */

import type { HoldingAsset } from "@/lib/holdings/types";

/**
 * % of assets (by count, not USD value) that have a real price — 0-100.
 * Distinct from `stablecoinExposure`/`defiExposure`: this measures data
 * completeness, not asset category. Counted by asset, not value, so a
 * wallet dominated by one large priced token doesn't read as "fully
 * covered" while several smaller unpriced tokens go unnoticed.
 */
export function pricingCoverage(assets: HoldingAsset[]): number {
  if (assets.length === 0) return 0;
  const pricedCount = assets.filter((asset) => asset.usdValue !== null).length;
  return Math.round((pricedCount / assets.length) * 100);
}

export function overallScore(diversification: number, risk: number, health: number): number {
  return Math.round((diversification + (100 - risk) + health) / 3);
}
