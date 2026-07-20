"use client";

/**
 * React binding for `lib/personalization/preferences.ts` — load, save, and
 * reset Personalization preferences only. Same shape as
 * `useSearchPreferences.ts`: this hook performs no filtering and no
 * provider access itself. `usePersonalizedDashboard.ts` is the one place
 * that reads `filterDashboardByActiveWatchlist`; `useGlobalSearch.ts` reads
 * `enableSearchPrioritization`; `useWatchlists.ts` reads
 * `rememberActiveWatchlist`; `Topbar.tsx` reads
 * `showWatchlistSelectorInTopbar` — this hook only exposes the settings
 * surface those call sites already consume.
 */

import { useSyncExternalStore } from "react";

import {
  DEFAULT_PERSONALIZATION_PREFERENCES,
  getPersonalizationPreferences,
  resetPersonalizationPreferences,
  setPersonalizationPreferences,
  subscribeToPersonalizationPreferences,
} from "@/lib/personalization/preferences";

function getServerSnapshot() {
  return DEFAULT_PERSONALIZATION_PREFERENCES;
}

export function usePersonalizationPreferences() {
  const preferences = useSyncExternalStore(
    subscribeToPersonalizationPreferences,
    getPersonalizationPreferences,
    getServerSnapshot
  );

  return {
    preferences,
    setPreferences: setPersonalizationPreferences,
    resetPreferences: resetPersonalizationPreferences,
  };
}
