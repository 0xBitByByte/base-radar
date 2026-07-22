"use client";

import { Star } from "lucide-react";

import { Tooltip } from "@/components/ui/Tooltip";
import { useWatchlist } from "@/lib/hooks/useWatchlist";
import { cn } from "@/lib/utils";

type WatchButtonProps = {
  projectId: string;
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

/** Shared project-star control. Its membership state comes from the active Personalization Watchlist, so every instance updates from one source of truth. */
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
