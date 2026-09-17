/**
 * V3-WALLET-003 — the one natural-language paragraph, built from already-
 * computed real numbers via fixed templates, matching the empty-state-first
 * "summary sentence builder" pattern already used by `lib/portfolio/
 * summary.ts` and `lib/brief/summary.ts` (found during this feature's
 * required investigation). Deterministic and pure — no LLM call, ever; the
 * same input always produces the same sentence.
 */

import type { HoldingAsset } from "@/lib/holdings/types";
import { defiExposure, largestHolding, stablecoinExposure } from "@/lib/portfolio-intelligence/allocation";
import { concentrationRisk } from "@/lib/portfolio-intelligence/risk";

export function buildSummary(assets: HoldingAsset[], totalUsdValue: number, diversificationScoreValue: number): string {
  const pricedCount = assets.filter((asset) => asset.usdValue !== null).length;
  if (assets.length === 0) {
    return "No holdings yet — connect a wallet with assets on Base to see a real portfolio summary.";
  }
  if (pricedCount === 0) {
    return "Your holdings were found, but none could be priced yet — a summary needs at least one known price to be meaningful.";
  }

  const { level, topHoldingPct } = concentrationRisk(assets);
  const top = largestHolding(assets);
  const stableExposure = stablecoinExposure(assets, totalUsdValue);
  const otherExposure = defiExposure(assets, totalUsdValue);

  const sentences: string[] = [];

  if (top && (level === "high" || level === "elevated")) {
    sentences.push(`Your portfolio is heavily concentrated in ${top.symbol} (${topHoldingPct.toFixed(0)}%).`);
  } else if (top) {
    sentences.push(`Your largest known position is ${top.symbol} at ${topHoldingPct.toFixed(0)}% of total value.`);
  }

  if (stableExposure < 10) {
    sentences.push(`Stablecoin exposure is low (${stableExposure.toFixed(0)}%), increasing volatility.`);
  } else if (stableExposure >= 30) {
    sentences.push(`Stablecoin exposure is meaningful (${stableExposure.toFixed(0)}%), cushioning some volatility.`);
  }

  if (level === "high" || level === "elevated" || diversificationScoreValue < 40) {
    sentences.push(
      otherExposure > 0
        ? "Consider diversifying into additional Base ecosystem assets."
        : "Consider diversifying beyond your current holdings."
    );
  } else if (diversificationScoreValue >= 70) {
    sentences.push("Your known holdings are well spread across assets.");
  }

  return sentences.join(" ");
}
