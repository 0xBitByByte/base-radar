/**
 * V4-INTELLIGENCE-002 — Executive Summary: one concise paragraph combining
 * Health, Largest Holding, Diversification, Main Risk, and Primary
 * Recommendation. Pure template composition over already-built fields —
 * `warnings`/`recommendations` are already severity/priority-sorted by
 * `risk.ts`/`recommendations.ts`, so "main risk"/"primary recommendation"
 * is just `[0]`, never re-derived. Distinct from `summary.ts`'s existing
 * `buildSummary` (a narrative paragraph built straight from raw assets,
 * kept unchanged) — this is a structured five-fact digest for a reader who
 * wants the whole picture in one sentence.
 */

import type { DiversificationRating, PortfolioRecommendation, PortfolioWarning, ScoredHolding } from "@/lib/portfolio-intelligence/types";

export function buildExecutiveSummary(params: {
  healthScore: number;
  largestHolding: ScoredHolding | null;
  diversificationScore: number;
  diversificationRating: DiversificationRating;
  topWarning: PortfolioWarning | null;
  topRecommendation: PortfolioRecommendation | null;
}): string {
  const { healthScore, largestHolding, diversificationScore, diversificationRating, topWarning, topRecommendation } = params;

  if (!largestHolding) {
    return "No priced holdings yet — an executive summary needs at least one known price to be meaningful.";
  }

  const sentences: string[] = [
    `Health score is ${healthScore}/100, with ${diversificationRating.toLowerCase()} diversification (${diversificationScore}/100).`,
    `${largestHolding.symbol} is the largest known position at ${largestHolding.allocationPct.toFixed(1)}%.`,
  ];

  sentences.push(topWarning ? `The main risk flagged is ${topWarning.title.toLowerCase()}.` : "No risk flags are currently active.");
  sentences.push(topRecommendation ? `Top recommendation: ${topRecommendation.explanation}` : "No recommendations right now — nothing stands out to address.");

  return sentences.join(" ");
}
