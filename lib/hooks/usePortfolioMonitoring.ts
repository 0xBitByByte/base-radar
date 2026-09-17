"use client";

/**
 * PR-092.04 (Portfolio Monitoring) — the one hook the monitoring panel reads
 * through. Takes the caller's already-computed `HeldProjectLink[]` and real
 * `WhaleEvent[]` as parameters, exactly like `useAIWatch(view)` takes an
 * already-built `WorkspaceView` — never a second derivation of either.
 *
 * Hydration safety (PR-090.07-established): the `useSyncExternalStore`
 * server-snapshot arguments are fixed, always-empty/disabled defaults, never
 * a call into `localStorage`-reading functions — that argument runs IN THE
 * BROWSER during hydration (not only during real server rendering), so
 * reading real storage there can produce a different result than the true
 * server-rendered HTML and cause a hydration mismatch. This hook applies
 * that fix from the start, matching `useCompare.ts`'s own `getServerState`.
 *
 * `holdingsStatus` (passed by the caller, mirrors `usePortfolio()`'s own
 * `loading`/`error` fields): this hook never evaluates against incomplete
 * data — `"loading"` reports an honest `"checking"`, a real `error` reports
 * an honest `"unavailable"`, and the check only ever runs while `"ready"` —
 * the same hard stale-data gate `useAIWatch` already established for the
 * Alert Engine's own refresh status.
 */

import { useEffect, useSyncExternalStore } from "react";

import {
  getPortfolioMonitoringAlerts,
  getPortfolioMonitoringConfig,
  markPortfolioMonitoringAlertRead,
  markPortfolioMonitoringAlertUnread,
  removePortfolioMonitoring,
  runPortfolioMonitoringCheck,
  setPortfolioMonitoringEnabled,
  subscribe,
} from "@/lib/portfolio-monitoring/storage";
import type { PortfolioMonitoringAlert, PortfolioMonitoringConfig, PortfolioMonitoringStatus } from "@/lib/portfolio-monitoring/types";
import type { HeldProjectLink } from "@/lib/portfolio-intelligence/projectLinks";
import type { WhaleEvent } from "@/lib/whale/types";

const SERVER_CONFIG: PortfolioMonitoringConfig = { enabled: false, createdAt: null };
const SERVER_ALERTS: PortfolioMonitoringAlert[] = [];

function getServerConfig(): PortfolioMonitoringConfig {
  return SERVER_CONFIG;
}

function getServerAlerts(): PortfolioMonitoringAlert[] {
  return SERVER_ALERTS;
}

export type UsePortfolioMonitoringResult = {
  status: PortfolioMonitoringStatus;
  enabled: boolean;
  exists: boolean;
  heldProjectCount: number;
  alerts: PortfolioMonitoringAlert[];
  unreadCount: number;
  enable: () => void;
  disable: () => void;
  remove: () => void;
  markRead: (id: string) => void;
  markUnread: (id: string) => void;
};

export function usePortfolioMonitoring(links: HeldProjectLink[], whaleEvents: WhaleEvent[], holdingsStatus: "loading" | "error" | "ready"): UsePortfolioMonitoringResult {
  const config = useSyncExternalStore(subscribe, getPortfolioMonitoringConfig, getServerConfig);
  const alerts = useSyncExternalStore(subscribe, getPortfolioMonitoringAlerts, getServerAlerts);

  const status: PortfolioMonitoringStatus = holdingsStatus === "ready" ? "ready" : holdingsStatus === "loading" ? "checking" : "unavailable";

  useEffect(() => {
    if (!config.enabled || status !== "ready") return;
    runPortfolioMonitoringCheck(links, whaleEvents);
  }, [config.enabled, status, links, whaleEvents]);

  return {
    status,
    enabled: config.enabled,
    exists: config.createdAt !== null,
    heldProjectCount: links.length,
    alerts,
    unreadCount: alerts.filter((alert) => !alert.isRead).length,
    enable: () => setPortfolioMonitoringEnabled(true),
    disable: () => setPortfolioMonitoringEnabled(false),
    remove: removePortfolioMonitoring,
    markRead: markPortfolioMonitoringAlertRead,
    markUnread: markPortfolioMonitoringAlertUnread,
  };
}
