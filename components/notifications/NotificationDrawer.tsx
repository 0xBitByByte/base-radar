"use client";

import Link from "next/link";
import { Menu } from "@base-ui/react/menu";
import { Bell, CheckCheck } from "lucide-react";

import { NotificationEmpty } from "@/components/notifications/NotificationEmpty";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { cn } from "@/lib/utils";

const DRAWER_PREVIEW_COUNT = 8;

/**
 * The Topbar's notification bell + dropdown drawer — `Menu.Root`/
 * `Menu.Trigger`/`Menu.Popup` from `@base-ui/react/menu`, the exact same
 * primitive `UserMenu`/`WidgetCard`'s own action menu already use, not a
 * new dropdown implementation. Replaces the Topbar's previous plain
 * `Link`-to-`/dashboard/alerts` bell: the Notification Engine aggregates
 * Alerts/Daily Brief/Portfolio Intelligence/Timeline into one feed, so one
 * bell for that unified feed (matching GitHub/Linear/Slack's own
 * single-inbox-bell convention) replaces what used to be a link straight
 * to the raw Alert feed. `/dashboard/alerts` itself, and its own Sidebar
 * nav entry/badge, are untouched — this only changes what the Topbar bell
 * does.
 */
export function NotificationDrawer() {
  const { notifications, markRead, markUnread, markAllRead } = useNotifications();
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;
  const unreadLabel = unreadCount > 9 ? "9+" : String(unreadCount);
  const preview = notifications.slice(0, DRAWER_PREVIEW_COUNT);

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={unreadCount > 0 ? `View notifications, ${unreadCount} unread` : "View notifications"}
        className="relative flex size-9 shrink-0 items-center justify-center rounded-lg text-radar-light-muted outline-none transition-colors hover:bg-radar-light-surface focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:bg-white/5"
      >
        <Bell className="size-[18px]" aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-radar-danger px-1 text-[9.5px] font-semibold tabular-nums text-white"
          >
            {unreadLabel}
          </span>
        )}
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={10}>
          <Menu.Popup
            className={cn(
              "flex w-[min(92vw,380px)] flex-col rounded-2xl border border-radar-light-border bg-radar-light-card/95 shadow-xl backdrop-blur-xl outline-none dark:border-white/10 dark:bg-radar-card/95",
              "transition-[opacity,transform] duration-150 motion-reduce:transition-none",
              "data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0"
            )}
          >
            <div className="flex items-center justify-between gap-2 border-b border-radar-light-border px-4 py-3 dark:border-white/10">
              <h2 className="text-sm font-semibold text-radar-light-text dark:text-radar-white">Notifications</h2>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllRead()}
                  className="flex items-center gap-1 rounded text-xs font-medium text-radar-primary outline-none transition-colors hover:text-radar-primary/80 focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-accent dark:hover:text-radar-accent/80"
                >
                  <CheckCheck className="size-3.5" aria-hidden="true" />
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2">
              {preview.length === 0 ? (
                <NotificationEmpty variant="none" className="py-8" />
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {preview.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkRead={markRead}
                      onMarkUnread={markUnread}
                      compact
                    />
                  ))}
                </ul>
              )}
            </div>

            <Menu.LinkItem
              render={<Link href="/dashboard/notifications" />}
              closeOnClick
              className="flex items-center justify-center gap-1 border-t border-radar-light-border px-4 py-3 text-xs font-medium text-radar-primary outline-none transition-colors data-[highlighted]:bg-radar-light-surface dark:border-white/10 dark:text-radar-accent dark:data-[highlighted]:bg-white/5"
            >
              View all notifications
            </Menu.LinkItem>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
