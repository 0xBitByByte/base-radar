"use client";

import Link from "next/link";
import { ArrowRight, Bell } from "lucide-react";

import { NotificationBadge } from "@/components/notifications/NotificationBadge";
import { NotificationMetric } from "@/components/notifications/NotificationMetric";
import { TimelineEventBadge } from "@/components/timeline/TimelineEventBadge";
import { WidgetCard } from "@/components/dashboard/WidgetCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatRelativeTime } from "@/lib/data/format";
import { usePersonalizedDashboard } from "@/lib/hooks/usePersonalizedDashboard";

/**
 * The Dashboard's compact Notifications preview — unread count and the
 * single latest notification only. Deliberately shallow (never
 * regenerates or re-derives anything): it renders only the top of the
 * already-sorted, watchlist-personalized (PR22 Part 2) notification array —
 * the full grouped feed lives at `/dashboard/notifications` only, reached
 * via the link below. Unlike Timeline/Portfolio/Daily Brief, Notifications
 * has no separate scalar engine aggregate — the list itself IS the data —
 * so "Unread"/"Total" here are counts over the already-personalized array,
 * not a raw, un-filtered figure.
 */
export function NotificationWidget() {
  const { notifications, hasNotifications, isPersonalized, activeWatchlist } = usePersonalizedDashboard();
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
      {activeWatchlist && activeWatchlist.projectIds.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet."
          description="Add projects to your Watchlist to receive intelligent alerts about the activity that matters to you."
        />
      ) : !hasNotifications ? (
        <EmptyState
          icon={Bell}
          title="All quiet for now."
          description="You'll be notified here the moment one of your watched projects has something worth flagging — a risk, a milestone, or a notable move."
        />
      ) : isPersonalized && notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications for this watchlist."
          description={`None of the projects in "${activeWatchlist?.name}" have notifications yet.`}
        />
      ) : (
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <NotificationMetric label="Unread" value={unreadCount} />
            <NotificationMetric label="Total" value={notifications.length} />
          </div>

          {latest && (
            <div className="relative flex flex-col gap-1.5 rounded-lg border border-radar-light-border bg-radar-light-surface p-2.5 transition-colors hover:bg-radar-light-card dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]">
              {latest.link && (
                <Link
                  href={latest.link}
                  aria-label={`${latest.title}. Investigate further.`}
                  className="absolute inset-0 z-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50"
                />
              )}
              <span className="relative z-[1] text-[10.5px] font-medium text-radar-light-muted dark:text-radar-muted">
                Latest Notification
              </span>
              <div className="relative z-[1] flex flex-wrap items-center gap-1.5">
                <TimelineEventBadge eventType={latest.type} />
                <NotificationBadge priority={latest.priority} />
              </div>
              <span className="relative z-[1] truncate text-xs font-semibold text-radar-light-text dark:text-radar-white">
                {latest.title}
              </span>
              <time dateTime={latest.timestamp} className="relative z-[1] text-[10.5px] text-radar-light-muted dark:text-radar-muted">
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
