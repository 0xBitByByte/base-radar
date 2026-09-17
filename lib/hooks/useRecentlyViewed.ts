"use client";

/**
 * PR-093.04 — React binding for `lib/research-history/storage.ts`, the same
 * `useSyncExternalStore` primitive every other local store in this app
 * uses. `getServerSnapshot` returns a fixed, reference-stable empty array
 * (never a call into `getRecentlyViewed()`, which reads `localStorage`) —
 * that argument runs IN THE BROWSER during hydration, not only during real
 * server rendering, so reading real storage there could produce a
 * different result than the true server-rendered HTML and cause a
 * hydration mismatch (the exact class of bug PR-090.07 found and fixed
 * live in `WatchlistAIWatchStatus.tsx`). This hook follows that
 * established fix from the start.
 */

import { useCallback, useSyncExternalStore } from "react";

import { clearRecentlyViewed, getRecentlyViewed, recordProjectView, subscribe } from "@/lib/research-history/storage";
import type { RecentlyViewedEntry } from "@/lib/research-history/types";

const SERVER_ENTRIES: RecentlyViewedEntry[] = [];

function getServerSnapshot(): RecentlyViewedEntry[] {
  return SERVER_ENTRIES;
}

export function useRecentlyViewed() {
  const entries = useSyncExternalStore(subscribe, getRecentlyViewed, getServerSnapshot);

  const recordView = useCallback((projectId: string, projectName: string, projectSlug: string) => recordProjectView(projectId, projectName, projectSlug), []);
  const clear = useCallback(() => clearRecentlyViewed(), []);

  return { entries, recordView, clear };
}
