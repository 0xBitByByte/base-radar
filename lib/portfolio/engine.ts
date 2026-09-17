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
import type { PersonalWatchlist } from "@/lib/personalization/types";

export function buildPortfolioIntelligence(
  watchlist: PersonalWatchlist | null,
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
    // V3-NOTIFICATION-001 — day-truncated, not the full `generatedAt`
    // timestamp — same fix, same reasoning as `lib/brief/engine.ts`'s
    // identical `id` construction (see its own comment): `storage.ts`
    // rebuilds this with a fresh `new Date()` on every browser refresh,
    // and every downstream id derived from `.id` (Timeline, Notifications'
    // read-state overlay) inherited that instability. Still deterministic
    // given `generatedAt`, just coarser. `generatedAt` itself is untouched.
    id: `portfolio:${generatedAt.slice(0, 10)}`,
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
