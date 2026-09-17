"use client";

/**
 * PR-090.04 (Smart Collections) — the one hook the Smart Collections UI
 * reads through. Takes the 7 server-evaluated results as a parameter
 * (already computed once, server-side, from `getLiveProjects()`/
 * `getRawWhaleEvents()` — never re-derived here) and combines them with the
 * 3 client-evaluated results, read through the exact same canonical hooks
 * `AIWorkspaceView`/`useAIWatch` already use: `useEcosystemIntelligenceAlerts()`,
 * `useDailyBrief()`, and the same hard stale-data gate,
 * `useAlertRefreshStatus()`. A collection whose real data hasn't loaded (or
 * failed) reports `"checking"`/`"unavailable"` with zero matches — never a
 * fabricated result.
 */

import { useMemo } from "react";

import { useAlertRefreshStatus } from "@/lib/hooks/useAlertRefreshStatus";
import { useDailyBrief } from "@/lib/hooks/useDailyBrief";
import { useEcosystemIntelligenceAlerts } from "@/lib/hooks/useEcosystemIntelligenceAlerts";
import { evaluateClientCollections } from "@/lib/smart-collections/aggregate";
import { SMART_COLLECTION_IDS } from "@/lib/smart-collections/types";
import type { SmartCollectionResult, SmartCollectionStatus } from "@/lib/smart-collections/types";

/** Restores the fixed, documented `SMART_COLLECTION_IDS` order regardless of which array (server or client) each result came from — a stable presentation order, never dependent on evaluation timing. */
function mergeInFixedOrder(serverResults: SmartCollectionResult[], clientResults: SmartCollectionResult[]): SmartCollectionResult[] {
  const byId = new Map<string, SmartCollectionResult>();
  for (const result of [...serverResults, ...clientResults]) byId.set(result.id, result);
  return SMART_COLLECTION_IDS.map((id) => byId.get(id)).filter((result): result is SmartCollectionResult => result !== undefined);
}

export function useSmartCollections(serverResults: SmartCollectionResult[]): SmartCollectionResult[] {
  const alerts = useEcosystemIntelligenceAlerts();
  const dailyBrief = useDailyBrief();
  const alertRefreshStatus = useAlertRefreshStatus();

  const status: SmartCollectionStatus = alertRefreshStatus === "ready" ? "ready" : alertRefreshStatus === "loading" ? "checking" : "unavailable";

  const clientResults = useMemo(() => evaluateClientCollections(alerts, dailyBrief, status, new Date().toISOString()), [alerts, dailyBrief, status]);

  return useMemo(() => mergeInFixedOrder(serverResults, clientResults), [serverResults, clientResults]);
}
