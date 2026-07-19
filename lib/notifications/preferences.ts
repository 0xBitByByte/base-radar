/**
 * Notification preferences. Keyed by `NotificationType` directly (not a
 * separately-named field per type) so it stays impossible for the
 * preference vocabulary to drift from the type vocabulary Timeline and the
 * Notification Engine already share.
 *
 * PR19 Part 3 backs this with `localStorage` — the same read/write-with-a-
 * version-guard shape `lib/watchlist/storage.ts` uses (SSR-safe, falls back
 * to `DEFAULT_NOTIFICATION_PREFERENCES` rather than throwing on a corrupted
 * or foreign value under this key) — plus a small in-memory cache and
 * listener set so `lib/hooks/useNotificationPreferences.ts` can bind to it
 * with `useSyncExternalStore`, the same pattern every other Notification
 * hook already uses.
 */

import { TIMELINE_EVENT_TYPES } from "@/lib/timeline/types";
import type { Notification, NotificationType } from "@/lib/notifications/types";

export type NotificationPreferences = Record<NotificationType, boolean>;

/** Sensible default: every notification type enabled — nothing is muted until the user says otherwise. */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  alert: true,
  opportunity: true,
  security: true,
  governance: true,
  development: true,
  tvl: true,
  narrative: true,
  recommendation: true,
  portfolio: true,
  "daily-brief": true,
};

export function isNotificationTypeEnabled(preferences: NotificationPreferences, type: NotificationType): boolean {
  return preferences[type];
}

/** Pure filter — narrows an already-built `Notification[]`, never regenerates or reorders it. */
export function filterNotificationsByPreferences(
  notifications: Notification[],
  preferences: NotificationPreferences
): Notification[] {
  return notifications.filter((notification) => isNotificationTypeEnabled(preferences, notification.type));
}

const NOTIFICATION_PREFERENCES_STORAGE_KEY = "base-radar:notification-preferences";
const NOTIFICATION_PREFERENCES_VERSION = 1;

type PersistedNotificationPreferences = {
  version: number;
  preferences: NotificationPreferences;
};

function isValidNotificationPreferences(value: unknown): value is PersistedNotificationPreferences {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<PersistedNotificationPreferences>;
  if (candidate.version !== NOTIFICATION_PREFERENCES_VERSION) return false;
  if (typeof candidate.preferences !== "object" || candidate.preferences === null) return false;
  return TIMELINE_EVENT_TYPES.every((type) => typeof (candidate.preferences as NotificationPreferences)[type] === "boolean");
}

/** SSR-safe and resilient to a corrupted/foreign value under this key — either case falls back to the defaults rather than throwing. */
function readPersistedPreferences(): NotificationPreferences {
  if (typeof window === "undefined") return DEFAULT_NOTIFICATION_PREFERENCES;

  try {
    const raw = window.localStorage.getItem(NOTIFICATION_PREFERENCES_STORAGE_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_PREFERENCES;
    const parsed = JSON.parse(raw);
    return isValidNotificationPreferences(parsed) ? parsed.preferences : DEFAULT_NOTIFICATION_PREFERENCES;
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

/** Best-effort — `localStorage.setItem` can throw (quota exceeded, private browsing), in which case the in-memory cache is still correct for the rest of this tab's session even though it won't survive a refresh. */
function writePersistedPreferences(preferences: NotificationPreferences): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      NOTIFICATION_PREFERENCES_STORAGE_KEY,
      JSON.stringify({ version: NOTIFICATION_PREFERENCES_VERSION, preferences })
    );
  } catch {
    // Intentionally swallowed — see doc comment above.
  }
}

let cachedPreferences: NotificationPreferences | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

/** The one public entry point — same reference returned until a real preference change happens. */
export function getNotificationPreferences(): NotificationPreferences {
  if (!cachedPreferences) {
    cachedPreferences = readPersistedPreferences();
  }
  return cachedPreferences;
}

export function setNotificationTypeEnabled(type: NotificationType, enabled: boolean): void {
  const current = getNotificationPreferences();
  if (current[type] === enabled) return;

  const next = { ...current, [type]: enabled };
  cachedPreferences = next;
  writePersistedPreferences(next);
  notify();
}

/** Registers `listener` to be called after a preference change — the exact shape `useSyncExternalStore` expects. */
export function subscribeToNotificationPreferences(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
