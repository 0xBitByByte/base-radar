"use client";

import { Check, ChevronDown } from "lucide-react";
import { Menu } from "@base-ui/react/menu";

import { cn } from "@/lib/utils";
import type { PersonalWatchlist } from "@/lib/personalization/types";
import { WATCHLIST_COLOR_CLASSES, WATCHLIST_ICON_COMPONENTS } from "@/components/watchlists/meta";

type WatchlistSelectorProps = {
  watchlists: PersonalWatchlist[];
  activeWatchlist: PersonalWatchlist | null;
  onSelect: (id: string) => void;
  className?: string;
};

/**
 * A compact active-watchlist switcher — standalone in this PR (mounted
 * only on `/dashboard/watchlists`), foreshadowing PR22 Part 2's Dashboard
 * integration. Reuses the same `@base-ui/react/menu` primitive
 * `UserMenu.tsx` already established, rather than a bespoke dropdown.
 */
export function WatchlistSelector({ watchlists, activeWatchlist, onSelect, className }: WatchlistSelectorProps) {
  const ActiveIcon = activeWatchlist ? WATCHLIST_ICON_COMPONENTS[activeWatchlist.icon] : null;
  const activeColorClasses = activeWatchlist ? WATCHLIST_COLOR_CLASSES[activeWatchlist.color] : null;

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="Switch active watchlist"
        className={cn(
          "flex items-center gap-2 rounded-xl border border-radar-light-border bg-radar-light-card px-3 py-2 text-sm text-radar-light-text outline-none transition-colors hover:border-radar-primary/30 focus-visible:ring-2 focus-visible:ring-radar-primary/50 dark:border-white/10 dark:bg-white/[0.02] dark:text-radar-white",
          className
        )}
      >
        {ActiveIcon && activeColorClasses ? (
          <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full", activeColorClasses.bg)}>
            <ActiveIcon className={cn("size-3", activeColorClasses.text)} aria-hidden="true" />
          </span>
        ) : null}
        <span className="truncate font-medium">{activeWatchlist ? activeWatchlist.name : "No active watchlist"}</span>
        <ChevronDown className="size-3.5 shrink-0 opacity-60" aria-hidden="true" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="start" sideOffset={6}>
          <Menu.Popup
            className={cn(
              "min-w-[220px] rounded-2xl border border-radar-light-border bg-radar-light-card/95 p-1.5 shadow-xl backdrop-blur-xl outline-none dark:border-white/10 dark:bg-radar-card/95",
              "transition-[opacity,transform] duration-150 motion-reduce:transition-none",
              "data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0"
            )}
          >
            {watchlists.length === 0 && (
              <p className="px-2.5 py-2 text-sm text-radar-light-muted dark:text-radar-muted">No watchlists yet.</p>
            )}
            {watchlists.map((watchlist) => {
              const Icon = WATCHLIST_ICON_COMPONENTS[watchlist.icon];
              const colorClasses = WATCHLIST_COLOR_CLASSES[watchlist.color];
              const isActive = activeWatchlist?.id === watchlist.id;
              return (
                <Menu.Item
                  key={watchlist.id}
                  onClick={() => onSelect(watchlist.id)}
                  className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-radar-light-text outline-none transition-colors data-[highlighted]:bg-radar-light-surface dark:text-radar-muted dark:data-[highlighted]:bg-white/5 dark:data-[highlighted]:text-radar-white"
                >
                  <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full", colorClasses.bg)}>
                    <Icon className={cn("size-3", colorClasses.text)} aria-hidden="true" />
                  </span>
                  <span className="flex-1 truncate">{watchlist.name}</span>
                  {isActive && <Check className="size-4 shrink-0 text-radar-primary dark:text-radar-accent" aria-hidden="true" />}
                </Menu.Item>
              );
            })}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
