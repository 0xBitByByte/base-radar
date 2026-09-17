"use client";

/**
 * V4-ANALYTICS-001 — the one hook every Analytics UI surface reads
 * through.
 *
 * V4-HISTORY-001 (Phase 10) — history now comes from `useWalletHistory()`
 * (real, `localStorage`-backed persistence) WHEN AVAILABLE, falling back to
 * the original session-only in-memory accumulation only if persisted
 * history is genuinely empty (e.g. `localStorage` blocked — private
 * browsing, quota exceeded, `storage.ts`'s own try/catch already degrades
 * gracefully to "nothing persisted" in that case, same as every other
 * localStorage-backed module in this app). `buildWalletAnalytics()` itself
 * (`lib/wallet-analytics/engine.ts`) is completely unchanged by this — only
 * the SOURCE of the `history` array it's called with changed, per the
 * brief's own "the analytics engine itself must remain unchanged" rule.
 *
 * The session-only fallback appends during RENDER, not inside a
 * `useEffect` — the React-documented "adjusting state when a prop changes"
 * pattern (comparing against a tracked `lastSnapshotTimestamp`), which
 * avoids the extra render-then-effect-then-render cascade a naive
 * `useEffect(() => setHistory(...), [snapshot])` would cause for what's
 * really a pure derivation of "did the snapshot change." Never fetches
 * anything itself — `useWalletAutomation()` (and transitively
 * `useWalletPortfolioIntelligence()`/`usePortfolio()`) is the only data
 * source.
 */

import { useMemo, useState } from "react";

import { useWalletAutomation } from "@/lib/hooks/useWalletAutomation";
import { useWalletHistory } from "@/lib/hooks/useWalletHistory";
import { appendSnapshot } from "@/lib/wallet-analytics/history";
import { buildWalletAnalytics } from "@/lib/wallet-analytics/engine";
import type { AnalyticsWindow, WalletAnalytics } from "@/lib/wallet-analytics/types";
import type { AutomationSnapshot } from "@/lib/wallet-automation/types";

export type UseWalletAnalyticsResult = {
  analytics: WalletAnalytics;
  history: AutomationSnapshot[];
};

/**
 * V4-ANALYTICS-001A (Phase 2) — `window` is an optional, backward-compatible
 * parameter (default `"all"`, the original behavior): every existing call
 * site (`PortfolioWidget.tsx`'s compact read) keeps working unchanged, while
 * the Wallet page can pass a user-selected window through to the same
 * underlying `buildWalletAnalytics()` — no second data path.
 */
export function useWalletAnalytics(window: AnalyticsWindow = "all"): UseWalletAnalyticsResult {
  const walletAutomation = useWalletAutomation();
  const walletHistory = useWalletHistory();

  const [sessionHistory, setSessionHistory] = useState<AutomationSnapshot[]>([]);
  const [lastSnapshotTimestamp, setLastSnapshotTimestamp] = useState<string | null>(null);

  const currentSnapshot = walletAutomation.snapshot;
  if (currentSnapshot && currentSnapshot.timestamp !== lastSnapshotTimestamp) {
    setLastSnapshotTimestamp(currentSnapshot.timestamp);
    setSessionHistory((prev) => appendSnapshot(prev, currentSnapshot));
  }

  const history = walletHistory.history.length > 0 ? walletHistory.history : sessionHistory;

  const analytics = useMemo(() => buildWalletAnalytics(history, walletAutomation.events, window), [history, walletAutomation.events, window]);

  return { analytics, history };
}
