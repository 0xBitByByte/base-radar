"use client";

/**
 * React binding for `lib/search/savedSearches.ts` — `useSyncExternalStore`,
 * the same primitive `useRecentSearches()` already uses. Both
 * `useCommandPalette.ts` and `SearchPreferencesPage.tsx` read through this
 * one shared hook, the same "one binding, not two independent call sites"
 * shape already established for Recent Searches.
 *
 * PR-094.02 Cloud Sync — threads the real, session-derived account id
 * through the same way `useRecentSearches()` already does, so a real
 * save/delete enqueues a real Sync operation only while authenticated;
 * Guest behavior (no `auth.account`) is completely unchanged.
 */

import { useCallback, useSyncExternalStore } from "react";

import { useAuthSession } from "@/lib/hooks/useAuthSession";
import {
  deleteSavedSearch,
  deleteSavedSearchByQuery,
  getSavedSearches,
  isQuerySaved,
  saveSearch,
  subscribeToSavedSearches,
  type SavedSearch,
} from "@/lib/search/savedSearches";

const EMPTY_SAVED_SEARCHES: SavedSearch[] = [];

function getServerSnapshot(): SavedSearch[] {
  return EMPTY_SAVED_SEARCHES;
}

export function useSavedSearches() {
  const savedSearches = useSyncExternalStore(subscribeToSavedSearches, getSavedSearches, getServerSnapshot);
  const auth = useAuthSession();

  const save = useCallback((query: string) => saveSearch(query, auth.account?.id), [auth.account?.id]);
  const remove = useCallback((id: string) => deleteSavedSearch(id, auth.account?.id), [auth.account?.id]);
  const removeByQuery = useCallback((query: string) => deleteSavedSearchByQuery(query, auth.account?.id), [auth.account?.id]);
  const isSaved = useCallback((query: string) => isQuerySaved(query), []);

  return { savedSearches, saveSearch: save, deleteSavedSearch: remove, deleteSavedSearchByQuery: removeByQuery, isQuerySaved: isSaved };
}
