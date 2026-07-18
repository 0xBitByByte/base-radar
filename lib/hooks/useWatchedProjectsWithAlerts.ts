"use client";

/**
 * Every watched project's alert preference + waiting-alert count — backs
 * the Alerts page's project filter (only ever lists watched projects) and
 * is available to the Watchlist page for the same reason. Reuses the
 * Alert Engine's own cached, stable-reference array
 * (`getWatchlistProjectsWithAlerts()`), so this never recomputes on its
 * own — only when the underlying Watchlist or alert-preference state
 * actually changes.
 */

import { useSyncExternalStore } from "react";

import * as alertService from "@/lib/alerts/service";
import type { WatchlistProjectAlertInfo } from "@/lib/alerts/types";

const EMPTY: WatchlistProjectAlertInfo[] = [];

function getServerSnapshot(): WatchlistProjectAlertInfo[] {
  return EMPTY;
}

export function useWatchedProjectsWithAlerts(): WatchlistProjectAlertInfo[] {
  return useSyncExternalStore(alertService.subscribe, alertService.getWatchlistProjectsWithAlerts, getServerSnapshot);
}
