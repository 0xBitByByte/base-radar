"use client";

/**
 * PR-091 (Compare Platform) — the one hook every Compare surface reads
 * through. `useSyncExternalStore` bound to `lib/compare/storage.ts`, same
 * pattern `useAIWatch.ts`/`useWatchlist.ts` already use.
 *
 * PR-090.07 QA established (and fixed live) that a `useSyncExternalStore`
 * server-snapshot argument runs IN THE BROWSER during hydration, not only
 * during real server rendering — so it must return a fixed default rather
 * than reading `localStorage`, or a returning user with a non-empty
 * Compare list can hit a hydration mismatch. This hook follows that fix
 * from the start.
 */

import { useSyncExternalStore } from "react";

import { addToCompare, clearCompare, getCompareState, removeFromCompare, subscribe } from "@/lib/compare/storage";
import { MAX_COMPARE_PROJECTS, type CompareState } from "@/lib/compare/types";

const SERVER_STATE: CompareState = { projectIds: [] };

function getServerState(): CompareState {
  return SERVER_STATE;
}

export type UseCompareResult = {
  projectIds: string[];
  count: number;
  isFull: boolean;
  isComparing: (projectId: string) => boolean;
  toggle: (projectId: string) => void;
  remove: (projectId: string) => void;
  clear: () => void;
};

export function useCompare(): UseCompareResult {
  const state = useSyncExternalStore(subscribe, getCompareState, getServerState);

  return {
    projectIds: state.projectIds,
    count: state.projectIds.length,
    isFull: state.projectIds.length >= MAX_COMPARE_PROJECTS,
    isComparing: (projectId: string) => state.projectIds.includes(projectId),
    toggle: (projectId: string) => (state.projectIds.includes(projectId) ? removeFromCompare(projectId) : addToCompare(projectId)),
    remove: removeFromCompare,
    clear: clearCompare,
  };
}
