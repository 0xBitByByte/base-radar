/**
 * Pure, presentation-only filtering by the active Personal Watchlist —
 * PR22 Part 2. Every function here only narrows an array (or an engine
 * object's own list-shaped fields) that some other engine already computed;
 * none of them call a provider, recompute an engine, or duplicate a
 * `Project`/event/notification object. Matching is by `projectId` only.
 *
 * Items with `projectId === null` (market-wide/aggregate-level content —
 * narrative trends, recommendations, portfolio/brief roll-ups) always pass
 * through unfiltered: a watchlist scopes *project-specific* content, it
 * can't be said to exclude content that isn't about any single project.
 *
 * Scalar/aggregate fields on `PortfolioIntelligence`/`DailyBrief`
 * (`projectCount`, `averageScore`, `headline`, etc.) are never touched here —
 * same precedent already established by `Timeline.tsx`'s own search feature,
 * which reads `totalEvents`/`averageConfidence` off the raw, un-filtered
 * engine output rather than recomputing them for a filtered subset.
 */

import type { IntelligenceAlert } from "@/lib/alerts/intelligence/types";
import type { AutomationResult } from "@/lib/automation/types";
import type { DailyBrief } from "@/lib/brief/types";
import type { Notification } from "@/lib/notifications/types";
import type { PersonalWatchlist } from "@/lib/personalization/types";
import type { PortfolioIntelligence } from "@/lib/portfolio/types";
import type { TimelineEvent } from "@/lib/timeline/types";

function matchesWatchlist(projectId: string | null, projectIds: Set<string>): boolean {
  return projectId === null || projectIds.has(projectId);
}

/**
 * Every `IntelligenceAlert` is inherently project-specific (`projectId` is a
 * plain, non-nullable `string`, unlike Timeline/Notifications/Automation's
 * mix of project-specific and aggregate items) — so unlike the other
 * filters here, there's no null-passthrough case to consider.
 */
export function filterIntelligenceAlertsByWatchlist(
  alerts: IntelligenceAlert[],
  watchlist: PersonalWatchlist | null
): IntelligenceAlert[] {
  if (!watchlist) return alerts;
  const projectIds = new Set(watchlist.projectIds);
  return alerts.filter((alert) => projectIds.has(alert.projectId));
}

export function filterTimelineEventsByWatchlist(
  events: TimelineEvent[],
  watchlist: PersonalWatchlist | null
): TimelineEvent[] {
  if (!watchlist) return events;
  const projectIds = new Set(watchlist.projectIds);
  return events.filter((event) => matchesWatchlist(event.projectId, projectIds));
}

export function filterNotificationsByWatchlist(
  notifications: Notification[],
  watchlist: PersonalWatchlist | null
): Notification[] {
  if (!watchlist) return notifications;
  const projectIds = new Set(watchlist.projectIds);
  return notifications.filter((notification) => matchesWatchlist(notification.projectId, projectIds));
}

export function filterAutomationResultsByWatchlist(
  results: AutomationResult[],
  watchlist: PersonalWatchlist | null
): AutomationResult[] {
  if (!watchlist) return results;
  const projectIds = new Set(watchlist.projectIds);
  return results.filter((result) => matchesWatchlist(result.projectId, projectIds));
}

export function filterPortfolioIntelligenceByWatchlist(
  portfolio: PortfolioIntelligence | null,
  watchlist: PersonalWatchlist | null
): PortfolioIntelligence | null {
  if (!portfolio || !watchlist) return portfolio;
  const projectIds = new Set(watchlist.projectIds);
  return {
    ...portfolio,
    topPerformers: portfolio.topPerformers.filter((performer) => projectIds.has(performer.projectId)),
    projectsNeedingAttention: portfolio.projectsNeedingAttention.filter((highlight) => projectIds.has(highlight.projectId)),
    securityRisks: portfolio.securityRisks.filter((highlight) => projectIds.has(highlight.projectId)),
    governanceWatch: portfolio.governanceWatch.filter((highlight) => projectIds.has(highlight.projectId)),
    developmentMomentum: portfolio.developmentMomentum.filter((highlight) => projectIds.has(highlight.projectId)),
  };
}

export function filterDailyBriefByWatchlist(brief: DailyBrief | null, watchlist: PersonalWatchlist | null): DailyBrief | null {
  if (!brief || !watchlist) return brief;
  const projectIds = new Set(watchlist.projectIds);
  return {
    ...brief,
    topOpportunities: brief.topOpportunities.filter((opportunity) => projectIds.has(opportunity.projectId)),
    securityHighlights: brief.securityHighlights.filter((highlight) => projectIds.has(highlight.projectId)),
    governanceHighlights: brief.governanceHighlights.filter((highlight) => projectIds.has(highlight.projectId)),
    developmentHighlights: brief.developmentHighlights.filter((highlight) => projectIds.has(highlight.projectId)),
    tvlHighlights: brief.tvlHighlights.filter((highlight) => projectIds.has(highlight.projectId)),
  };
}
