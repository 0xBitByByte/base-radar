/**
 * V4-INTELLIGENCE-003 (Phase 5) — a richer, line-by-line summary replacing
 * the single dense paragraph the old "AI Summary" card showed. Every line
 * reads one already-computed `PortfolioIntelligence` field directly
 * (`healthScore`, `largestHolding`, `diversificationScore`+`quality.
 * diversificationRating`, `confidenceLevel`, `warnings[0]`,
 * `recommendations[0]`) — the same real facts `executiveSummary.ts`
 * (V4-INTELLIGENCE-002) already draws on, just presented as separate lines
 * instead of one joined paragraph, plus confidence named explicitly (which
 * the paragraph form doesn't state on its own). No score is recalculated;
 * only the health-score tier label below is new "text," and it's a fixed,
 * documented labeling of an existing number — the same pattern
 * `diversificationRating`/`RISK_LEVEL_LABEL` already establish elsewhere in
 * this codebase.
 */

import type { PortfolioIntelligence } from "@/lib/portfolio-intelligence/types";

function healthHeadline(healthScore: number): string {
  if (healthScore >= 80) return "Portfolio looks excellent overall.";
  if (healthScore >= 60) return "Portfolio looks healthy overall.";
  if (healthScore >= 40) return "Portfolio looks fair overall — a few things worth addressing.";
  return "Portfolio needs attention — several things stand out.";
}

/** Lowercases only the first character — for splicing a recommendation's own `explanation` (already a complete sentence starting with a capital) into "Your next best action is …". */
function lowerFirst(text: string): string {
  return text.length > 0 ? text[0].toLowerCase() + text.slice(1) : text;
}

export function buildAISummaryLines(intelligence: PortfolioIntelligence): string[] {
  const { healthScore, largestHolding, diversificationScore, quality, confidenceLevel, warnings, recommendations } = intelligence;
  const lines: string[] = [healthHeadline(healthScore)];

  if (largestHolding) {
    lines.push(`Largest holding remains ${largestHolding.symbol} (${largestHolding.allocationPct.toFixed(0)}%).`);
  }

  lines.push(`Diversification is ${quality.diversificationRating.toLowerCase()} (${diversificationScore}/100).`);
  lines.push(`Pricing confidence is ${confidenceLevel}.`);

  const topWarning = warnings[0] ?? null;
  lines.push(topWarning ? `Main concern is ${topWarning.title.toLowerCase()}.` : "No concerns are currently flagged.");

  const topRecommendation = recommendations[0] ?? null;
  lines.push(topRecommendation ? `Your next best action is ${lowerFirst(topRecommendation.explanation)}` : "No action needed right now — nothing stands out to address.");

  return lines;
}
