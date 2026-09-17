/**
 * V4-INTELLIGENCE-001 — Portfolio Quality: verification/protocol-detection/
 * diversification-rating on the same already-normalized holdings. Distinct
 * from `PortfolioIntelligence`'s own top-level `pricingCoverage`/
 * `unknownAssetCount` (which measure *pricing* completeness) — this module
 * is about contract trust and ecosystem breadth. No new fetch, no new
 * classification source: `verified` is `HoldingAsset`'s own Blockscout
 * field, protocols come from `allocation.ts`'s existing static map.
 */

import type { HoldingAsset } from "@/lib/holdings/types";
import { protocolConcentration } from "@/lib/portfolio-intelligence/allocation";
import { diversificationRating, diversificationScore } from "@/lib/portfolio-intelligence/diversification";
import type { PortfolioQuality } from "@/lib/portfolio-intelligence/types";

export function buildPortfolioQuality(assets: HoldingAsset[], totalUsdValue: number): PortfolioQuality {
  // Verification doesn't apply to native ETH at all (see `HoldingAsset`'s
  // own doc comment) — excluded from all three counts below rather than
  // silently folded into "not checked", which would conflate "the concept
  // doesn't apply" with "genuinely unknown."
  const erc20Assets = assets.filter((asset) => asset.tokenType === "erc20");
  const verifiedAssetCount = erc20Assets.filter((asset) => asset.verified === true).length;
  const unverifiedAssetCount = erc20Assets.filter((asset) => asset.verified === false).length;
  const notCheckedAssetCount = erc20Assets.filter((asset) => asset.verified === null).length;

  const { protocolsDetected } = protocolConcentration(assets, totalUsdValue);
  const { rating, reason } = diversificationRating(diversificationScore(assets));

  return {
    verifiedAssetCount,
    unverifiedAssetCount,
    notCheckedAssetCount,
    protocolsDetected,
    diversificationRating: rating,
    diversificationRatingReason: reason,
  };
}
