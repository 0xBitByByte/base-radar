/**
 * The Timeline page's date-bucketing logic — the ONE place events are
 * grouped into Today/Yesterday/Earlier, so `Timeline.tsx` never
 * re-implements this itself ("never duplicate grouping logic"). Reading
 * the current date is a legitimate, unavoidable part of "which calendar
 * day is this" — the same category of current-time read
 * `lib/data/format.ts`'s `formatRelativeTime` already makes for display
 * purposes; the backend Timeline engine itself still never touches
 * `Date.now()`, only this presentation-layer helper does.
 */

import type { TimelineEvent } from "@/lib/timeline/types";

export const TIMELINE_GROUP_KEYS = ["today", "yesterday", "earlier"] as const;
export type TimelineGroupKey = (typeof TIMELINE_GROUP_KEYS)[number];

export const TIMELINE_GROUP_LABEL: Record<TimelineGroupKey, string> = {
  today: "Today",
  yesterday: "Yesterday",
  earlier: "Earlier",
};

export function groupTimelineEvents(events: TimelineEvent[]): Record<TimelineGroupKey, TimelineEvent[]> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const groups: Record<TimelineGroupKey, TimelineEvent[]> = { today: [], yesterday: [], earlier: [] };

  for (const event of events) {
    const eventDate = new Date(event.timestamp);
    if (eventDate >= startOfToday) {
      groups.today.push(event);
    } else if (eventDate >= startOfYesterday) {
      groups.yesterday.push(event);
    } else {
      groups.earlier.push(event);
    }
  }

  return groups;
}
