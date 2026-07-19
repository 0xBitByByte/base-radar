"use client";

/**
 * Formats `useNotifications()`'s already-computed array into the small
 * metric-tile list `NotificationMetric`/`NotificationCenter`/
 * `NotificationWidget` render — the only place that list is assembled;
 * every value is a straight read or count over `notifications`, never a
 * recomputation of anything Timeline/Portfolio/Brief/AI Intelligence
 * already decided. Memoized on the `notifications` reference.
 */

import { useMemo } from "react";

import { useNotifications } from "@/lib/hooks/useNotifications";

export type NotificationMetricItem = {
  key: string;
  label: string;
  value: string | number;
};

export function useNotificationMetrics(): NotificationMetricItem[] {
  const { notifications } = useNotifications();

  return useMemo(() => {
    const unread = notifications.filter((notification) => !notification.isRead).length;
    const critical = notifications.filter((notification) => notification.priority === "critical").length;
    const high = notifications.filter((notification) => notification.priority === "high").length;
    const projectIds = new Set(
      notifications
        .map((notification) => notification.projectId)
        .filter((projectId): projectId is string => projectId !== null)
    );

    return [
      { key: "total", label: "Total Notifications", value: notifications.length },
      { key: "unread", label: "Unread", value: unread },
      { key: "critical", label: "Critical", value: critical },
      { key: "high", label: "High Priority", value: high },
      { key: "projects", label: "Projects Affected", value: projectIds.size },
    ];
  }, [notifications]);
}
