/**
 * Intelligence Timeline — the pipeline entry point (PR18 Part 1).
 * `buildTimeline` is a pure function: same `IntelligenceAlert[]`,
 * `DailyBrief`, `PortfolioIntelligence`, and `generatedAt` in, same
 * `Timeline` out, every time — no fetching, no caching, no `Date.now()`
 * (`generatedAt` is a parameter, exactly like `lib/brief/engine.ts`'s
 * `buildDailyBrief` and `lib/portfolio/engine.ts`'s
 * `buildPortfolioIntelligence`). `storage.ts` is the only place that
 * actually calls `getIntelligenceAlerts()`/`getDailyBrief()`/
 * `getPortfolioIntelligence()` and supplies the real current time.
 *
 * This is NOT a fourth intelligence engine — every event is built by
 * selecting and joining already-computed values from the three inputs
 * (`sections.ts`), never by recomputing scoring or narrative detection.
 *
 * The pipeline:
 *   1. Build all ten event-type arrays (`sections.ts`).
 *   2. Merge them into one list.
 *   3. De-duplicate by id, then sort descending by timestamp (stable).
 *   4. Compute summary statistics over the final event list.
 *   5. Generate headline/summary — `summary.ts`.
 *   6. Assemble the `Timeline`.
 */

import {
  buildAlertEvents,
  buildDailyBriefEvents,
  buildDevelopmentEvents,
  buildGovernanceEvents,
  buildNarrativeEvents,
  buildOpportunityEvents,
  buildPortfolioEvents,
  buildRecommendationEvents,
  buildSecurityEvents,
  buildTVLEvents,
  computeTimelineStats,
  dedupeEventsById,
  sortEventsByTimestampDescending,
} from "@/lib/timeline/sections";
import { buildTimelineHeadline, buildTimelineSummary } from "@/lib/timeline/summary";
import type { Timeline } from "@/lib/timeline/types";
import type { IntelligenceAlert } from "@/lib/alerts/intelligence/types";
import type { DailyBrief } from "@/lib/brief/types";
import type { PortfolioIntelligence } from "@/lib/portfolio/types";

export function buildTimeline(
  alerts: IntelligenceAlert[],
  dailyBrief: DailyBrief,
  portfolio: PortfolioIntelligence,
  generatedAt: string
): Timeline {
  const events = [
    ...buildAlertEvents(alerts),
    ...buildOpportunityEvents(dailyBrief, alerts),
    ...buildSecurityEvents(dailyBrief, alerts),
    ...buildGovernanceEvents(dailyBrief, alerts),
    ...buildDevelopmentEvents(dailyBrief, alerts),
    ...buildTVLEvents(dailyBrief, alerts),
    ...buildNarrativeEvents(dailyBrief),
    ...buildRecommendationEvents(dailyBrief, portfolio),
    ...buildPortfolioEvents(portfolio),
    ...buildDailyBriefEvents(dailyBrief),
  ];

  const dedupedEvents = dedupeEventsById(events);
  const sortedEvents = sortEventsByTimestampDescending(dedupedEvents);
  const stats = computeTimelineStats(sortedEvents);

  return {
    id: `timeline:${generatedAt}`,
    generatedAt,
    headline: buildTimelineHeadline(),
    summary: buildTimelineSummary(stats),
    events: sortedEvents,
    totalEvents: stats.totalEvents,
    highestSeverity: stats.highestSeverity,
    averageConfidence: stats.averageConfidence,
    averageScore: stats.averageScore,
    eventCounts: stats.eventCounts,
  };
}
