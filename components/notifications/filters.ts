/**
 * The Notification Center's search/filter layer. Every function here is
 * pure and operates only on an already-built `Notification[]` — none of
 * them call `getNotifications()`, so this is presentation-layer query
 * logic, not a second copy of the Notification Engine. Colocated here (not
 * under `lib/notifications/`) for the same reason
 * `components/timeline/filters.ts` is colocated with its feature.
 */

import { TIMELINE_FILTER_LABEL } from "@/components/timeline/filters";
import { NOTIFICATION_PRIORITY_RANK } from "@/components/notifications/meta";
import type { Notification, NotificationType } from "@/lib/notifications/types";

/** Reused directly, not redefined — `NotificationType` is the exact same union as `TimelineEventType`. */
export const NOTIFICATION_TYPE_FILTER_LABEL = TIMELINE_FILTER_LABEL;

export const NOTIFICATION_READ_FILTERS = ["all", "unread", "read"] as const;
export type NotificationReadFilter = (typeof NOTIFICATION_READ_FILTERS)[number];

export const NOTIFICATION_READ_FILTER_LABEL: Record<NotificationReadFilter, string> = {
  all: "All",
  unread: "Unread",
  read: "Read",
};

function matchesQuery(text: string, normalizedQuery: string): boolean {
  return normalizedQuery === "" || text.toLowerCase().includes(normalizedQuery);
}

/** Matches project name, title, summary, type, and source — never regenerates or reorders anything, purely narrows. */
export function filterNotificationsByQuery(notifications: Notification[], normalizedQuery: string): Notification[] {
  if (normalizedQuery === "") return notifications;
  return notifications.filter(
    (notification) =>
      (notification.projectName !== null && matchesQuery(notification.projectName, normalizedQuery)) ||
      matchesQuery(notification.title, normalizedQuery) ||
      matchesQuery(notification.summary, normalizedQuery) ||
      matchesQuery(NOTIFICATION_TYPE_FILTER_LABEL[notification.type], normalizedQuery) ||
      matchesQuery(notification.source, normalizedQuery)
  );
}

export function filterNotificationsByReadState(
  notifications: Notification[],
  state: NotificationReadFilter
): Notification[] {
  if (state === "all") return notifications;
  return notifications.filter((notification) => (state === "unread" ? !notification.isRead : notification.isRead));
}

export function filterNotificationsByType(
  notifications: Notification[],
  type: NotificationType | "all"
): Notification[] {
  if (type === "all") return notifications;
  return notifications.filter((notification) => notification.type === type);
}

export const NOTIFICATION_SORTS = ["newest", "oldest", "priority"] as const;
export type NotificationSort = (typeof NOTIFICATION_SORTS)[number];

export const NOTIFICATION_SORT_LABEL: Record<NotificationSort, string> = {
  newest: "Newest",
  oldest: "Oldest",
  priority: "Highest Priority",
};

/**
 * Pure — never rebuilds or refetches notifications, never fabricates a
 * timestamp for "Oldest"/"Newest" (both read each notification's own real
 * `timestamp`). `Array.prototype.sort` is stable (guaranteed since ES2019),
 * so notifications with an identical timestamp or priority keep their
 * original relative order rather than being shuffled — the same guarantee
 * `components/timeline/filters.ts`'s `sortTimelineEvents` documents.
 */
export function sortNotifications(notifications: Notification[], order: NotificationSort): Notification[] {
  const sorted = [...notifications];
  switch (order) {
    case "oldest":
      return sorted.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    case "priority":
      return sorted.sort((a, b) => NOTIFICATION_PRIORITY_RANK[b.priority] - NOTIFICATION_PRIORITY_RANK[a.priority]);
    case "newest":
    default:
      return sorted.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
}
