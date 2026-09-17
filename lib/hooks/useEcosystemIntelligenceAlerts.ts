"use client";

/**
 * React binding for `lib/alerts/service.ts`'s `getEcosystemIntelligenceAlerts()`
 * — the ecosystem-wide counterpart to `useIntelligenceAlerts.ts`, same
 * `useSyncExternalStore` pattern every other Alert Engine hook uses,
 * subscribed to the same store so an ecosystem recompute stays in sync
 * with every other alert surface. PR-085.02, Executive Dashboard.
 */

import { useSyncExternalStore } from "react";

import * as alertService from "@/lib/alerts/service";
import type { IntelligenceAlert } from "@/lib/alerts/intelligence/types";

const EMPTY_INTELLIGENCE_ALERTS: IntelligenceAlert[] = [];

function getServerSnapshot(): IntelligenceAlert[] {
  return EMPTY_INTELLIGENCE_ALERTS;
}

export function useEcosystemIntelligenceAlerts(): IntelligenceAlert[] {
  return useSyncExternalStore(alertService.subscribe, alertService.getEcosystemIntelligenceAlerts, getServerSnapshot);
}
