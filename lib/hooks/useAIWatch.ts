"use client";

/**
 * PR-090.03 (AI Watch — Stage 1) — the one hook the AI Watch panel reads
 * through. Takes the AI Workspace's own already-built `WorkspaceView` as a
 * parameter, exactly like `useAIWorkspaceAsk(view)` — never a second
 * derivation of it. Watchlist membership comes from the canonical
 * `useWatchlist()` (`lib/personalization/`), never a re-implementation.
 *
 * Hard stale-data gate: `useAlertRefreshStatus()` is the one real, already-
 * existing freshness signal for the Alert Engine data Daily Brief's
 * `topRisks` (and therefore this watch's Daily Brief-origin Risk claims)
 * are built from. The check only ever runs — and a trigger can only ever
 * fire — while that status is `"ready"`. `"loading"`/`"error"` report an
 * honest `"checking"`/`"unavailable"` status instead of silently skipping
 * or, worse, evaluating against stale/absent data.
 *
 * Client-side, on-visit only: evaluation happens inside a plain `useEffect`
 * keyed on real inputs — no interval, no background timer, no cron. This
 * mirrors `lib/hooks/useWalletAutomation.ts`'s own "event-driven only, no
 * polling/cron" evaluation pattern exactly.
 */

import { useEffect, useSyncExternalStore } from "react";

import { useAlertRefreshStatus } from "@/lib/hooks/useAlertRefreshStatus";
import { useWatchlist } from "@/lib/hooks/useWatchlist";
import { getAIWatchAlerts, getAIWatchConfig, markAIWatchAlertRead, markAIWatchAlertUnread, removeAIWatch, runAIWatchCheck, setAIWatchEnabled, subscribe } from "@/lib/ai-watch/storage";
import type { AIWatchAlert, AIWatchConfig, AIWatchStatus } from "@/lib/ai-watch/types";
import type { WorkspaceView } from "@/lib/ai-workspace/types";

const SERVER_CONFIG: AIWatchConfig = { enabled: false, createdAt: null };
const SERVER_ALERTS: AIWatchAlert[] = [];

function getServerConfig(): AIWatchConfig {
  return SERVER_CONFIG;
}

function getServerAlerts(): AIWatchAlert[] {
  return SERVER_ALERTS;
}

export type UseAIWatchResult = {
  /** `"checking"`/`"unavailable"` when the Alert Engine's own refresh hasn't succeeded — the watch never evaluates or fires in either state. */
  status: AIWatchStatus;
  enabled: boolean;
  /** `true` once the watch has been enabled at least once — distinguishes "never created" from "created, currently disabled" for the UI's remove affordance. */
  exists: boolean;
  watchlistProjectCount: number;
  alerts: AIWatchAlert[];
  unreadCount: number;
  enable: () => void;
  disable: () => void;
  remove: () => void;
  markRead: (id: string) => void;
  markUnread: (id: string) => void;
};

export function useAIWatch(view: WorkspaceView): UseAIWatchResult {
  const { projectIds } = useWatchlist();
  const alertRefreshStatus = useAlertRefreshStatus();

  const config = useSyncExternalStore(subscribe, getAIWatchConfig, getServerConfig);
  const alerts = useSyncExternalStore(subscribe, getAIWatchAlerts, getServerAlerts);

  const status: AIWatchStatus = alertRefreshStatus === "ready" ? "ready" : alertRefreshStatus === "loading" ? "checking" : "unavailable";

  useEffect(() => {
    if (!config.enabled || status !== "ready") return;
    runAIWatchCheck(view, projectIds);
  }, [config.enabled, status, view, projectIds]);

  return {
    status,
    enabled: config.enabled,
    exists: config.createdAt !== null,
    watchlistProjectCount: projectIds.length,
    alerts,
    unreadCount: alerts.filter((alert) => !alert.isRead).length,
    enable: () => setAIWatchEnabled(true),
    disable: () => setAIWatchEnabled(false),
    remove: removeAIWatch,
    markRead: markAIWatchAlertRead,
    markUnread: markAIWatchAlertUnread,
  };
}
