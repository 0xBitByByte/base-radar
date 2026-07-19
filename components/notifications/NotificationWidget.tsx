"use client";

import Link from "next/link";
import { ArrowRight, Bell } from "lucide-react";

import { NotificationBadge } from "@/components/notifications/NotificationBadge";
import { NotificationMetric } from "@/components/notifications/NotificationMetric";
import { TimelineEventBadge } from "@/components/timeline/TimelineEventBadge";
import { WidgetCard } from "@/components/dashboard/WidgetCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatRelativeTime } from "@/lib/data/format";
import { useNotifications } from "@/lib/hooks/useNotifications";

/**
 * The Dashboard's compact Notifications preview — unread count and the
 * single latest notification only. Deliberately shallow (never
 * regenerates or re-derives anything): it renders only the top of the
 * already-sorted `useNotifications()` array — the full grouped feed lives
 * at `/dashboard/notifications` only, reached via the link below.
 */
export function NotificationWidget() {
  const { notifications } = useNotifications();
  const latest = notifications[0];
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  return (
    <WidgetCard
      icon={<Bell className="size-5" aria-hidden="true" />}
      title="Notifications"
      subtitle="Your Watchlist, at a glance"
      accent="primary"
      lastUpdated={latest?.timestamp}
    >
      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet."
          description="Notifications will appear here once your watched projects have scoreable signals."
        />
      ) : (
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <NotificationMetric label="Unread" value={unreadCount} />
            <NotificationMetric label="Total" value={notifications.length} />
          </div>

          {latest && (
            <div className="flex flex-col gap-1.5 rounded-lg border border-radar-light-border bg-radar-light-surface p-2.5 dark:border-white/10 dark:bg-white/[0.03]">
              <span className="text-[10.5px] font-medium text-radar-light-muted dark:text-radar-muted">
                Latest Notification
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <TimelineEventBadge eventType={latest.type} />
                <NotificationBadge priority={latest.priority} />
              </div>
              <span className="truncate text-xs font-semibold text-radar-light-text dark:text-radar-white">
                {latest.title}
              </span>
              <time dateTime={latest.timestamp} className="text-[10.5px] text-radar-light-muted dark:text-radar-muted">
                {formatRelativeTime(latest.timestamp)}
              </time>
            </div>
          )}
        </div>
      )}

      <Link
        href="/dashboard/notifications"
        className="flex items-center gap-1 self-start text-xs font-medium text-radar-primary outline-none transition-colors hover:text-radar-primary/80 focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-accent dark:hover:text-radar-accent/80"
      >
        View all notifications
        <ArrowRight className="size-3.5 shrink-0" aria-hidden="true" />
      </Link>
    </WidgetCard>
  );
}
