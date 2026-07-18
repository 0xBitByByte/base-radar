/**
 * Portfolio Intelligence — the pipeline entry point (PR17 Part 1).
 * `buildPortfolioIntelligence` is a pure function: same `Watchlist`,
 * `IntelligenceAlert[]`, `DailyBrief`, and `generatedAt` in, same
 * `PortfolioIntelligence` out, every time — no fetching, no caching, no
 * `Date.now()` (`generatedAt` is a parameter, exactly like `lib/brief/
 * engine.ts`'s `buildDailyBrief`). `storage.ts` is the only place that
 * actually calls `getWatchlist()`/`getIntelligenceAlerts()`/
 * `getDailyBrief()` and supplies the real current time.
 *
 * The pipeline:
 *   1. Compute stats (`computePortfolioStats`) — Watchlist size, Daily
 *      Brief's own average confidence, and one new aggregate (average
 *      score).
 *   2. Select each section — four of five are `DailyBrief`'s own sections,
 *      reused unchanged; "Projects Needing Attention" is the one genuinely
 *      new derivation, from real `"decline"`-narrative alerts.
 *   3. Generate headline/summary/overall health — `summary.ts`.
 *   4. Assemble the `PortfolioIntelligence`.
 */

import {
  buildDevelopmentMomentum,
  buildGovernanceWatch,
  buildNarratives,
  buildProjectsNeedingAttention,
  buildRecommendations,
  buildSecurityRisks,
  buildTopPerformers,
  computePortfolioStats,
} from "@/lib/portfolio/sections";
import { buildOverallHealth, buildPortfolioHeadline, buildPortfolioSummary } from "@/lib/portfolio/summary";
import type { PortfolioIntelligence } from "@/lib/portfolio/types";
import type { IntelligenceAlert } from "@/lib/alerts/intelligence/types";
import type { DailyBrief } from "@/lib/brief/types";
import type { Watchlist } from "@/lib/watchlist/types";

export function buildPortfolioIntelligence(
  watchlist: Watchlist,
  alerts: IntelligenceAlert[],
  dailyBrief: DailyBrief,
  generatedAt: string
): PortfolioIntelligence {
  const stats = computePortfolioStats(watchlist, dailyBrief, alerts);
  const topPerformers = buildTopPerformers(dailyBrief);
  const securityRisks = buildSecurityRisks(dailyBrief);
  const governanceWatch = buildGovernanceWatch(dailyBrief);
  const developmentMomentum = buildDevelopmentMomentum(dailyBrief);
  const dominantNarratives = buildNarratives(dailyBrief);
  const projectsNeedingAttention = buildProjectsNeedingAttention(alerts);
  const recommendations = buildRecommendations(stats, topPerformers, projectsNeedingAttention, securityRisks);
  const overallHealth = buildOverallHealth(stats, securityRisks, projectsNeedingAttention);

  return {
    id: `portfolio:${generatedAt}`,
    generatedAt,
    headline: buildPortfolioHeadline(),
    summary: buildPortfolioSummary(stats, topPerformers),
    projectCount: stats.projectCount,
    averageConfidence: stats.averageConfidence,
    averageScore: stats.averageScore,
    dominantNarratives,
    topPerformers,
    projectsNeedingAttention,
    securityRisks,
    governanceWatch,
    developmentMomentum,
    recommendations,
    overallHealth,
  };
}
