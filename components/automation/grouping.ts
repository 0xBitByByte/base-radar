/**
 * The Automation Center's date-bucketing logic — the ONE place automation
 * results are grouped into Today/Yesterday/Earlier, mirroring
 * `components/notifications/grouping.ts`/`components/timeline/grouping.ts`
 * exactly (same day-boundary math, same "reading the current date is a
 * legitimate presentation-layer concern" reasoning — the Automation
 * Engine itself never touches `Date.now()`, only this UI-layer helper
 * does).
 */

import type { AutomationResult } from "@/lib/automation/types";

export const AUTOMATION_GROUP_KEYS = ["today", "yesterday", "earlier"] as const;
export type AutomationGroupKey = (typeof AUTOMATION_GROUP_KEYS)[number];

export const AUTOMATION_GROUP_LABEL: Record<AutomationGroupKey, string> = {
  today: "Today",
  yesterday: "Yesterday",
  earlier: "Earlier",
};

export function groupAutomationResults(results: AutomationResult[]): Record<AutomationGroupKey, AutomationResult[]> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const groups: Record<AutomationGroupKey, AutomationResult[]> = { today: [], yesterday: [], earlier: [] };

  for (const result of results) {
    const triggeredAt = new Date(result.triggeredAt);
    if (triggeredAt >= startOfToday) {
      groups.today.push(result);
    } else if (triggeredAt >= startOfYesterday) {
      groups.yesterday.push(result);
    } else {
      groups.earlier.push(result);
    }
  }

  return groups;
}
