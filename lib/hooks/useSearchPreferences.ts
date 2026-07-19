"use client";

/**
 * React binding for `lib/search/preferences.ts` — load, save, and reset
 * Search preferences. Deliberately does not perform any searching itself;
 * `lib/hooks/useCommandPalette.ts` is the one place that reads these
 * preferences to gate the keyboard shortcut and the Recent Searches
 * section.
 */

import { useSyncExternalStore } from "react";

import {
  DEFAULT_SEARCH_PREFERENCES,
  getSearchPreferences,
  resetSearchPreferences,
  setSearchPreferences,
  subscribeToSearchPreferences,
} from "@/lib/search/preferences";

function getServerSnapshot() {
  return DEFAULT_SEARCH_PREFERENCES;
}

export function useSearchPreferences() {
  const preferences = useSyncExternalStore(subscribeToSearchPreferences, getSearchPreferences, getServerSnapshot);

  return {
    preferences,
    setPreferences: setSearchPreferences,
    resetPreferences: resetSearchPreferences,
  };
}
