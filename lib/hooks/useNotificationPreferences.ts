"use client";

/**
 * React binding for `lib/notifications/preferences.ts` — the same
 * `useSyncExternalStore` pattern every other Notification hook uses.
 * Returns the current preferences plus `setEnabled`, the one mutation the
 * Preferences page needs; components never import
 * `lib/notifications/preferences.ts` directly.
 */

import { useSyncExternalStore } from "react";

import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  getNotificationPreferences,
  setNotificationTypeEnabled,
  subscribeToNotificationPreferences,
} from "@/lib/notifications/preferences";

function getServerSnapshot() {
  return DEFAULT_NOTIFICATION_PREFERENCES;
}

export function useNotificationPreferences() {
  const preferences = useSyncExternalStore(
    subscribeToNotificationPreferences,
    getNotificationPreferences,
    getServerSnapshot
  );

  return {
    preferences,
    setEnabled: setNotificationTypeEnabled,
  };
}
