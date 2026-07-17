"use client";

/**
 * React binding for `lib/watchlist/service.ts` — `useSyncExternalStore` is
 * the same primitive `components/ui/ThemeToggle.tsx` already uses for an
 * outside-React source of truth, applied here to the watchlist's in-memory/
 * `localStorage`-backed store. Every component calling this hook
 * automatically subscribes on mount and unsubscribes on unmount (React
 * owns that lifecycle internally) and re-renders the instant `toggle`/
 * `add`/`remove`/`clear` runs anywhere in the app — no prop drilling, no
 * router refresh, no manual subscribe/unsubscribe wiring of its own.
 */

import { useCallback, useSyncExternalStore } from "react";

import * as watchlistService from "@/lib/watchlist/service";
import type { Watchlist } from "@/lib/watchlist/types";

const EMPTY_WATCHLIST: Watchlist = { version: 1, items: [] };

function getServerSnapshot(): Watchlist {
  return EMPTY_WATCHLIST;
}

export function useWatchlist() {
  const watchlist = useSyncExternalStore(watchlistService.subscribe, watchlistService.getWatchlist, getServerSnapshot);

  const isWatching = useCallback(
    (projectId: string) => watchlist.items.some((item) => item.projectId === projectId),
    [watchlist]
  );

  return {
    watchlist,
    count: watchlist.items.length,
    isWatching,
    toggle: watchlistService.toggleProject,
    add: watchlistService.addProject,
    remove: watchlistService.removeProject,
    clear: watchlistService.clear,
  };
}
