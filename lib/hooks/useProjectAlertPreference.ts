"use client";

/**
 * A single watched project's alert on/off preference — backs the
 * Watchlist page's `AlertToggle`. `isAlertEnabled(projectId)` returns a
 * plain boolean, so this is safe to use directly as a `useSyncExternalStore`
 * snapshot (primitives never trigger the "getSnapshot should be cached"
 * warning the way a freshly-allocated object/array would).
 */

import { useCallback, useSyncExternalStore } from "react";

import * as alertService from "@/lib/alerts/service";

function getServerSnapshot(): boolean {
  return true;
}

export function useProjectAlertPreference(projectId: string) {
  const enabled = useSyncExternalStore(
    alertService.subscribe,
    () => alertService.isAlertEnabled(projectId),
    getServerSnapshot
  );

  const toggle = useCallback(() => alertService.toggleProjectAlerts(projectId), [projectId]);

  return { enabled, toggle };
}
