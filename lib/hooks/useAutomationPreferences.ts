"use client";

/**
 * React binding for `lib/automation/preferences.ts` — the same
 * `useSyncExternalStore` pattern every other Automation/Notification hook
 * uses. Returns the current preferences plus `setEnabled`, the master
 * on/off toggle the Automation Preferences page needs; components never
 * import `lib/automation/preferences.ts` directly.
 */

import { useSyncExternalStore } from "react";

import {
  DEFAULT_AUTOMATION_PREFERENCES,
  getAutomationPreferences,
  setAutomationEnabled,
  subscribeToAutomationPreferences,
} from "@/lib/automation/preferences";

function getServerSnapshot() {
  return DEFAULT_AUTOMATION_PREFERENCES;
}

export function useAutomationPreferences() {
  const preferences = useSyncExternalStore(
    subscribeToAutomationPreferences,
    getAutomationPreferences,
    getServerSnapshot
  );

  return {
    preferences,
    setEnabled: setAutomationEnabled,
  };
}
