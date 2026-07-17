"use client";

import { BarChart3, Bell, Star } from "lucide-react";

import { useWatchlist } from "@/lib/hooks/useWatchlist";
import { cn } from "@/lib/utils";

const DISABLED_ACTIONS = [
  { key: "alert", label: "Alert", icon: Bell },
  { key: "compare", label: "Compare", icon: BarChart3 },
] as const;

type ProfileQuickActionsProps = {
  projectId: string;
  projectName: string;
};

/**
 * PR11.1 Part 8 — UI-only placeholders for a later milestone, matching the
 * exact disabled-button idiom `QuickViewActions.tsx` already established
 * (`disabled` + `title` tooltip + `cursor-not-allowed`/`opacity-60`) rather
 * than inventing a second pattern for "not wired yet" actions. "Watchlist"
 * is wired for real (PR13.1) — same visual weight as the still-disabled
 * actions beside it, since it's a `WatchButton` styled to match rather than
 * the icon-only star used elsewhere.
 */
export function ProfileQuickActions({ projectId, projectName }: ProfileQuickActionsProps) {
  const { isWatching, toggle } = useWatchlist();
  const watched = isWatching(projectId);

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        aria-pressed={watched}
        aria-label={watched ? `Remove ${projectName} from Watchlist` : `Add ${projectName} to Watchlist`}
        onClick={() => toggle(projectId)}
        className={cn(
          "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-radar-primary/50",
          watched
            ? "border-radar-warning/30 bg-radar-warning/10 text-radar-warning"
            : "border-radar-light-border text-radar-light-muted hover:bg-radar-light-surface dark:border-white/10 dark:text-radar-muted dark:hover:bg-white/5"
        )}
      >
        <Star className={cn("size-3.5", watched && "fill-current")} aria-hidden="true" />
        {watched ? "Watching" : "Watchlist"}
      </button>

      {DISABLED_ACTIONS.map((action) => (
        <button
          key={action.key}
          type="button"
          disabled
          title="Coming in a future milestone"
          className="flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-radar-light-border px-2.5 py-1.5 text-xs font-medium text-radar-light-muted opacity-60 dark:border-white/10 dark:text-radar-muted"
        >
          <action.icon className="size-3.5" aria-hidden="true" />
          {action.label}
        </button>
      ))}
    </div>
  );
}
