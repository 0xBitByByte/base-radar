/**
 * V4-ANALYTICS-001 — pure helpers over a snapshot history array. This file
 * never OWNS the history itself (no module-scope state, no `useState`) —
 * `lib/hooks/useWalletAnalytics.ts` (React, outside this directory per
 * this phase's own "no React/no hooks" rule) is the one place an actual
 * accumulating array lives, session-only, exactly matching
 * `useWalletAutomation()`'s own established "in-memory, never persisted"
 * pattern. No `localStorage`, no database — persisting real history across
 * sessions is explicitly V4-HISTORY-001's job, not this one's.
 */

import type { AutomationSnapshot } from "@/lib/wallet-automation/types";

export const DEFAULT_MAX_HISTORY_LENGTH = 90;

/**
 * Appends `snapshot` unless its `timestamp` already matches the most recent
 * entry (a re-render/refresh that produced an identical `PortfolioIntelligence`
 * — same `lastUpdated` — must never grow history, matching Wallet
 * Automation's own "refresh without change produces nothing" discipline).
 * Oldest entries drop first once `maxLength` is exceeded.
 */
export function appendSnapshot(history: AutomationSnapshot[], snapshot: AutomationSnapshot, maxLength: number = DEFAULT_MAX_HISTORY_LENGTH): AutomationSnapshot[] {
  const last = history[history.length - 1];
  if (last && last.timestamp === snapshot.timestamp) return history;

  const next = [...history, snapshot];
  return next.length > maxLength ? next.slice(next.length - maxLength) : next;
}

/** The oldest and newest snapshot in `history`, or `null` for either when history is empty. Not `history[0]`/`history[history.length-1]` inlined everywhere else — the one place this shape is named. */
export function historyBounds(history: AutomationSnapshot[]): { first: AutomationSnapshot | null; last: AutomationSnapshot | null } {
  return { first: history[0] ?? null, last: history[history.length - 1] ?? null };
}
