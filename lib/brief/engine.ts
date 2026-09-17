/**
 * AI Daily Intelligence Brief — the pipeline entry point (PR16 Part 1).
 * `buildDailyBrief` is a pure function: same `IntelligenceAlert[]` and
 * `generatedAt` in, same `DailyBrief` out, every time — no fetching, no
 * caching, no side effects (`storage.ts` owns both of those). Only ever
 * reads from `lib/alerts/intelligence`'s own output; never inspects raw
 * provider alerts and never recomputes scoring/grouping/narratives the
 * Intelligence Engine already did.
 *
 * The pipeline:
 *   1. Compute summary statistics (narrative counts, average confidence,
 *      highest score, project count) — `sections.ts`'s `computeMarketStats`.
 *   2. Build each section (Market Summary, Top Opportunities, Security,
 *      Governance, Development, TVL, Emerging Narratives, Recommendations)
 *      — one pure function per section, all in `sections.ts`.
 *   3. Generate the headline/executive summary — `summary.ts`.
 *   4. Assemble the `DailyBrief`.
 */

import {
  buildDevelopmentHighlights,
  buildEmergingNarratives,
  buildGovernanceHighlights,
  buildMarketSummarySection,
  buildRecommendations,
  buildSecurityHighlights,
  buildTopOpportunities,
  buildTopRisks,
  buildTvlHighlights,
  computeMarketStats,
} from "@/lib/brief/sections";
import { buildBriefHeadline, buildBriefSummary } from "@/lib/brief/summary";
import type { DailyBrief } from "@/lib/brief/types";
import type { IntelligenceAlert } from "@/lib/alerts/intelligence/types";

export function buildDailyBrief(alerts: IntelligenceAlert[], generatedAt: string): DailyBrief {
  const stats = computeMarketStats(alerts);
  const topOpportunities = buildTopOpportunities(alerts);
  const topRisks = buildTopRisks(alerts);
  const securityHighlights = buildSecurityHighlights(alerts);
  const governanceHighlights = buildGovernanceHighlights(alerts);
  const developmentHighlights = buildDevelopmentHighlights(alerts);
  const tvlHighlights = buildTvlHighlights(alerts);
  const emergingNarratives = buildEmergingNarratives(alerts);
  const marketSummary = buildMarketSummarySection(stats);
  const recommendations = buildRecommendations(stats, securityHighlights, governanceHighlights);

  return {
    // V3-NOTIFICATION-001 — day-truncated, not the full `generatedAt`
    // timestamp: `storage.ts` calls this with a fresh `new Date()` on every
    // rebuild (once per browser refresh, since its module-scope cache
    // resets), so a full-precision id changed on every single reload —
    // this is `buildDailyBrief`'s only real-world identity, and every
    // downstream id that derives from it (`lib/timeline/sections.ts`'s
    // `timeline:daily-brief:${dailyBrief.id}`, and transitively
    // `lib/notifications/storage.ts`'s read-state overlay) inherited that
    // instability. Still fully deterministic given `generatedAt` — this
    // function's own contract — just coarser. `generatedAt` itself is
    // untouched, so "Generated X ago" displays stay honest.
    id: `brief:${generatedAt.slice(0, 10)}`,
    generatedAt,
    headline: buildBriefHeadline(),
    summary: buildBriefSummary(stats, topOpportunities),
    marketSummary,
    topOpportunities,
    topRisks,
    securityHighlights,
    governanceHighlights,
    developmentHighlights,
    tvlHighlights,
    emergingNarratives,
    averageConfidence: stats.averageConfidence,
    highestScore: stats.highestScore,
    projectCount: stats.projectCount,
    narrativeCounts: stats.narrativeCounts,
    recommendations,
  };
}
