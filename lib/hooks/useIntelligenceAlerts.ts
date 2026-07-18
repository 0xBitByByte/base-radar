"use client";

/**
 * React binding for `lib/alerts/service.ts`'s `getIntelligenceAlerts()` — the
 * same `useSyncExternalStore` pattern every other Alert Engine hook
 * (`useAlerts`, `useVisibleAlerts`) already uses, subscribed to the same
 * store so an intelligence recompute (which only ever follows a real
 * `cachedVisibleAlerts` change) re-renders alongside every other alert
 * surface, never on its own separate schedule.
 */

import { useSyncExternalStore } from "react";

import * as alertService from "@/lib/alerts/service";
import type { IntelligenceAlert } from "@/lib/alerts/intelligence/types";

const EMPTY_INTELLIGENCE_ALERTS: IntelligenceAlert[] = [];

function getServerSnapshot(): IntelligenceAlert[] {
  return EMPTY_INTELLIGENCE_ALERTS;
}

export function useIntelligenceAlerts(): IntelligenceAlert[] {
  return useSyncExternalStore(alertService.subscribe, alertService.getIntelligenceAlerts, getServerSnapshot);
}
