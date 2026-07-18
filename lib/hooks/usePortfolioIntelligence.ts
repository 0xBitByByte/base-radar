"use client";

/**
 * React binding for `lib/portfolio/storage.ts`'s `getPortfolioIntelligence()`
 * — the same `useSyncExternalStore` pattern every other Intelligence hook
 * uses. There's no dedicated Portfolio subscribe/notify pair: Portfolio
 * Intelligence only ever changes when the Watchlist or Daily Brief does
 * (`lib/portfolio/storage.ts`'s own cache-invalidation rule), so this
 * subscribes to BOTH of those real sources — `lib/alerts/service.ts`'s
 * listener set (Daily Brief's own cache rebuilds off the same one) and
 * `lib/watchlist/service.ts`'s — rather than inventing a third,
 * unnecessary notification channel.
 *
 * `getServerSnapshot` returns `null` (never a real, dated read) — matches
 * every other Intelligence hook's SSR-safe server snapshot, avoiding a
 * hydration mismatch; the client re-renders with the real cached value
 * immediately after mount.
 */

import { useSyncExternalStore } from "react";

import { subscribe as subscribeToAlerts } from "@/lib/alerts/service";
import { getPortfolioIntelligence } from "@/lib/portfolio/storage";
import type { PortfolioIntelligence } from "@/lib/portfolio/types";
import { subscribe as subscribeToWatchlist } from "@/lib/watchlist/service";

function subscribe(onStoreChange: () => void): () => void {
  const unsubscribeAlerts = subscribeToAlerts(onStoreChange);
  const unsubscribeWatchlist = subscribeToWatchlist(onStoreChange);
  return () => {
    unsubscribeAlerts();
    unsubscribeWatchlist();
  };
}

function getServerSnapshot(): PortfolioIntelligence | null {
  return null;
}

export function usePortfolioIntelligence(): PortfolioIntelligence | null {
  return useSyncExternalStore(subscribe, getPortfolioIntelligence, getServerSnapshot);
}
