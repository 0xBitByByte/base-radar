/**
 * V4-HISTORY-001 (Phase 5) — the Replay Engine: RETRIEVAL ONLY. Every
 * function here reads real, already-persisted `AnalyticsSnapshot`s off
 * `storage.ts` — none of them compute a trend, a score, a recovery, a
 * highlight, or any other interpretation. That is Wallet Analytics' job
 * (`lib/wallet-analytics/`), which consumes this module's output as its
 * input — never the reverse, and this module never imports from
 * `lib/wallet-analytics/engine.ts` or calls `buildWalletAnalytics()`.
 */

import { historyBounds } from "@/lib/wallet-analytics/history";
import { deleteHistoryStorage, getStorageSizeBytes, getStoredSnapshots } from "@/lib/wallet-history/storage";
import type { AnalyticsSnapshot, HistoryStatus } from "@/lib/wallet-history/types";

/** Every real, persisted snapshot, oldest first (append order) — a fresh array reference each call, never a mutable handle into the storage layer's own state. */
export function getSnapshots(): AnalyticsSnapshot[] {
  return [...getStoredSnapshots()];
}

export function getLatestSnapshot(): AnalyticsSnapshot | null {
  const all = getStoredSnapshots();
  return all[all.length - 1] ?? null;
}

/**
 * "What was the real state AS OF this date" — the latest real snapshot
 * whose `timestamp` is at or before `date`. `null` when no snapshot exists
 * at or before that date (never the nearest AFTER it, and never an
 * interpolated/invented value — a genuine point-in-time lookup, still pure
 * retrieval).
 */
export function getSnapshotAt(date: string): AnalyticsSnapshot | null {
  const targetMs = new Date(date).getTime();
  const all = getStoredSnapshots();
  let result: AnalyticsSnapshot | null = null;
  for (const snapshot of all) {
    if (new Date(snapshot.timestamp).getTime() <= targetMs) {
      result = snapshot;
    } else {
      break; // stored oldest-first — once we pass the target date, nothing later qualifies
    }
  }
  return result;
}

/** Every real snapshot with `from <= timestamp <= to` (inclusive both ends). */
export function getSnapshotsBetween(from: string, to: string): AnalyticsSnapshot[] {
  const fromMs = new Date(from).getTime();
  const toMs = new Date(to).getTime();
  return getStoredSnapshots().filter((snapshot) => {
    const ms = new Date(snapshot.timestamp).getTime();
    return ms >= fromMs && ms <= toMs;
  });
}

/**
 * Both names exist per the brief's own Phase 5/Phase 6 spec — `deleteHistory`
 * is the Replay Engine's own primitive name; `clearHistory` (below) is the
 * identical operation under the name the UI/hook layer uses. Neither is a
 * distinct behavior from the other — one real mutation, two names.
 */
export function deleteHistory(): void {
  deleteHistoryStorage();
}

export function clearHistory(): void {
  deleteHistoryStorage();
}

/** The real, honest facts `HistorySections.tsx` needs — every field a direct read of `getSnapshots()`'s own output, never a computed/interpreted metric. */
export function getHistoryStatus(): HistoryStatus {
  const all = getStoredSnapshots();
  const { first, last } = historyBounds(all);
  return {
    snapshotCount: all.length,
    firstSnapshot: first,
    latestSnapshot: last,
    storageSizeBytes: getStorageSizeBytes(),
    isEmpty: all.length === 0,
  };
}
