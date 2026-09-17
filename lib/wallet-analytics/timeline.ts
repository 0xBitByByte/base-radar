/**
 * V4-ANALYTICS-001 (Phase 7) — the Analytics Timeline: a day-bucketed
 * reshaping of Wallet Automation's own real `WalletEvent[]` log — NOT a
 * second event-generation pass. Every entry here already exists as a real
 * `WalletEvent`; this file only groups and labels them by calendar day
 * ("Monday", "Tuesday", …) instead of the flat, most-recent-first order
 * `RecentWalletEventsSection` already shows.
 */

import type { AnalyticsTimelineEntry } from "@/lib/wallet-analytics/types";
import type { WalletEvent } from "@/lib/wallet-automation/types";

const DAY_LABEL_FORMAT = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric" });

function dateKey(timestamp: string): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

export function buildAnalyticsTimeline(events: WalletEvent[]): AnalyticsTimelineEntry[] {
  return [...events]
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .map((event) => ({
      id: event.id,
      dayLabel: DAY_LABEL_FORMAT.format(new Date(event.timestamp)),
      date: dateKey(event.timestamp),
      headline: event.title,
      tone: event.tone,
      timestamp: event.timestamp,
    }));
}
