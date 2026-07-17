"use client";

import { Star } from "lucide-react";

import { Tooltip } from "@/components/ui/Tooltip";
import { useWatchlist } from "@/lib/hooks/useWatchlist";
import { cn } from "@/lib/utils";

type WatchButtonProps = {
  projectId: string;
  /** Used only for the accessible label — falls back to "project" when omitted. */
  projectName?: string;
  size?: "sm" | "md";
  className?: string;
};

const SIZE_CLASS: Record<NonNullable<WatchButtonProps["size"]>, string> = {
  sm: "size-7",
  md: "size-8",
};

const ICON_SIZE_CLASS: Record<NonNullable<WatchButtonProps["size"]>, string> = {
  sm: "size-3.5",
  md: "size-4",
};

/**
 * The one Watch/favorite control this codebase uses everywhere a project
 * can be starred (PR13.1) — Explorer's Project Card and Table, Quick View,
 * and the Project Profile header's quick actions all render this same
 * component rather than each hand-rolling its own toggle. Self-contained:
 * reads and writes `useWatchlist()` directly, so no parent needs to prop-
 * drill watched state or an `onToggle` callback — every mounted
 * `WatchButton` for the same `projectId`, anywhere in the app, updates in
 * lockstep the instant any one of them is clicked (`useWatchlist`'s
 * `useSyncExternalStore` binding). A plain `<button>` gets keyboard
 * activation (Enter/Space) for free; `stopPropagation` keeps a click here
 * from also firing a parent row/card's own `onActivate`.
 */
export function WatchButton({ projectId, projectName, size = "md", className }: WatchButtonProps) {
  const { isWatching, toggle } = useWatchlist();
  const watched = isWatching(projectId);
  const name = projectName ?? "project";

  return (
    <Tooltip content={watched ? "Remove from Watchlist" : "Add to Watchlist"}>
      <button
        type="button"
        aria-label={watched ? `Remove ${name} from Watchlist` : `Add ${name} to Watchlist`}
        aria-pressed={watched}
        onClick={(event) => {
          event.stopPropagation();
          toggle(projectId);
        }}
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg text-radar-light-muted outline-none transition-colors hover:bg-radar-light-surface hover:text-radar-warning focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:text-radar-muted dark:hover:bg-white/5",
          watched && "text-radar-warning",
          SIZE_CLASS[size],
          className
        )}
      >
        <Star className={cn(ICON_SIZE_CLASS[size], watched && "fill-current")} aria-hidden="true" />
      </button>
    </Tooltip>
  );
}
