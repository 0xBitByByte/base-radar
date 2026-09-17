/**
 * V3-WALLET-003 — diversification scoring via the Herfindahl-Hirschman
 * Index (HHI), a standard, real, well-established concentration metric
 * (sum of squared market shares), not an invented heuristic. HHI ranges
 * 0 (perfectly split across infinite assets) to 1 (a single asset holds
 * everything); this module reports the inverse as a 0-100 "diversification"
 * score so a higher number always reads as better, matching every other
 * score in this module.
 */

import type { HoldingAsset } from "@/lib/holdings/types";
import { pricedAssetsByValue } from "@/lib/portfolio-intelligence/allocation";
import type { DiversificationRating } from "@/lib/portfolio-intelligence/types";

/**
 * 0-100, higher = more evenly spread across assets. Only priced assets
 * participate (an unpriced asset has no known share to weigh) — a wallet
 * with zero priced assets honestly returns 0 (no known diversification),
 * never a fabricated mid-range guess.
 */
export function diversificationScore(assets: HoldingAsset[]): number {
  const priced = pricedAssetsByValue(assets);
  if (priced.length === 0) return 0;
  if (priced.length === 1) return 0;

  const hhi = priced.reduce((sum, asset) => {
    const share = (asset.allocationPct ?? 0) / 100;
    return sum + share * share;
  }, 0);

  return Math.round((1 - hhi) * 100);
}

/** Fixed, documented thresholds over `diversificationScore`'s own 0-100 output — the one place "what counts as Good vs Fair" is decided, so `quality.ts` and any UI answer "why is Diversification rated X?" from the same real number, never a separately-guessed label. */
export function diversificationRating(score: number): { rating: DiversificationRating; reason: string } {
  if (score >= 80) return { rating: "Excellent", reason: `Diversification score is ${score}/100 (>= 80) — no single asset comes close to dominating your known holdings.` };
  if (score >= 60) return { rating: "Good", reason: `Diversification score is ${score}/100 (>= 60) — reasonably spread across your known holdings.` };
  if (score >= 35) return { rating: "Fair", reason: `Diversification score is ${score}/100 (>= 35) — some spread, but one or two assets still carry meaningful weight.` };
  return { rating: "Poor", reason: `Diversification score is ${score}/100 (< 35) — your known value is concentrated in very few assets.` };
}
