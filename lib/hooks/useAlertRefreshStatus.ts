"use client";

/**
 * V1-FIX-003 — React binding for `lib/alerts/service.ts`'s
 * `getAlertRefreshStatus()`, the same `useSyncExternalStore` pattern every
 * other Alert Engine hook (`useAlerts`, `useEcosystemIntelligenceAlerts`)
 * already uses, subscribed to the same store so a status change (loading →
 * ready/error) re-renders in sync with the alert data itself. `"loading"`
 * is the correct server snapshot — the server, like the client's first
 * render, has never had a chance to resolve `refreshAlerts()` yet.
 */

import { useSyncExternalStore } from "react";

import * as alertService from "@/lib/alerts/service";
import type { AlertRefreshStatus } from "@/lib/alerts/service";

function getServerSnapshot(): AlertRefreshStatus {
  return "loading";
}

export function useAlertRefreshStatus(): AlertRefreshStatus {
  return useSyncExternalStore(alertService.subscribe, alertService.getAlertRefreshStatus, getServerSnapshot);
}
