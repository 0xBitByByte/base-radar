/**
 * Per-rule presentation stats derived purely from an already-built
 * `AutomationResult[]` — colocated with `filters.ts`/`grouping.ts`/
 * `summary.ts` for the same reason: this reads the Automation Engine's
 * output, it never re-evaluates a rule or calls `getAutomationResults()`
 * itself. `buildAutomationResults` (`lib/automation/engine.ts`) already
 * guarantees its output is sorted newest-`triggeredAt`-first, so the first
 * match seen per `ruleId` while iterating is that rule's most recent
 * trigger — this never re-sorts or recomputes anything the engine already
 * decided.
 */

import type { AutomationResult } from "@/lib/automation/types";

export type AutomationRuleStats = {
  /** The matched notification's own `triggeredAt` for this rule's most recent match, or `null` if the rule has never matched anything in the current result set. */
  lastTriggeredAt: string | null;
  /** How many real matches this rule has in the current result set. */
  triggerCount: number;
};

const EMPTY_STATS: AutomationRuleStats = { lastTriggeredAt: null, triggerCount: 0 };

export function buildAutomationRuleStats(results: AutomationResult[]): Map<string, AutomationRuleStats> {
  const stats = new Map<string, AutomationRuleStats>();
  for (const result of results) {
    const existing = stats.get(result.ruleId);
    if (existing) {
      existing.triggerCount += 1;
    } else {
      stats.set(result.ruleId, { lastTriggeredAt: result.triggeredAt, triggerCount: 1 });
    }
  }
  return stats;
}

export function getAutomationRuleStats(stats: Map<string, AutomationRuleStats>, ruleId: string): AutomationRuleStats {
  return stats.get(ruleId) ?? EMPTY_STATS;
}
