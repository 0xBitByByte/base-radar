/**
 * V3-WALLET-003 — opportunity/observation cards. Every card is backed by a
 * real, already-computed number from this wallet's own holdings — never a
 * market claim (no APR/yield/APY/rewards/governance/liquidity/protocol
 * TVL), and never a "monitor biggest daily mover" card, since `HoldingAsset`
 * carries no 24h price-change field to honestly back that claim (the brief's
 * own "only if data exists" rule for that specific example).
 */

import type { HoldingAsset } from "@/lib/holdings/types";
import { defiExposure, largestHolding, protocolConcentration, stablecoinExposure } from "@/lib/portfolio-intelligence/allocation";
import { concentrationRisk } from "@/lib/portfolio-intelligence/risk";
import { pricingCoverage } from "@/lib/portfolio-intelligence/score";
import type { PortfolioInsight, PortfolioInsightTone } from "@/lib/portfolio-intelligence/types";

const PROTOCOL_DEPENDENCY_THRESHOLD_PCT = 50;
const LOW_PRICING_COVERAGE_THRESHOLD = 70;

/** Most attention-worthy first — the same "don't make the reader hunt for the important one" ordering `risk.ts`'s `SEVERITY_RANK` applies to warnings, reused here for opportunity cards' own `tone`. */
const TONE_RANK: Record<PortfolioInsightTone, number> = { attention: 0, neutral: 1, positive: 2 };

export function buildOpportunities(assets: HoldingAsset[], totalUsdValue: number, diversificationScoreValue: number): PortfolioInsight[] {
  const insights: PortfolioInsight[] = [];
  const { level, topHoldingPct } = concentrationRisk(assets);
  const top = largestHolding(assets);
  const stableExposure = stablecoinExposure(assets, totalUsdValue);
  const otherExposure = defiExposure(assets, totalUsdValue);
  const pricedCount = assets.filter((asset) => asset.usdValue !== null).length;
  const coverage = pricingCoverage(assets);
  const { largestProtocolName, largestProtocolPct } = protocolConcentration(assets, totalUsdValue);

  if ((level === "high" || level === "elevated") && top) {
    insights.push({
      id: "high-concentration",
      title: `High ${top.symbol} concentration`,
      description: `${topHoldingPct.toFixed(1)}% of your known value is in ${top.symbol}. Worth deciding whether that's an intentional conviction position or an area to trim.`,
      tone: "attention",
    });
  }

  if (otherExposure >= 25) {
    insights.push({
      id: "base-ecosystem-exposure",
      title: "Strong Base ecosystem exposure",
      description: `${otherExposure.toFixed(1)}% of your known value is in non-stablecoin Base tokens beyond ETH — real exposure to the ecosystem's own growth.`,
      tone: "positive",
    });
  }

  if (diversificationScoreValue >= 70) {
    insights.push({
      id: "good-diversification",
      title: "Good diversification",
      description: `Your diversification score is ${diversificationScoreValue}/100 — no single asset dominates your known holdings.`,
      tone: "positive",
    });
  }

  if (pricedCount > 0 && stableExposure < 10) {
    insights.push({
      id: "consider-stables",
      title: "Consider adding stable assets",
      description: `Only ${stableExposure.toFixed(1)}% of your known value is in stablecoins. A small stablecoin allocation can reduce how much your total swings with the market.`,
      tone: "neutral",
    });
  }

  // V4-INTELLIGENCE-001 (item 8)
  if (assets.length > 0 && coverage < LOW_PRICING_COVERAGE_THRESHOLD) {
    insights.push({
      id: "improve-pricing-coverage",
      title: "Increase pricing coverage",
      description: `Only ${coverage}% of your holdings (by count) have a known price. Researching the rest would make your total value and allocation percentages more complete.`,
      tone: "attention",
    });
  }

  if (largestProtocolName && largestProtocolPct >= PROTOCOL_DEPENDENCY_THRESHOLD_PCT) {
    insights.push({
      id: "monitor-protocol-dependency",
      title: `High ${largestProtocolName} dependency`,
      description: `${largestProtocolPct.toFixed(1)}% of your known value depends on ${largestProtocolName}. Worth knowing that protocol's own risk profile well.`,
      tone: "attention",
    });
  }

  return insights.sort((a, b) => TONE_RANK[a.tone] - TONE_RANK[b.tone]);
}
