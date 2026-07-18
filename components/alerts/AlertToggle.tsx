"use client";

import { Bell, BellOff } from "lucide-react";

import { useProjectAlertPreference } from "@/lib/hooks/useProjectAlertPreference";
import { cn } from "@/lib/utils";

type AlertToggleProps = {
  projectId: string;
  /** Used only for the accessible label. */
  projectName: string;
  className?: string;
};

/**
 * PR15.1 — the Watchlist page's one addition per card: an on/off switch
 * for whether this watched project's alerts show up anywhere (Alerts
 * page, Sidebar badge, Topbar bell). A real `role="switch"` control, not a
 * styled checkbox pretending to be one — `aria-checked` and the visible
 * "Enabled"/"Disabled" text both carry the state, so it's never
 * color-only. Self-contained: reads and writes
 * `useProjectAlertPreference(projectId)` directly, same pattern as
 * `WatchButton` reading `useWatchlist()` directly — no parent needs to
 * prop-drill preference state.
 */
export function AlertToggle({ projectId, projectName, className }: AlertToggleProps) {
  const { enabled, toggle } = useProjectAlertPreference(projectId);

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-lg border border-radar-light-border bg-radar-light-surface px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]",
        className
      )}
    >
      <span className="flex items-center gap-1.5 text-xs font-medium text-radar-light-text dark:text-radar-white">
        {enabled ? (
          <Bell className="size-3.5 shrink-0 text-radar-primary dark:text-radar-accent" aria-hidden="true" />
        ) : (
          <BellOff className="size-3.5 shrink-0 text-radar-light-muted dark:text-radar-muted" aria-hidden="true" />
        )}
        Alert Toggle
      </span>

      <div className="flex items-center gap-2">
        <span
          className={cn(
            "text-[10.5px] font-semibold",
            enabled ? "text-radar-primary dark:text-radar-accent" : "text-radar-light-muted dark:text-radar-muted"
          )}
        >
          {enabled ? "Enabled" : "Disabled"}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={enabled ? `Disable alerts for ${projectName}` : `Enable alerts for ${projectName}`}
          onClick={(event) => {
            event.stopPropagation();
            toggle();
          }}
          className={cn(
            "relative flex h-5 w-9 shrink-0 items-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-radar-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-radar-light-surface dark:focus-visible:ring-offset-radar-card",
            enabled ? "bg-radar-primary dark:bg-radar-accent" : "bg-radar-light-border dark:bg-white/10"
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "absolute size-3.5 rounded-full bg-white shadow transition-transform",
              enabled ? "translate-x-[18px]" : "translate-x-0.5"
            )}
          />
        </button>
      </div>
    </div>
  );
}
