/**
 * The Automation Engine's runtime cache and public entry point — no
 * backend, no polling, no timers, the same "pure runtime cache" rule
 * `lib/notifications/storage.ts` already follows. `cachedAutomationResults`
 * is rebuilt only when `getNotifications()` or `getAutomationRules()`
 * returns a genuinely new reference — both already guarantee a stable
 * reference between real changes, so tracking them is sufficient here.
 *
 * PR20 Part 3 adds the master `AutomationPreferences.enabled` check: when
 * disabled, this returns an empty array immediately, without evaluating a
 * single rule — a real kill switch, not just a UI-level filter, and it
 * keeps "never evaluate rules in the UI" true in the strongest sense
 * (rules aren't even evaluated here when the system is off).
 */

import { buildAutomationResults } from "@/lib/automation/engine";
import { getAutomationPreferences } from "@/lib/automation/preferences";
import { getAutomationRules } from "@/lib/automation/rules";
import type { AutomationResult, AutomationRule } from "@/lib/automation/types";
import { getNotifications } from "@/lib/notifications/storage";
import type { Notification } from "@/lib/notifications/types";

const EMPTY_AUTOMATION_RESULTS: AutomationResult[] = [];

let cachedSourceNotifications: Notification[] | null = null;
let cachedSourceRules: AutomationRule[] | null = null;
let cachedAutomationResults: AutomationResult[] | null = null;

/** The one public entry point — reuses `getNotifications()` and `getAutomationRules()`; never touches Timeline, Portfolio Intelligence, Daily Brief, the AI Intelligence Engine, the Alert Engine, or a provider. Same reference returned until the underlying Notifications or rule state actually change. */
export function getAutomationResults(): AutomationResult[] {
  if (!getAutomationPreferences().enabled) return EMPTY_AUTOMATION_RESULTS;

  const notifications = getNotifications();
  const rules = getAutomationRules();

  if (
    !cachedAutomationResults ||
    cachedSourceNotifications !== notifications ||
    cachedSourceRules !== rules
  ) {
    cachedSourceNotifications = notifications;
    cachedSourceRules = rules;
    cachedAutomationResults = buildAutomationResults(notifications, rules);
  }

  return cachedAutomationResults;
}
