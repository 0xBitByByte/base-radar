"use client";

/**
 * State + global keyboard shortcut for the Command Palette. Pure UI state —
 * open/closed, the search query, and which result row is highlighted.
 * Routing is deliberately NOT handled here — the caller
 * (`CommandPalette.tsx`) owns the router and decides what "selecting a
 * result" does.
 *
 * PR21 Part 2: `results` comes from `useGlobalSearch` (commands +
 * Projects/Timeline/Notifications/Automation/Portfolio/Daily Brief).
 *
 * PR21 Part 3: also surfaces `recentSearches`/`showRecentSearches` (Recent
 * Searches is enabled, has entries, and the query is empty — matching the
 * PR brief's exact display rule) and `recordSearch`/`selectRecentSearch`.
 * `recordSearch` is a direct passthrough to `lib/search/storage.ts`, which
 * is the one place that decides whether a query actually gets persisted
 * (the Search History preference is checked there, not here). The global
 * ⌘K/Ctrl+K listener now checks the Keyboard Shortcut preference on every
 * keypress — when disabled, the shortcut is a no-op, but the Topbar's
 * mouse trigger (`openPalette`/`togglePalette` called from a click) is
 * completely unaffected.
 *
 * PR-094.02: also surfaces `savedSearches`/`showSavedSearches`/
 * `isCurrentQuerySaved`/`toggleSaveCurrentQuery`/`selectSavedSearch`/
 * `removeSavedSearch` — a real, explicit, user-curated list, never
 * auto-recorded the way Recent Searches is (see
 * `lib/search/savedSearches.ts`'s own doc comment for why this is a
 * genuinely separate module/store, not a variant of Recent Searches).
 */

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { useGlobalSearch } from "@/lib/hooks/useGlobalSearch";
import { useRecentSearches } from "@/lib/hooks/useRecentSearches";
import { useSavedSearches } from "@/lib/hooks/useSavedSearches";
import { DEFAULT_SEARCH_PREFERENCES, getSearchPreferences, subscribeToSearchPreferences } from "@/lib/search/preferences";
import type { SavedSearch } from "@/lib/search/savedSearches";
import type { SearchableItem } from "@/lib/search/types";

export type UseCommandPaletteResult = {
  open: boolean;
  query: string;
  setQuery: (query: string) => void;
  results: SearchableItem[];
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  selectNext: () => void;
  selectPrevious: () => void;
  openPalette: () => void;
  closePalette: () => void;
  togglePalette: () => void;
  recentSearches: string[];
  showRecentSearches: boolean;
  recordSearch: (query: string) => void;
  selectRecentSearch: (query: string) => void;
  savedSearches: SavedSearch[];
  showSavedSearches: boolean;
  isCurrentQuerySaved: boolean;
  toggleSaveCurrentQuery: () => void;
  selectSavedSearch: (query: string) => void;
  removeSavedSearch: (id: string) => void;
};

function getSearchPreferencesServerSnapshot() {
  return DEFAULT_SEARCH_PREFERENCES;
}

export function useCommandPalette(): UseCommandPaletteResult {
  const [open, setOpen] = useState(false);
  const [query, setQueryState] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const results = useGlobalSearch(query);
  const searchPreferences = useSyncExternalStore(
    subscribeToSearchPreferences,
    getSearchPreferences,
    getSearchPreferencesServerSnapshot
  );
  const { recentSearches, recordSearch } = useRecentSearches();
  const { savedSearches, saveSearch, deleteSavedSearch, deleteSavedSearchByQuery, isQuerySaved } = useSavedSearches();

  const showRecentSearches = searchPreferences.enableRecentSearches && recentSearches.length > 0 && query.trim() === "";
  const showSavedSearches = savedSearches.length > 0 && query.trim() === "";
  const isCurrentQuerySaved = isQuerySaved(query);

  // Changing the query always re-homes the highlighted row to the top
  // result. Done here, at the one call site that changes `query`, rather
  // than reactively watching `query` in an effect (which would call
  // setState synchronously inside an effect body).
  const setQuery = useCallback((next: string) => {
    setQueryState(next);
    setSelectedIndex(0);
  }, []);

  // Closing always clears transient state — same reasoning: handled at the
  // call sites that actually close the palette, not in an effect.
  const resetTransientState = useCallback(() => {
    setQueryState("");
    setSelectedIndex(0);
  }, []);

  const openPalette = useCallback(() => setOpen(true), []);

  const closePalette = useCallback(() => {
    setOpen(false);
    resetTransientState();
  }, [resetTransientState]);

  const togglePalette = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      if (!next) resetTransientState();
      return next;
    });
  }, [resetTransientState]);

  const selectNext = useCallback(() => {
    setSelectedIndex((prev) => (results.length === 0 ? 0 : (prev + 1) % results.length));
  }, [results.length]);

  const selectPrevious = useCallback(() => {
    setSelectedIndex((prev) => (results.length === 0 ? 0 : (prev - 1 + results.length) % results.length));
  }, [results.length]);

  const selectRecentSearch = useCallback(
    (recentQuery: string) => {
      setQuery(recentQuery);
    },
    [setQuery]
  );

  const toggleSaveCurrentQuery = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    if (isQuerySaved(trimmed)) {
      deleteSavedSearchByQuery(trimmed);
    } else {
      saveSearch(trimmed);
    }
  }, [query, isQuerySaved, deleteSavedSearchByQuery, saveSearch]);

  const selectSavedSearch = useCallback(
    (savedQuery: string) => {
      setQuery(savedQuery);
    },
    [setQuery]
  );

  const removeSavedSearch = useCallback(
    (id: string) => {
      deleteSavedSearch(id);
    },
    [deleteSavedSearch]
  );

  // Global ⌘K / Ctrl+K — reads the Keyboard Shortcut preference fresh on
  // every keypress (not as a reactive dependency), so disabling it takes
  // effect immediately without re-registering this listener. Must work
  // from anywhere in the app, not just while the palette already has
  // focus, so this listener lives on `window`.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!getSearchPreferences().enableKeyboardShortcut) return;
      const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (isShortcut) {
        event.preventDefault();
        togglePalette();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [togglePalette]);

  return {
    open,
    query,
    setQuery,
    results,
    selectedIndex,
    setSelectedIndex,
    selectNext,
    selectPrevious,
    openPalette,
    closePalette,
    togglePalette,
    recentSearches,
    showRecentSearches,
    recordSearch,
    selectRecentSearch,
    savedSearches,
    showSavedSearches,
    isCurrentQuerySaved,
    toggleSaveCurrentQuery,
    selectSavedSearch,
    removeSavedSearch,
  };
}
