/**
 * Deterministic headline/executive-summary prose for the Daily Brief —
 * the same "real data in, plain-English text out" template approach
 * `lib/alerts/intelligence/summary.ts` already uses, applied one level up
 * (across every `IntelligenceAlert` for the day, not one project). No
 * randomness, no AI API.
 */

import type { MarketStats } from "@/lib/brief/sections";
import type { BriefOpportunity } from "@/lib/brief/types";

/**
 * Static by design — the Brief's `generatedAt` field carries the actual
 * timestamp; baking a formatted date into this string would mix a
 * presentation concern (locale/date formatting) into a backend engine that
 * has no UI layer yet (Part 1 of this PR is backend-only).
 */
export function buildBriefHeadline(): string {
  return "Today's Brief";
}

/** One or two sentences summarizing the day's real signal volume and, when one exists, the single highest-scoring opportunity. */
export function buildBriefSummary(stats: MarketStats, topOpportunities: BriefOpportunity[]): string {
  if (stats.projectCount === 0) {
    return "No AI Intelligence signals were generated for your Watchlist today.";
  }

  const projectClause = `${stats.projectCount} watched project${stats.projectCount === 1 ? "" : "s"} produced AI Intelligence signals today`;
  const leader = topOpportunities[0];

  if (!leader) {
    return `${projectClause}. Average confidence ${stats.averageConfidence}%.`;
  }

  return `${projectClause}, led by ${leader.projectName}. Average confidence ${stats.averageConfidence}%.`;
}
