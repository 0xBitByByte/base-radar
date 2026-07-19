/**
 * Automation Engine — the pipeline entry point (PR20 Part 1).
 * `buildAutomationResults` is a pure function: same `Notification[]` and
 * `AutomationRule[]` in, same `AutomationResult[]` out, every time — no
 * fetching, no caching, no `Date.now()` (exactly like
 * `lib/notifications/engine.ts`'s `buildNotifications`). `storage.ts` is
 * the only place that actually calls `getNotifications()`.
 *
 * This does not generate intelligence, call a provider, call Timeline, or
 * modify any Notification — every result is a reshape of one already-real
 * `(rule, notification)` match, evaluated entirely through
 * `lib/automation/rules.ts`'s `matchesRule` (the one centralized place
 * matching logic lives, per the PR brief's "no duplicated switch
 * statements").
 *
 * The pipeline:
 *   1. For every enabled rule, check every notification against it.
 *   2. Reshape every real match into an `AutomationResult`.
 *   3. De-duplicate by id, then stable sort descending by `triggeredAt`.
 */

import { matchesRule } from "@/lib/automation/rules";
import type { AutomationResult, AutomationRule } from "@/lib/automation/types";
import type { Notification } from "@/lib/notifications/types";

function toAutomationResult(rule: AutomationRule, notification: Notification): AutomationResult {
  return {
    id: `automation:${rule.id}:${notification.id}`,
    ruleId: rule.id,
    notificationId: notification.id,
    title: rule.name,
    summary: `${rule.description} Matched "${notification.title}".`,
    status: "triggered",
    triggeredAt: notification.timestamp,
    projectId: notification.projectId,
    projectName: notification.projectName,
    priority: rule.priority,
    link: notification.link,
    metadata: { trigger: rule.trigger, actions: rule.actions },
  };
}

/**
 * Defensive de-duplication by `id` — the `ruleId`/`notificationId`
 * composite already guarantees uniqueness per match, but "no duplicate
 * ids" is an explicit pipeline requirement, so this is enforced directly
 * rather than only assumed. First occurrence wins.
 */
function dedupeAutomationResultsById(results: AutomationResult[]): AutomationResult[] {
  const seen = new Set<string>();
  const deduped: AutomationResult[] = [];
  for (const result of results) {
    if (seen.has(result.id)) continue;
    seen.add(result.id);
    deduped.push(result);
  }
  return deduped;
}

/** Stable — results with an identical `triggeredAt` keep their original relative order rather than being shuffled. */
function sortAutomationResultsByTriggeredAtDescending(results: AutomationResult[]): AutomationResult[] {
  return [...results].sort((a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime());
}

/** The one public entry point for turning `Notification[]` + `AutomationRule[]` into `AutomationResult[]`. Pure — never calls `getNotifications()` itself; `storage.ts` supplies it. */
export function buildAutomationResults(notifications: Notification[], rules: AutomationRule[]): AutomationResult[] {
  const results: AutomationResult[] = [];
  for (const rule of rules) {
    for (const notification of notifications) {
      if (!matchesRule(notification, rule)) continue;
      results.push(toAutomationResult(rule, notification));
    }
  }

  const deduped = dedupeAutomationResultsById(results);
  return sortAutomationResultsByTriggeredAtDescending(deduped);
}
