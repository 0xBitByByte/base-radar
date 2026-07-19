/**
 * The Notification Center's date-bucketing logic — the ONE place
 * notifications are grouped into Today/Yesterday/Earlier, mirroring
 * `components/timeline/grouping.ts` exactly (same day-boundary math, same
 * "reading the current date is a legitimate presentation-layer concern"
 * reasoning — the Notification Engine itself never touches `Date.now()`,
 * only this UI-layer helper does).
 */

import type { Notification } from "@/lib/notifications/types";

export const NOTIFICATION_GROUP_KEYS = ["today", "yesterday", "earlier"] as const;
export type NotificationGroupKey = (typeof NOTIFICATION_GROUP_KEYS)[number];

export const NOTIFICATION_GROUP_LABEL: Record<NotificationGroupKey, string> = {
  today: "Today",
  yesterday: "Yesterday",
  earlier: "Earlier",
};

export function groupNotifications(notifications: Notification[]): Record<NotificationGroupKey, Notification[]> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const groups: Record<NotificationGroupKey, Notification[]> = { today: [], yesterday: [], earlier: [] };

  for (const notification of notifications) {
    const notificationDate = new Date(notification.timestamp);
    if (notificationDate >= startOfToday) {
      groups.today.push(notification);
    } else if (notificationDate >= startOfYesterday) {
      groups.yesterday.push(notification);
    } else {
      groups.earlier.push(notification);
    }
  }

  return groups;
}
