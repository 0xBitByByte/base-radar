/**
 * V4-HISTORY-004 — the Replay Controller: pure navigation over an
 * already-real `AnalyticsSnapshot[]`. Every function here only SELECTS
 * which already-persisted snapshot is "current" — none of them compute
 * anything. No `buildWalletAnalytics`, no `buildPortfolioIntelligence`, no
 * provider call, no `lib/wallet-history` import at all (this operates on
 * an already-fetched array, the same "presentation-layer logic over a
 * given array" convention `walletHistoryFilters.ts`/`walletSnapshotCompare.ts`
 * already established). State is tracked by real TIMESTAMP, never array
 * index — `useWalletHistory()`'s history can keep growing live in the
 * background while a user is replaying (new real snapshots still arrive),
 * and an index would silently point at the wrong entry once the array
 * shifts; a timestamp always identifies the exact same real snapshot.
 *
 * `replayPrevious`/`replayLatest` directly reuse `findPreviousSnapshot`/
 * `findLatestSnapshot` from `walletSnapshotCompare.ts` — "reuse exactly as
 * implemented," never a second lookup algorithm.
 */

import { findLatestSnapshot, findPreviousSnapshot } from "@/components/wallet/walletSnapshotCompare";
import type { AnalyticsSnapshot } from "@/lib/wallet-history/types";

export type ReplayPosition = {
  snapshot: AnalyticsSnapshot;
  /** 1-based, for real display — "Snapshot 3 of 12." */
  index: number;
  total: number;
  isFirst: boolean;
  isLatest: boolean;
};

/**
 * Resolves which real snapshot Replay is currently showing. `timestamp:
 * null`, or a timestamp that no longer exists in `history` (e.g. it aged
 * out of the real 90-entry cap while replaying), falls back to the real
 * latest snapshot — never a blank/broken replay. `null` only when
 * `history` itself is genuinely empty.
 */
export function resolveReplayPosition(history: AnalyticsSnapshot[], timestamp: string | null): ReplayPosition | null {
  if (history.length === 0) return null;

  const foundIndex = timestamp !== null ? history.findIndex((s) => s.timestamp === timestamp) : -1;
  const index = foundIndex !== -1 ? foundIndex : history.length - 1;

  return { snapshot: history[index], index: index + 1, total: history.length, isFirst: index === 0, isLatest: index === history.length - 1 };
}

export function replayFirst(history: AnalyticsSnapshot[]): string | null {
  return history[0]?.timestamp ?? null;
}

export function replayLatest(history: AnalyticsSnapshot[]): string | null {
  return findLatestSnapshot(history)?.timestamp ?? null;
}

/** Clamped at the real oldest snapshot — calling "previous" while already at the first is a real, honest no-op, never wraps or throws. */
export function replayPrevious(history: AnalyticsSnapshot[], currentTimestamp: string): string {
  const current = history.find((s) => s.timestamp === currentTimestamp);
  if (!current) return currentTimestamp;
  return findPreviousSnapshot(history, current)?.timestamp ?? currentTimestamp;
}

/** Clamped at the real latest snapshot — same no-op-at-the-boundary convention as `replayPrevious`. */
export function replayNext(history: AnalyticsSnapshot[], currentTimestamp: string): string {
  const index = history.findIndex((s) => s.timestamp === currentTimestamp);
  if (index === -1 || index === history.length - 1) return currentTimestamp;
  return history[index + 1].timestamp;
}

/**
 * The real, latest snapshot at-or-before `date` — mirrors
 * `lib/wallet-history/engine.ts`'s own `getSnapshotAt()` semantics exactly,
 * adapted to operate on an already-given array (that function reads the
 * live store directly; this one doesn't own any store, matching this
 * file's own "pure navigation, no retrieval" scope). `null` when nothing
 * real exists at or before that date — callers should treat `null` as "no
 * real jump to make," keeping whatever position Replay was already at,
 * never clearing to a blank state.
 */
export function replayJumpToDate(history: AnalyticsSnapshot[], date: string): string | null {
  const targetMs = new Date(date).getTime();
  const eligible = history.filter((s) => new Date(s.timestamp).getTime() <= targetMs);
  return eligible[eligible.length - 1]?.timestamp ?? null;
}
