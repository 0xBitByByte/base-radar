/**
 * The Automation Center's search/filter layer. Every function here is
 * pure and operates only on an already-built `AutomationResult[]` — none
 * of them call `getAutomationResults()`, so this is presentation-layer
 * query logic, not a second copy of the Automation Engine. Colocated here
 * (not under `lib/automation/`) for the same reason
 * `components/notifications/filters.ts` is colocated with its feature.
 */

import { AUTOMATION_ACTIONS, type AutomationAction, type AutomationResult, type AutomationTriggerType } from "@/lib/automation/types";
import { NOTIFICATION_PRIORITIES, type NotificationPriority } from "@/lib/notifications/types";

/** `AutomationResult.metadata.actions` is `Record<string, unknown>`-typed at the model level (never a fabricated shape) — this narrows what `buildAutomationResults` actually put there, falling back to `[]` only if the shape is ever unexpectedly malformed. */
export function getResultActions(result: AutomationResult): AutomationAction[] {
  const actions = result.metadata.actions;
  if (!Array.isArray(actions)) return [];
  return actions.filter((action): action is AutomationAction => AUTOMATION_ACTIONS.includes(action));
}

/** Same narrowing for `AutomationResult.metadata.trigger`. */
export function getResultTrigger(result: AutomationResult): AutomationTriggerType | null {
  const trigger = result.metadata.trigger;
  return typeof trigger === "string" ? (trigger as AutomationTriggerType) : null;
}

function matchesQuery(text: string, normalizedQuery: string): boolean {
  return normalizedQuery === "" || text.toLowerCase().includes(normalizedQuery);
}

/** Matches rule name, summary (which already carries the triggering notification's own title), and project name — never regenerates or reorders anything, purely narrows. */
export function filterAutomationResultsByQuery(results: AutomationResult[], normalizedQuery: string): AutomationResult[] {
  if (normalizedQuery === "") return results;
  return results.filter(
    (result) =>
      matchesQuery(result.title, normalizedQuery) ||
      matchesQuery(result.summary, normalizedQuery) ||
      (result.projectName !== null && matchesQuery(result.projectName, normalizedQuery))
  );
}

export const AUTOMATION_PRIORITY_FILTERS = ["all", ...NOTIFICATION_PRIORITIES] as const;
export type AutomationPriorityFilter = (typeof AUTOMATION_PRIORITY_FILTERS)[number];

export function filterAutomationResultsByPriority(
  results: AutomationResult[],
  priority: NotificationPriority | "all"
): AutomationResult[] {
  if (priority === "all") return results;
  return results.filter((result) => result.priority === priority);
}

export function filterAutomationResultsByAction(
  results: AutomationResult[],
  action: AutomationAction | "all"
): AutomationResult[] {
  if (action === "all") return results;
  return results.filter((result) => getResultActions(result).includes(action));
}
