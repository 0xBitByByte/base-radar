/**
 * V4-HISTORY-004 (Phase 7) — a tiny, cross-page "is Replay currently
 * active" indicator, so the Dashboard can honestly show "Currently
 * Replaying" while the Wallet page's History Browser has Replay open.
 * Mirrors `lib/wallet-history/storage.ts`'s own established module-scope +
 * `listeners`/`notify()` + `subscribe()` pattern exactly — the same
 * primitive, NOT a second store mechanism.
 *
 * Deliberately NOT persisted to `localStorage` — this is real-time UI
 * session state, not history. It always starts `null` on a fresh page
 * load/reload (an honest "not currently replaying," never a stale
 * "replaying" carried over from a closed tab), and lives only in this
 * module's memory for as long as the app stays open — exactly the same
 * "session-only, not durable" scope `lib/wallet-history/*` itself
 * deliberately stays out of (see that module's own "no IndexedDB/backend/
 * cloud sync" rule — this follows the identical restraint for its own,
 * smaller concern).
 */

import type { AnalyticsSnapshot } from "@/lib/wallet-history/types";

let activeReplayTimestamp: string | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

export function getActiveReplayTimestamp(): string | null {
  return activeReplayTimestamp;
}

/** `null` means Replay is not active anywhere. A real timestamp means Replay is active and currently showing that snapshot. */
export function setActiveReplayTimestamp(timestamp: string | null): void {
  if (activeReplayTimestamp === timestamp) return;
  activeReplayTimestamp = timestamp;
  notify();
}

export function subscribeToReplaySession(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isReplayingSnapshot(snapshot: AnalyticsSnapshot | null): boolean {
  return snapshot !== null && activeReplayTimestamp === snapshot.timestamp;
}
