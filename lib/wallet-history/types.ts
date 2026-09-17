/**
 * V4-HISTORY-001 — domain types for the persistence layer. History owns
 * PERSISTENCE ONLY: it stores and retrieves already-built
 * `AutomationSnapshot`s, never calculates a score, a trend, a recovery, a
 * milestone, a highlight, or a recommendation — those stay owned by
 * Portfolio Intelligence / Portfolio AI / Wallet Automation / Wallet
 * Analytics respectively (see `docs/ARCHITECTURE.md`'s ownership table).
 *
 * `AnalyticsSnapshot` is a NAMED ALIAS of `AutomationSnapshot`, not a new
 * shape — "Never duplicate AutomationSnapshot" per the brief. It exists so
 * this module's own public API reads in its own domain vocabulary
 * ("History stores `AnalyticsSnapshot`s") without introducing a second,
 * parallel snapshot format.
 */

import type { AutomationSnapshot } from "@/lib/wallet-automation/types";

export type AnalyticsSnapshot = AutomationSnapshot;

/** The real, on-disk shape `storage.ts` reads/writes — an outer envelope version (independent of each snapshot's own `analyticsVersion`) wrapping individually-serialized snapshot strings, so a single corrupted entry never invalidates the rest of history. */
export type PersistedHistoryState = {
  version: number;
  snapshots: string[];
};

/** V4-HISTORY-001 (Phase 7) — the real, honest facts the "Historical Portfolio" UI section needs, all derived from `getSnapshots()`'s own output plus the raw byte size of what's actually on disk — never a computed/interpreted metric. */
export type HistoryStatus = {
  snapshotCount: number;
  firstSnapshot: AnalyticsSnapshot | null;
  latestSnapshot: AnalyticsSnapshot | null;
  storageSizeBytes: number;
  isEmpty: boolean;
};
