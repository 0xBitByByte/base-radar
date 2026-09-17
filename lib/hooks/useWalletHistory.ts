"use client";

/**
 * V4-HISTORY-001 (Phase 6) — the one hook that both drives persistence and
 * reads it back. `useSyncExternalStore` binding to `lib/wallet-history/
 * storage.ts`, the same primitive `useAccount()`/`useAlerts()` already use
 * for an outside-React source of truth — no new subscription mechanism.
 *
 * The ONE side effect this hook owns: appending the live
 * `useWalletAutomation()` snapshot/diff to persisted History whenever a
 * real one arrives. This runs in a `useEffect` (not during render, unlike
 * `useWalletAnalytics.ts`'s own render-time pattern) because it's a real
 * external-store mutation (`localStorage` + a module-scope array), not an
 * adjustment of this component's own local state — exactly the kind of
 * side effect React's rules reserve for `useEffect`. `appendHistorySnapshot`
 * is itself idempotent (see `storage.ts`'s own dedup logic), so mounting
 * this hook from multiple components at once (e.g. the Dashboard widget AND
 * the Wallet page, were both ever mounted together) is always safe.
 *
 * No analytics of any kind happens here — every returned field is a direct
 * read of already-persisted snapshots.
 */

import { useCallback, useEffect, useSyncExternalStore } from "react";

import { useWalletAutomation } from "@/lib/hooks/useWalletAutomation";
import { historyBounds } from "@/lib/wallet-analytics/history";
import { clearHistory as clearHistoryEngine } from "@/lib/wallet-history/engine";
import { appendHistorySnapshot, getStorageSizeBytes, getStoredSnapshots, subscribeToHistory } from "@/lib/wallet-history/storage";
import type { AnalyticsSnapshot } from "@/lib/wallet-history/types";

export type UseWalletHistoryResult = {
  history: AnalyticsSnapshot[];
  latestSnapshot: AnalyticsSnapshot | null;
  newestSnapshot: AnalyticsSnapshot | null;
  oldestSnapshot: AnalyticsSnapshot | null;
  snapshotCount: number;
  storageSizeBytes: number;
  isEmpty: boolean;
  clearHistory: () => void;
};

const EMPTY_HISTORY: AnalyticsSnapshot[] = [];

/** Reference-stable, never a real timestamp — avoids a hydration mismatch between the server's render and whatever the client's real `localStorage` turns out to hold, the same convention `useAccount()`'s own `getServerSnapshot` documents. */
function getServerHistorySnapshot(): AnalyticsSnapshot[] {
  return EMPTY_HISTORY;
}

export function useWalletHistory(): UseWalletHistoryResult {
  const { snapshot, diff } = useWalletAutomation();

  useEffect(() => {
    if (snapshot) {
      appendHistorySnapshot(snapshot, diff);
    }
  }, [snapshot, diff]);

  const history = useSyncExternalStore(subscribeToHistory, getStoredSnapshots, getServerHistorySnapshot);
  const { first, last } = historyBounds(history);
  const clearHistory = useCallback(() => clearHistoryEngine(), []);

  return {
    history,
    latestSnapshot: last,
    newestSnapshot: last,
    oldestSnapshot: first,
    snapshotCount: history.length,
    storageSizeBytes: getStorageSizeBytes(),
    isEmpty: history.length === 0,
    clearHistory,
  };
}
