"use client";

/**
 * React binding for `lib/search/storage.ts`'s Recent Searches store —
 * `useSyncExternalStore`, the same primitive `useAccount()` already uses.
 * PR-094.01 (Recent Searches Cross-Device Sync) — the one real bridge
 * between the local Recent Searches store and the real authenticated
 * session: `recordSearch`/`clearSearchHistory` pass the session's own real
 * account id through so the storage layer can enqueue a real Sync
 * operation for it. Both `useCommandPalette.ts` and
 * `SearchPreferencesPage.tsx` read through this one hook now, instead of
 * each importing `lib/search/storage.ts` directly — the exact same "one
 * shared binding, not two independent auth-unaware call sites" shape
 * `useAccount()` already established for Account edits.
 */

import { useCallback, useSyncExternalStore } from "react";

import { useAuthSession } from "@/lib/hooks/useAuthSession";
import { clearSearchHistory, getRecentSearches, recordSearch, subscribeToRecentSearches } from "@/lib/search/storage";

const EMPTY_RECENT_SEARCHES: string[] = [];

function getServerSnapshot(): string[] {
  return EMPTY_RECENT_SEARCHES;
}

export function useRecentSearches() {
  const recentSearches = useSyncExternalStore(subscribeToRecentSearches, getRecentSearches, getServerSnapshot);
  const auth = useAuthSession();

  const record = useCallback((query: string) => recordSearch(query, auth.account?.id), [auth.account?.id]);
  const clear = useCallback(() => clearSearchHistory(auth.account?.id), [auth.account?.id]);

  return { recentSearches, recordSearch: record, clearSearchHistory: clear };
}
