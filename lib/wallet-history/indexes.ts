/**
 * V4-FUTURE-002E — reusable lookup infrastructure over `AnalyticsSnapshot[]`
 * (real, session-accumulated history). At least five separate functions
 * across `lib/cross-feature/refs.ts`, `components/wallet/walletSnapshotCompare.ts`,
 * and `components/wallet/walletReplayController.ts` each independently
 * `.find()`/`.findIndex()` a snapshot by its real timestamp — this is that
 * lookup, extracted once, for any FUTURE consumer to reuse.
 *
 * Deliberately NOT wired into those five existing functions this phase:
 * each is small, pure, already well-tested, and operates on a real history
 * capped at ~90 entries — genuinely fast already. Threading an index
 * parameter through five small functions for a dataset this size would
 * trade real readability for a performance gain nobody can currently
 * measure — exactly what this phase's own brief says not to do ("this
 * phase is NOT about optimization for speed... do not refactor code that
 * becomes less readable"). See `docs/WALLET_LOOKUP_INDEXES.md` for the
 * full accounting of what stayed array-based and why.
 */

import type { AnalyticsSnapshot } from "@/lib/wallet-history/types";

export type WalletHistoryIndexes = {
  /** Real position in the SAME `history` array this was built from — `history[indexByTimestamp.get(timestamp)]` is that exact snapshot. First-write-wins for a (should-never-happen) duplicate timestamp. */
  indexByTimestamp: Map<string, number>;
};

export function buildWalletHistoryIndexes(history: AnalyticsSnapshot[]): WalletHistoryIndexes {
  const indexByTimestamp = new Map<string, number>();
  for (let i = 0; i < history.length; i++) {
    if (!indexByTimestamp.has(history[i].timestamp)) indexByTimestamp.set(history[i].timestamp, i);
  }
  return { indexByTimestamp };
}
