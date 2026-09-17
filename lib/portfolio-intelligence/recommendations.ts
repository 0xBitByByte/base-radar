/**
 * V3-WALLET-003 — recommendations over a wallet's own real, checkable
 * conditions, matching the established pattern found in
 * `lib/portfolio/sections.ts`'s `buildRecommendations()`. Every
 * recommendation references an actual number/symbol from this wallet's own
 * holdings — never generic boilerplate detached from the data.
 *
 * V4-INTELLIGENCE-001 — restructured from a plain `string[]` into
 * `PortfolioRecommendation[]`: each entry now separates the actionable
 * `explanation` (the "what") from its `reason` (the "why" — the exact
 * condition that caused it to exist), plus a `priority` so a UI can show
 * the most important recommendation first without re-deriving urgency from
 * prose. The list itself is also returned sorted by priority (high first).
 */

import type { HoldingAsset } from "@/lib/holdings/types";
import { largestHolding, protocolConcentration, stablecoinExposure } from "@/lib/portfolio-intelligence/allocation";
import { concentrationRisk } from "@/lib/portfolio-intelligence/risk";
import type { PortfolioRecommendation, PortfolioRecommendationPriority } from "@/lib/portfolio-intelligence/types";

const DUST_USD_THRESHOLD = 1;
const PROTOCOL_DEPENDENCY_THRESHOLD_PCT = 50;

const PRIORITY_RANK: Record<PortfolioRecommendationPriority, number> = { high: 0, medium: 1, low: 2 };

export function buildRecommendations(assets: HoldingAsset[], totalUsdValue: number, diversificationScoreValue: number): PortfolioRecommendation[] {
  const recommendations: PortfolioRecommendation[] = [];
  const { level, topHoldingPct } = concentrationRisk(assets);
  const top = largestHolding(assets);
  const pricedCount = assets.filter((asset) => asset.usdValue !== null).length;

  if ((level === "high" || level === "elevated") && top) {
    recommendations.push({
      id: "reduce-concentration",
      title: "Reduce concentration",
      explanation: `Consider trimming your ${top.symbol} position or adding other assets to balance it out.`,
      reason: `${top.symbol} is ${topHoldingPct.toFixed(1)}% of your known portfolio value.`,
      priority: level === "high" ? "high" : "medium",
    });
  }

  const { largestProtocolName, largestProtocolPct } = protocolConcentration(assets, totalUsdValue);
  if (largestProtocolName && largestProtocolPct >= PROTOCOL_DEPENDENCY_THRESHOLD_PCT) {
    recommendations.push({
      id: "reduce-protocol-dependency",
      title: "Reduce protocol dependency",
      explanation: `Consider spreading your ${largestProtocolName} exposure across other assets or protocols.`,
      reason: `${largestProtocolPct.toFixed(1)}% of your known value depends on ${largestProtocolName}.`,
      priority: "medium",
    });
  }

  if (diversificationScoreValue < 40 && assets.length > 1) {
    recommendations.push({
      id: "increase-diversification",
      title: "Increase diversification",
      explanation: "Adding a few more assets would spread your risk across more than just your current holdings.",
      reason: `Diversification score is ${diversificationScoreValue}/100 — your known holdings are concentrated in very few assets.`,
      priority: "medium",
    });
  }

  if (pricedCount > 0 && stablecoinExposure(assets, totalUsdValue) === 0) {
    recommendations.push({
      id: "add-stablecoins",
      title: "Consider a stablecoin allocation",
      explanation: "A small stablecoin allocation would reduce how much your total value swings with the market.",
      reason: "None of your known holdings are stablecoins.",
      priority: "low",
    });
  }

  const dust = assets.filter((asset) => asset.usdValue !== null && asset.usdValue > 0 && asset.usdValue < DUST_USD_THRESHOLD);
  if (dust.length > 0) {
    recommendations.push({
      id: "review-dust",
      title: `Review ${dust.length} dust holding${dust.length === 1 ? "" : "s"}`,
      explanation: `${dust.map((asset) => asset.symbol).join(", ")} ${dust.length === 1 ? "is" : "are"} negligible value — just clutter in your holdings list.`,
      reason: `${dust.length} priced holding${dust.length === 1 ? "" : "s"} worth less than $${DUST_USD_THRESHOLD}.`,
      priority: "low",
    });
  }

  const unpriced = assets.filter((asset) => asset.usdValue === null);
  if (unpriced.length > 0) {
    recommendations.push({
      id: "research-unpriced",
      title: "Research unpriced assets",
      explanation: `${unpriced.map((asset) => asset.symbol).join(", ")} ${unpriced.length === 1 ? "is" : "are"} currently excluded from your total value and allocation.`,
      reason: `${unpriced.length} held asset${unpriced.length === 1 ? "" : "s"} could not be priced.`,
      priority: "low",
    });
  }

  if (top && level === "low") {
    recommendations.push({
      id: "track-largest-position",
      title: "Track your largest position",
      explanation: `${top.symbol} is still worth monitoring even without extreme concentration.`,
      reason: `${top.symbol} is your largest position at ${topHoldingPct.toFixed(1)}%.`,
      priority: "low",
    });
  }

  return recommendations.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
}
