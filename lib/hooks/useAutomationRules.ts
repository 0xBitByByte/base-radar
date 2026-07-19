"use client";

/**
 * React binding for `lib/automation/rules.ts`'s rule-state overlay — the
 * same `useSyncExternalStore` pattern every other Automation/Notification
 * hook uses. Returns the current merged rule list plus `setEnabled`/`reset`,
 * the two mutations the Automation Preferences page needs; components
 * never import `lib/automation/rules.ts` directly.
 */

import { useSyncExternalStore } from "react";

import {
  DEFAULT_AUTOMATION_RULES,
  getAutomationRules,
  resetAutomationRules,
  setRuleEnabled,
  subscribeToAutomationRules,
} from "@/lib/automation/rules";

function getServerSnapshot() {
  return DEFAULT_AUTOMATION_RULES;
}

export function useAutomationRules() {
  const rules = useSyncExternalStore(subscribeToAutomationRules, getAutomationRules, getServerSnapshot);

  return {
    rules,
    setEnabled: setRuleEnabled,
    reset: resetAutomationRules,
  };
}
