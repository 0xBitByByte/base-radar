"use client";

/**
 * React binding for `lib/timeline/storage.ts`'s `getTimeline()` — the same
 * `useSyncExternalStore` pattern every other Intelligence hook uses. There's
 * no dedicated Timeline subscribe/notify pair: the Timeline only ever
 * changes when Intelligence Alerts, Daily Brief, or Portfolio Intelligence
 * do, so this subscribes to the same two real sources
 * `usePortfolioIntelligence` already does — `lib/alerts/service.ts`'s
 * listener set (which Daily Brief's own cache rebuilds off too) and
 * `lib/watchlist/service.ts`'s (the one trigger Portfolio Intelligence can
 * change from that alerts alone wouldn't catch).
 *
 * `getServerSnapshot` returns `null` — matches every other Intelligence
 * hook's SSR-safe server snapshot, avoiding a hydration mismatch; the
 * client re-renders with the real cached value immediately after mount.
 */

import { useSyncExternalStore } from "react";

import { subscribe as subscribeToAlerts } from "@/lib/alerts/service";
import { getTimeline } from "@/lib/timeline/storage";
import type { Timeline } from "@/lib/timeline/types";
import { subscribe as subscribeToWatchlist } from "@/lib/watchlist/service";

function subscribe(onStoreChange: () => void): () => void {
  const unsubscribeAlerts = subscribeToAlerts(onStoreChange);
  const unsubscribeWatchlist = subscribeToWatchlist(onStoreChange);
  return () => {
    unsubscribeAlerts();
    unsubscribeWatchlist();
  };
}

function getServerSnapshot(): Timeline | null {
  return null;
}

export function useTimeline(): Timeline | null {
  return useSyncExternalStore(subscribe, getTimeline, getServerSnapshot);
}
