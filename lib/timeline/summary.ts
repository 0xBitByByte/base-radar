/**
 * Deterministic headline/executive-summary prose for the Intelligence
 * Timeline — the same template approach `lib/brief/summary.ts` and
 * `lib/portfolio/summary.ts` already use. No randomness, no AI API.
 */

import type { TimelineStats } from "@/lib/timeline/sections";

/** Exported for reuse by the UI layer (`useTimelineMetrics`, `Timeline.tsx`) so "Highest Severity" is formatted identically everywhere instead of each caller writing its own capitalization. */
export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Static by design — `Timeline.generatedAt` carries the real timestamp. */
export function buildTimelineHeadline(): string {
  return "Intelligence Timeline";
}

export function buildTimelineSummary(stats: TimelineStats): string {
  if (stats.totalEvents === 0) {
    return "No timeline events are available yet.";
  }

  const eventClause = `${stats.totalEvents} event${stats.totalEvents === 1 ? "" : "s"} across your Watchlist`;

  if (!stats.highestSeverity) {
    return `${eventClause}.`;
  }

  return `${eventClause}, highest severity ${capitalize(stats.highestSeverity)}.`;
}
