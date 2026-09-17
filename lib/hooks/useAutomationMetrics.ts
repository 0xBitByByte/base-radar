"use client";

/**
 * V3-UX-001 — replaces the old "log analytics" tile set (Total/Critical/
 * High Priority/Rules Triggered/Projects Affected) with operational
 * metrics: what a user managing their automations actually wants to know
 * at a glance. Every value here is a straight read or count over
 * `useAutomation()`'s `results` and `useAutomationRules()`'s `rules` —
 * never a recomputation of anything the Automation Engine already decided,
 * and never a field that doesn't genuinely exist (no "Next Scheduled Run":
 * rules trigger on notification events, there's no cron/schedule concept
 * in `lib/automation/types.ts`; no "Running/Idle": there's no live
 * execution state, only a rule's own real `enabled` flag).
 *
 * Deliberately reads the SAME raw, un-personalized `results` the old
 * metrics tile used (not `usePersonalizedDashboard()`'s Watchlist-scoped
 * `automationResults`) — a rule's own operational stats (how often it
 * fires, when it last fired) describe the rule/system, not "your current
 * Watchlist," matching this file's pre-existing precedent.
 */

import { useMemo } from "react";

import { useAutomation } from "@/lib/hooks/useAutomation";
import { useAutomationRules } from "@/lib/hooks/useAutomationRules";

export type AutomationMetricItem = {
  key: string;
  label: string;
  /** ISO timestamp instead of a pre-formatted string for the one time-based metric, so the caller can render it with `RelativeTime` (live-updating, hydration-safe) rather than a static string computed once at render. */
  value: string | number;
  isTimestamp?: boolean;
};

export function useAutomationMetrics(): AutomationMetricItem[] {
  const { results } = useAutomation();
  const { rules } = useAutomationRules();

  return useMemo(() => {
    const activeCount = rules.filter((rule) => rule.enabled).length;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const triggeredToday = results.filter((result) => new Date(result.triggeredAt) >= startOfToday).length;

    // `results` is already sorted newest-`triggeredAt`-first by the engine
    // (`buildAutomationResults`), so the first entry is the most recent run.
    const lastRun = results[0]?.triggeredAt ?? null;

    const items: AutomationMetricItem[] = [
      { key: "active", label: "Active Automations", value: `${activeCount}/${rules.length}` },
      { key: "triggered-today", label: "Triggered Today", value: triggeredToday },
      { key: "all-time", label: "All-Time Triggers", value: results.length },
    ];

    if (lastRun) {
      items.push({ key: "last-run", label: "Last Run", value: lastRun, isTimestamp: true });
    }

    return items;
  }, [results, rules]);
}
