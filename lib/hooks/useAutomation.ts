"use client";

/**
 * React binding for `lib/automation/storage.ts`'s `getAutomationResults()` —
 * the same `useSyncExternalStore` pattern every other engine hook in this
 * app uses. Subscribes to five sources: `lib/alerts/service.ts` and
 * `lib/watchlist/service.ts` (the two real triggers that can change the
 * underlying Notifications `getAutomationResults()` is built from — same
 * reasoning `useNotifications.ts`/`useTimeline.ts` document),
 * `lib/notifications/storage.ts`'s own `subscribe` (a read-state mutation
 * can flip whether an `isRead`-conditioned rule still matches), plus
 * PR20 Part 3's two new sources — `lib/automation/rules.ts`'s
 * `subscribeToAutomationRules` (an enable/disable/reset changes which
 * rules can fire) and `lib/automation/preferences.ts`'s
 * `subscribeToAutomationPreferences` (the master on/off toggle). None of
 * these reads Notification/rule/preference *data* directly here — only
 * `getAutomationResults()` is ever called for data, per the PR brief's
 * "consume `getAutomationResults()` only."
 *
 * Returns `{ results, enabled }` — `enabled` mirrors the master
 * preference so consumers (`AutomationCenter`, `AutomationWidget`) can
 * show a distinct "Automation is disabled" state instead of conflating it
 * with "no rules matched."
 */

import { useSyncExternalStore } from "react";

import { DEFAULT_AUTOMATION_PREFERENCES, getAutomationPreferences, subscribeToAutomationPreferences } from "@/lib/automation/preferences";
import { subscribeToAutomationRules } from "@/lib/automation/rules";
import { getAutomationResults } from "@/lib/automation/storage";
import type { AutomationResult } from "@/lib/automation/types";
import { subscribe as subscribeToAlerts } from "@/lib/alerts/service";
import { subscribe as subscribeToNotifications } from "@/lib/notifications/storage";
import { subscribe as subscribeToWatchlist } from "@/lib/personalization/storage";

const EMPTY_AUTOMATION_RESULTS: AutomationResult[] = [];

function subscribe(onStoreChange: () => void): () => void {
  const unsubscribeAlerts = subscribeToAlerts(onStoreChange);
  const unsubscribeWatchlist = subscribeToWatchlist(onStoreChange);
  const unsubscribeNotifications = subscribeToNotifications(onStoreChange);
  const unsubscribeRules = subscribeToAutomationRules(onStoreChange);
  const unsubscribePreferences = subscribeToAutomationPreferences(onStoreChange);
  return () => {
    unsubscribeAlerts();
    unsubscribeWatchlist();
    unsubscribeNotifications();
    unsubscribeRules();
    unsubscribePreferences();
  };
}

function getServerSnapshot(): AutomationResult[] {
  return EMPTY_AUTOMATION_RESULTS;
}

function getPreferencesServerSnapshot() {
  return DEFAULT_AUTOMATION_PREFERENCES;
}

export function useAutomation() {
  const results = useSyncExternalStore(subscribe, getAutomationResults, getServerSnapshot);
  const preferences = useSyncExternalStore(
    subscribeToAutomationPreferences,
    getAutomationPreferences,
    getPreferencesServerSnapshot
  );

  return { results, enabled: preferences.enabled };
}
