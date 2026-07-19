"use client";

import Link from "next/link";
import { Check, Undo2 } from "lucide-react";

import { NotificationBadge } from "@/components/notifications/NotificationBadge";
import { TimelineEventBadge } from "@/components/timeline/TimelineEventBadge";
import { formatRelativeTime } from "@/lib/data/format";
import type { Notification } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

type NotificationItemProps = {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onMarkUnread: (id: string) => void;
  /** Trims the row for the Topbar drawer — no summary line, no source footer. */
  compact?: boolean;
};

/**
 * One Notification entry. `notification.link` is already a real,
 * precomputed route (a Project Profile for project-scoped notifications,
 * `/dashboard/brief` or `/dashboard/portfolio` for roll-up notifications,
 * or `null` when there's nowhere more specific to send the reader) — this
 * component never derives a link itself, so an aggregate notification with
 * no real destination simply renders without the stretched-link wrapper,
 * never a broken one. The "Type badge" reuses `TimelineEventBadge` directly
 * rather than a second badge component — `notification.type` is the exact
 * same union `TimelineEventBadge` already renders.
 */
export function NotificationItem({ notification, onMarkRead, onMarkUnread, compact = false }: NotificationItemProps) {
  const isUnread = !notification.isRead;

  return (
    <li
      className={cn(
        "group relative flex flex-col gap-1.5 rounded-xl border border-radar-light-border p-4 transition-colors hover:bg-radar-light-surface dark:border-white/10 dark:hover:bg-white/[0.05]",
        isUnread ? "bg-radar-primary/[0.03] dark:bg-radar-accent/[0.04]" : "bg-radar-light-card dark:bg-white/[0.02]",
        compact && "p-3"
      )}
    >
      {notification.link && (
        <Link
          href={notification.link}
          onClick={() => isUnread && onMarkRead(notification.id)}
          aria-label={`${notification.title}${notification.projectName ? `. View ${notification.projectName}'s Project Profile.` : ". View details."}`}
          className="absolute inset-0 z-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-radar-primary/50"
        />
      )}

      <div className="relative z-[1] flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {isUnread && (
            <span
              aria-hidden="true"
              className="size-1.5 shrink-0 rounded-full bg-radar-primary dark:bg-radar-accent"
            />
          )}
          <span className="sr-only">{isUnread ? "Unread" : "Read"}</span>
          <TimelineEventBadge eventType={notification.type} />
          {notification.projectName && (
            <span className="max-w-[160px] truncate text-[10.5px] font-medium text-radar-light-text dark:text-radar-white">
              {notification.projectName}
            </span>
          )}
          <NotificationBadge priority={notification.priority} />
        </div>

        <div className="relative z-[1] flex shrink-0 items-center gap-2">
          <time
            dateTime={notification.timestamp}
            className="text-[10.5px] whitespace-nowrap text-radar-light-muted dark:text-radar-muted"
          >
            {formatRelativeTime(notification.timestamp)}
          </time>
          {isUnread ? (
            <button
              type="button"
              onClick={() => onMarkRead(notification.id)}
              aria-label="Mark as read"
              className="relative z-[1] flex size-6 shrink-0 items-center justify-center rounded-full text-radar-light-muted outline-none transition-colors hover:bg-radar-light-border hover:text-radar-light-text focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:bg-white/10 dark:hover:text-radar-white"
            >
              <Check className="size-3.5" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onMarkUnread(notification.id)}
              aria-label="Mark as unread"
              className="relative z-[1] flex size-6 shrink-0 items-center justify-center rounded-full text-radar-light-muted opacity-0 outline-none transition-opacity hover:bg-radar-light-border hover:text-radar-light-text focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-radar-primary/50 group-hover:opacity-100 dark:text-radar-muted dark:hover:bg-white/10 dark:hover:text-radar-white"
            >
              <Undo2 className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className="relative z-[1] flex flex-col gap-1">
        <p
          className={cn(
            "line-clamp-1 text-sm font-semibold",
            isUnread ? "text-radar-light-text dark:text-radar-white" : "text-radar-light-muted dark:text-radar-muted"
          )}
        >
          {notification.title}
        </p>
        {!compact && (
          <p className="line-clamp-2 text-xs leading-relaxed text-radar-light-muted dark:text-radar-muted">
            {notification.summary}
          </p>
        )}
      </div>

      {!compact && (
        <div className="relative z-[1] flex items-center justify-between gap-2">
          <span className="text-[10.5px] text-radar-light-muted dark:text-radar-muted">via {notification.source}</span>
        </div>
      )}
    </li>
  );
}
