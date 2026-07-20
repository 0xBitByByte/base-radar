"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCheck, Gauge, Settings } from "lucide-react";

import {
  filterNotificationsByQuery,
  filterNotificationsByReadState,
  filterNotificationsByType,
  sortNotifications,
  NOTIFICATION_SORTS,
  type NotificationReadFilter,
  type NotificationSort,
} from "@/components/notifications/filters";
import {
  groupNotifications,
  NOTIFICATION_GROUP_KEYS,
  NOTIFICATION_GROUP_LABEL,
} from "@/components/notifications/grouping";
import { NotificationEmpty } from "@/components/notifications/NotificationEmpty";
import { NotificationFilters } from "@/components/notifications/NotificationFilters";
import { NotificationGroup } from "@/components/notifications/NotificationGroup";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import { NotificationMetric } from "@/components/notifications/NotificationMetric";
import { buildNotificationSummary } from "@/components/notifications/summary";
import { useNotificationMetrics } from "@/lib/hooks/useNotificationMetrics";
import { usePersonalizedDashboard } from "@/lib/hooks/usePersonalizedDashboard";
import type { NotificationType } from "@/lib/notifications/types";

const DEFAULT_READ_FILTER: NotificationReadFilter = "all";
const DEFAULT_TYPE_FILTER: NotificationType | "all" = "all";
const DEFAULT_SORT: NotificationSort = NOTIFICATION_SORTS[0];

/**
 * The dedicated Notification Center experience
 * (`app/dashboard/notifications/page.tsx`). Everything renders from
 * `usePersonalizedDashboard()` — no fetching, no rebuilding, never reading
 * Timeline/Portfolio Intelligence/Daily Brief/Intelligence Alerts
 * directly. Search/read-state/type/sort are pure, component-local UI
 * state; none of them ever trigger a notification rebuild. Date-group
 * headings (Today/Yesterday/Earlier) are omitted entirely when that group
 * has zero notifications. The Metrics section (`useNotificationMetrics`)
 * deliberately stays on the raw, un-personalized notification set — same
 * "aggregate figures never recompute for a filtered subset" precedent
 * `Timeline.tsx` already established.
 */
export function NotificationCenter() {
  const { notifications, hasNotifications, isPersonalized, activeWatchlist, markRead, markUnread, markAllRead } =
    usePersonalizedDashboard();
  const metrics = useNotificationMetrics();
  const [search, setSearch] = useState("");
  const [readState, setReadState] = useState<NotificationReadFilter>(DEFAULT_READ_FILTER);
  const [type, setType] = useState<NotificationType | "all">(DEFAULT_TYPE_FILTER);
  const [sort, setSort] = useState<NotificationSort>(DEFAULT_SORT);

  const normalizedQuery = search.trim().toLowerCase();
  const unreadCount = useMemo(() => notifications.filter((notification) => !notification.isRead).length, [notifications]);

  const filteredNotifications = useMemo(() => {
    const searched = filterNotificationsByQuery(notifications, normalizedQuery);
    const byReadState = filterNotificationsByReadState(searched, readState);
    const byType = filterNotificationsByType(byReadState, type);
    return sortNotifications(byType, sort);
  }, [notifications, normalizedQuery, readState, type, sort]);

  const groups = useMemo(() => groupNotifications(filteredNotifications), [filteredNotifications]);

  if (!hasNotifications) {
    return <NotificationEmpty variant="none" className="py-16" />;
  }

  if (isPersonalized && notifications.length === 0) {
    return <NotificationEmpty variant="watchlist" watchlistName={activeWatchlist?.name} className="py-16" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-semibold text-radar-light-text dark:text-radar-white">Notifications</h1>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead()}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-radar-primary outline-none transition-colors hover:bg-radar-primary/10 focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-accent dark:hover:bg-radar-accent/10"
              >
                <CheckCheck className="size-3.5" aria-hidden="true" />
                Mark all read
              </button>
            )}
            <Link
              href="/dashboard/settings/notifications"
              aria-label="Notification preferences"
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-radar-light-muted outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:bg-white/5"
            >
              <Settings className="size-3.5" aria-hidden="true" />
              Preferences
            </Link>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-radar-light-muted dark:text-radar-muted">
          {buildNotificationSummary(notifications.length, unreadCount)}
        </p>
      </div>

      <section aria-labelledby="notification-metrics-heading" className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5">
          <Gauge className="size-4 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
          <h2
            id="notification-metrics-heading"
            className="text-sm font-semibold text-radar-light-text dark:text-radar-white"
          >
            Metrics
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-radar-light-border bg-radar-light-card p-4 sm:grid-cols-3 lg:grid-cols-5 dark:border-white/10 dark:bg-white/[0.02]">
          {metrics.map((metric) => (
            <NotificationMetric key={metric.key} label={metric.label} value={metric.value} />
          ))}
        </div>
      </section>

      <NotificationFilters
        search={search}
        onSearchChange={setSearch}
        readState={readState}
        onReadStateChange={setReadState}
        type={type}
        onTypeChange={setType}
        sort={sort}
        onSortChange={setSort}
      />

      {filteredNotifications.length === 0 ? (
        <NotificationEmpty variant={normalizedQuery !== "" ? "search" : "filter"} className="py-16" />
      ) : (
        NOTIFICATION_GROUP_KEYS.map(
          (key) =>
            groups[key].length > 0 && (
              <NotificationGroup key={key} id={key} title={NOTIFICATION_GROUP_LABEL[key]}>
                {groups[key].map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkRead={markRead}
                    onMarkUnread={markUnread}
                  />
                ))}
              </NotificationGroup>
            )
        )
      )}
    </div>
  );
}
