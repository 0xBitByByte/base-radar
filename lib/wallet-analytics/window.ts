/**
 * V4-ANALYTICS-001A (Phase 2) — Time-aware Analytics. This file does exactly
 * one thing: filter an `AutomationSnapshot[]`/`WalletEvent[]` down to a
 * window. It contains NO trend/evolution/allocation logic of its own —
 * `engine.ts` hands the FILTERED array to the same, byte-for-byte-unchanged
 * `buildTrends()`/`buildPortfolioEvolution()`/`buildAllocationAnalytics()`/
 * `buildAnalyticsTimeline()` every other window (including the original
 * `"all"` behavior) already used. "The existing Trend engine should simply
 * receive a filtered snapshot set" — per the brief, verbatim.
 */

import type { AnalyticsWindow } from "@/lib/wallet-analytics/types";
import type { AutomationSnapshot, WalletEvent } from "@/lib/wallet-automation/types";

export const ANALYTICS_WINDOWS: AnalyticsWindow[] = ["24h", "7d", "30d", "thisMonth", "all"];

export const ANALYTICS_WINDOW_LABEL: Record<AnalyticsWindow, string> = {
  "24h": "Last 24 Hours",
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  thisMonth: "This Month",
  all: "Entire History",
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** `null` return means "no lower bound" — i.e. `window: "all"`. */
function windowStartMs(window: AnalyticsWindow, nowMs: number): number | null {
  switch (window) {
    case "24h":
      return nowMs - DAY_MS;
    case "7d":
      return nowMs - 7 * DAY_MS;
    case "30d":
      return nowMs - 30 * DAY_MS;
    case "thisMonth": {
      const now = new Date(nowMs);
      return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
    }
    case "all":
      return null;
  }
}

export function filterHistoryByWindow(history: AutomationSnapshot[], window: AnalyticsWindow, now: string): AutomationSnapshot[] {
  if (window === "all") return history;
  const startMs = windowStartMs(window, new Date(now).getTime())!;
  return history.filter((snapshot) => new Date(snapshot.timestamp).getTime() >= startMs);
}

export function filterEventsByWindow(events: WalletEvent[], window: AnalyticsWindow, now: string): WalletEvent[] {
  if (window === "all") return events;
  const startMs = windowStartMs(window, new Date(now).getTime())!;
  return events.filter((event) => new Date(event.timestamp).getTime() >= startMs);
}
