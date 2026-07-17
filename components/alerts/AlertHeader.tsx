"use client";

import { CheckCheck } from "lucide-react";

import { cn } from "@/lib/utils";

type AlertHeaderProps = {
  unreadCount: number;
  onMarkAllRead: () => void;
};

/** Page title + live unread badge + "Mark all read" — disabled (not hidden) when there's nothing to mark, so the control's position never shifts. */
export function AlertHeader({ unreadCount, onMarkAllRead }: AlertHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <h1 className="text-xl font-bold text-radar-light-text dark:text-radar-white">Alerts</h1>
        {unreadCount > 0 && (
          <span
            className="flex h-5 min-w-5 items-center justify-center rounded-full bg-radar-primary px-1.5 text-[10.5px] font-semibold tabular-nums text-white dark:bg-radar-accent dark:text-radar-bg"
            aria-label={`${unreadCount} unread alert${unreadCount === 1 ? "" : "s"}`}
          >
            {unreadCount}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onMarkAllRead}
        disabled={unreadCount === 0}
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-radar-primary/50",
          unreadCount === 0
            ? "cursor-not-allowed text-radar-light-muted/50 dark:text-radar-muted/40"
            : "text-radar-light-text hover:bg-radar-light-surface dark:text-radar-white dark:hover:bg-white/5"
        )}
      >
        <CheckCheck className="size-4 shrink-0" aria-hidden="true" />
        Mark all read
      </button>
    </div>
  );
}
