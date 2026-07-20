"use client";

/**
 * React binding for `lib/personalization/storage.ts` — the Personalization
 * Layer's multi-watchlist store. `useSyncExternalStore`, same pattern
 * `useWatchlist.ts` already uses for the (separate, untouched) single flat
 * Watchlist. No provider access, no engine calls — this hook only ever
 * reads/writes `lib/personalization/storage.ts`.
 *
 * Exposes `activeWatchlist` (the resolved record, not just an id) per the
 * PR brief; Part 2 will be the first thing that actually reads it to
 * filter a Dashboard widget — this PR only exposes it.
 */

import { useCallback, useMemo, useSyncExternalStore } from "react";

import {
  addProjectToWatchlist,
  createWatchlist as createWatchlistInStorage,
  deleteWatchlist as deleteWatchlistInStorage,
  duplicateWatchlist as duplicateWatchlistInStorage,
  getPersonalizationState,
  importWatchlists as importWatchlistsInStorage,
  removeProjectFromWatchlist,
  reorderWatchlists as reorderWatchlistsInStorage,
  setActiveWatchlist as setActiveWatchlistInStorage,
  setPinned,
  subscribe,
  updateWatchlist,
} from "@/lib/personalization/storage";
import type { SanitizedImportWatchlist } from "@/lib/personalization/importExport";
import type { PersonalizationState, PersonalWatchlist, WatchlistColorKey, WatchlistIconKey } from "@/lib/personalization/types";

const SERVER_SNAPSHOT: PersonalizationState = { version: 1, watchlists: [], activeWatchlistId: null };

function getServerSnapshot(): PersonalizationState {
  return SERVER_SNAPSHOT;
}

export function useWatchlists() {
  const state = useSyncExternalStore(subscribe, getPersonalizationState, getServerSnapshot);

  const activeWatchlist = useMemo<PersonalWatchlist | null>(
    () => state.watchlists.find((watchlist) => watchlist.id === state.activeWatchlistId) ?? null,
    [state.watchlists, state.activeWatchlistId]
  );

  const createWatchlist = useCallback(
    (input: { name: string; description: string; icon: WatchlistIconKey; color: WatchlistColorKey }) =>
      createWatchlistInStorage(input),
    []
  );

  const renameWatchlist = useCallback((id: string, name: string) => updateWatchlist(id, { name }), []);

  const updateWatchlistDetails = useCallback(
    (id: string, patch: Partial<Pick<PersonalWatchlist, "name" | "description" | "icon" | "color">>) =>
      updateWatchlist(id, patch),
    []
  );

  const deleteWatchlist = useCallback((id: string) => deleteWatchlistInStorage(id), []);

  const duplicateWatchlist = useCallback((id: string) => duplicateWatchlistInStorage(id), []);

  const reorderWatchlists = useCallback((orderedIds: string[]) => reorderWatchlistsInStorage(orderedIds), []);

  const addProject = useCallback((watchlistId: string, projectId: string) => addProjectToWatchlist(watchlistId, projectId), []);

  const removeProject = useCallback(
    (watchlistId: string, projectId: string) => removeProjectFromWatchlist(watchlistId, projectId),
    []
  );

  const pinWatchlist = useCallback((id: string, pinned: boolean) => setPinned(id, pinned), []);

  const setActiveWatchlist = useCallback((id: string | null) => setActiveWatchlistInStorage(id), []);

  const importWatchlists = useCallback(
    (entries: SanitizedImportWatchlist[]) => importWatchlistsInStorage(entries),
    []
  );

  return {
    watchlists: state.watchlists,
    activeWatchlist,
    activeWatchlistId: state.activeWatchlistId,
    createWatchlist,
    renameWatchlist,
    updateWatchlistDetails,
    deleteWatchlist,
    duplicateWatchlist,
    reorderWatchlists,
    addProject,
    removeProject,
    pinWatchlist,
    setActiveWatchlist,
    importWatchlists,
  };
}
