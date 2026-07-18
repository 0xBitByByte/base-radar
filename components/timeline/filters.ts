/**
 * PR18 Part 3 — the Timeline page's search/filter/sort layer. Every
 * function here is pure and operates only on an already-built
 * `TimelineEvent[]` — none of them call `getTimeline()`/`buildTimeline()`,
 * so this is presentation-layer query logic, not a second copy of the
 * Timeline engine's aggregation logic. Colocated here (not under
 * `lib/timeline/`) for the same reason `components/brief/filters.ts` and
 * `components/portfolio/filters.ts` are colocated with their features.
 */

import { NARRATIVE_LABEL } from "@/components/alerts/meta";
import { TIMELINE_EVENT_LABEL } from "@/components/timeline/TimelineEventBadge";
import { SEVERITY_RANK } from "@/lib/alerts/intelligence/engine";
import type { TimelineEvent, TimelineEventType } from "@/lib/timeline/types";

/** Plural/category phrasing for the filter dropdown — deliberately different from `TIMELINE_EVENT_LABEL`'s singular per-item badge text ("Alert" on one event vs. "Alerts" naming the whole category), the same singular-badge/plural-filter split `NARRATIVE_LABEL`/`NARRATIVE_SUMMARY_LABEL` already establish. */
export const TIMELINE_FILTER_LABEL: Record<TimelineEventType, string> = {
  alert: "Alerts",
  opportunity: "Opportunities",
  security: "Security",
  governance: "Governance",
  development: "Development",
  tvl: "TVL",
  narrative: "Narratives",
  recommendation: "Recommendations",
  portfolio: "Portfolio",
  "daily-brief": "Daily Brief",
};

function matchesQuery(text: string, normalizedQuery: string): boolean {
  return normalizedQuery === "" || text.toLowerCase().includes(normalizedQuery);
}

/** Matches project name, title, summary, narrative, event type, and source — never regenerates or reorders anything, purely narrows. */
export function filterTimelineEvents(events: TimelineEvent[], normalizedQuery: string): TimelineEvent[] {
  if (normalizedQuery === "") return events;
  return events.filter(
    (event) =>
      (event.projectName !== null && matchesQuery(event.projectName, normalizedQuery)) ||
      matchesQuery(event.title, normalizedQuery) ||
      matchesQuery(event.summary, normalizedQuery) ||
      (event.narrative !== null && matchesQuery(NARRATIVE_LABEL[event.narrative], normalizedQuery)) ||
      matchesQuery(TIMELINE_EVENT_LABEL[event.eventType], normalizedQuery) ||
      matchesQuery(event.source, normalizedQuery)
  );
}

export const TIMELINE_SORTS = ["newest", "oldest", "severity", "confidence"] as const;
export type TimelineSort = (typeof TIMELINE_SORTS)[number];

export const TIMELINE_SORT_LABEL: Record<TimelineSort, string> = {
  newest: "Newest",
  oldest: "Oldest",
  severity: "Highest Severity",
  confidence: "Highest Confidence",
};

/**
 * Pure — never rebuilds the Timeline, never fabricates a timestamp for
 * "Oldest"/"Newest" (both read each event's own real `timestamp`).
 * Events with no real `severity`/`confidence` (the aggregate event types)
 * sort after every event that has one — an internal ordering-only
 * sentinel, never displayed as a real value.
 */
export function sortTimelineEvents(events: TimelineEvent[], order: TimelineSort): TimelineEvent[] {
  const sorted = [...events];
  switch (order) {
    case "oldest":
      return sorted.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    case "severity":
      return sorted.sort((a, b) => {
        const rankA = a.severity ? SEVERITY_RANK[a.severity] : -1;
        const rankB = b.severity ? SEVERITY_RANK[b.severity] : -1;
        return rankB - rankA;
      });
    case "confidence":
      return sorted.sort((a, b) => (b.confidence ?? -1) - (a.confidence ?? -1));
    case "newest":
    default:
      return sorted.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
}
