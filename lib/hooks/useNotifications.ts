"use client";

/**
 * React binding for `lib/notifications/storage.ts`'s `getNotifications()` —
 * the same `useSyncExternalStore` pattern `useTimeline.ts` already uses.
 * Subscribes to three sources: `lib/alerts/service.ts` and
 * `lib/watchlist/service.ts` (the two real triggers that can change the
 * underlying Timeline `getNotifications()` is built from — same reasoning
 * `useTimeline.ts` documents) plus `lib/notifications/storage.ts`'s own
 * `subscribe` (the one additional trigger unique to this layer: a local
 * `markRead`/`markUnread`/`markAllRead`/`clearReadState` mutation, which
 * doesn't touch Timeline at all).
 *
 * PR19 Part 3 layers `lib/notifications/preferences.ts`'s
 * `getNotificationPreferences()` on top, via a second, independent
 * `useSyncExternalStore` binding — muting a notification type is a UI-layer
 * concern on top of the engine's output, not a second data source; this
 * hook still only ever reads `getNotifications()` for the underlying
 * Notification data itself.
 *
 * Returns an object bundling the data with its mutation functions — the
 * same shape `useVisibleAlerts()` already uses for `markRead`/`markUnread`/
 * `markAllRead` — so components stay presentational and never import
 * `lib/notifications/storage.ts`/`lib/notifications/preferences.ts`
 * directly.
 */

import { useMemo, useSyncExternalStore } from "react";

import {
  clearAllReadState,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
  subscribe as subscribeToNotifications,
} from "@/lib/notifications/storage";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  filterNotificationsByPreferences,
  getNotificationPreferences,
  subscribeToNotificationPreferences,
} from "@/lib/notifications/preferences";
import type { Notification } from "@/lib/notifications/types";
import { subscribe as subscribeToAlerts } from "@/lib/alerts/service";
import { subscribe as subscribeToWatchlist } from "@/lib/personalization/storage";

const EMPTY_NOTIFICATIONS: Notification[] = [];

function subscribe(onStoreChange: () => void): () => void {
  const unsubscribeAlerts = subscribeToAlerts(onStoreChange);
  const unsubscribeWatchlist = subscribeToWatchlist(onStoreChange);
  const unsubscribeNotifications = subscribeToNotifications(onStoreChange);
  return () => {
    unsubscribeAlerts();
    unsubscribeWatchlist();
    unsubscribeNotifications();
  };
}

function getServerSnapshot(): Notification[] {
  return EMPTY_NOTIFICATIONS;
}

function getPreferencesServerSnapshot() {
  return DEFAULT_NOTIFICATION_PREFERENCES;
}

export function useNotifications() {
  const rawNotifications = useSyncExternalStore(subscribe, getNotifications, getServerSnapshot);
  const preferences = useSyncExternalStore(
    subscribeToNotificationPreferences,
    getNotificationPreferences,
    getPreferencesServerSnapshot
  );

  const notifications = useMemo(
    () => filterNotificationsByPreferences(rawNotifications, preferences),
    [rawNotifications, preferences]
  );

  return {
    notifications,
    markRead: markNotificationRead,
    markUnread: markNotificationUnread,
    markAllRead: markAllNotificationsRead,
    clearReadState: clearAllReadState,
  };
}
