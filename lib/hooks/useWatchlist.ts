"use client";

/**
 * Compatibility-shaped React binding for the Personalization-owned active
 * Watchlist. It preserves the shared star-control API while membership,
 * persistence, and subscriptions have one owner: `lib/personalization/`.
 */

import { useCallback, useSyncExternalStore } from "react";

import {
  getMembershipProjectIds,
  subscribe,
  toggleMembershipProject,
} from "@/lib/personalization/storage";

const EMPTY_PROJECT_IDS: string[] = [];

function getServerSnapshot(): string[] {
  return EMPTY_PROJECT_IDS;
}

export function useWatchlist() {
  const projectIds = useSyncExternalStore(subscribe, getMembershipProjectIds, getServerSnapshot);

  const isWatching = useCallback(
    (projectId: string) => projectIds.includes(projectId),
    [projectIds]
  );

  return {
    projectIds,
    count: projectIds.length,
    isWatching,
    toggle: toggleMembershipProject,
  };
}
