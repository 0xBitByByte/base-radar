/**
 * Deterministic headline/executive-summary/health prose for Portfolio
 * Intelligence — the same template approach `lib/brief/summary.ts` and
 * `lib/alerts/intelligence/summary.ts` already use, applied at the
 * Watchlist level. No randomness, no AI API.
 */

import type { PortfolioStats } from "@/lib/portfolio/sections";
import type { PortfolioHealth } from "@/lib/portfolio/types";
import type { BriefHighlight } from "@/lib/brief/types";
import type { DailyBrief } from "@/lib/brief/types";

/** Static by design — mirrors `lib/brief/summary.ts`'s `buildBriefHeadline`; `generatedAt` on the model carries the real timestamp, not this string. */
export function buildPortfolioHeadline(): string {
  return "Portfolio Intelligence";
}

export function buildPortfolioSummary(stats: PortfolioStats, topPerformers: DailyBrief["topOpportunities"]): string {
  if (stats.projectCount === 0) {
    return "Your Watchlist is empty — add a project to start building Portfolio Intelligence.";
  }

  const projectClause = `${stats.projectCount} watched project${stats.projectCount === 1 ? "" : "s"}`;
  const leader = topPerformers[0];

  if (!leader) {
    return `${projectClause} tracked. Average score ${stats.averageScore}, average confidence ${stats.averageConfidence}%.`;
  }

  return `${projectClause} tracked, led by ${leader.projectName}. Average score ${stats.averageScore}, average confidence ${stats.averageConfidence}%.`;
}

/**
 * A real security risk or two-or-more real "needs attention" reads always
 * outweighs a good average score — this deliberately checks risk signals
 * before rewarding a high average, so a portfolio with one serious real
 * problem is never labeled "strong."
 */
export function buildOverallHealth(
  stats: PortfolioStats,
  securityRisks: BriefHighlight[],
  projectsNeedingAttention: BriefHighlight[]
): PortfolioHealth {
  if (stats.projectCount === 0) return "stable";
  if (securityRisks.length > 0) return "needs-attention";
  if (projectsNeedingAttention.length >= 2) return "needs-attention";
  if (stats.averageScore >= 60 && stats.averageConfidence >= 70) return "strong";
  return "stable";
}
