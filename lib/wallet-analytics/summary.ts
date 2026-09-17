/**
 * V4-ANALYTICS-001 (Phase 8) — Executive Analytics Summary: pure template
 * assembly over already-built `Trend[]`/`PortfolioEvolution` — no LLM, no
 * generated opinion, no recalculation. Matches the empty-state-first
 * sentence-builder convention every other `summary.ts` in this codebase
 * (`lib/portfolio-intelligence/summary.ts`, `lib/wallet-automation/
 * summary.ts`) already establishes.
 */

import type { PortfolioEvolution, Trend } from "@/lib/wallet-analytics/types";

export function buildAnalyticsExecutiveSummary(trends: Trend[], evolution: PortfolioEvolution, snapshotCount: number): string {
  if (snapshotCount < 2) {
    return "Not enough history yet to summarize how your portfolio has evolved — check back after a few more refreshes with real changes.";
  }

  const improving = trends.filter((t) => t.direction === "improving");
  const declining = trends.filter((t) => t.direction === "declining");

  const overallLine =
    improving.length > declining.length
      ? "Your portfolio has steadily improved."
      : declining.length > improving.length
        ? "Your portfolio has declined recently."
        : "Your portfolio has stayed roughly stable.";

  const sentences: string[] = [overallLine];

  for (const trend of trends) {
    if (trend.direction === "improving") sentences.push(`${trend.label} improved.`);
    else if (trend.direction === "declining") sentences.push(`${trend.label} declined.`);
  }

  const confidenceTrend = trends.find((t) => t.metric === "confidence");
  if (confidenceTrend?.direction === "stable" && typeof confidenceTrend.to === "number" && confidenceTrend.to >= 75) {
    sentences.push("Confidence remained high.");
  }

  if (evolution.largestImprovement) {
    sentences.push(`Your largest improvement came from ${evolution.largestImprovement.label.toLowerCase()}.`);
  } else if (evolution.largestDeterioration) {
    sentences.push(`Your biggest concern was ${evolution.largestDeterioration.label.toLowerCase()}.`);
  }

  return sentences.join(" ");
}
