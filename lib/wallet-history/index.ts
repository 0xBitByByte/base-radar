/**
 * V4-HISTORY-001 — the one clean public surface for this directory,
 * matching `lib/wallet-analytics/index.ts`'s own barrel convention.
 */

export type * from "@/lib/wallet-history/types";

export { getSnapshots, getLatestSnapshot, getSnapshotAt, getSnapshotsBetween, deleteHistory, clearHistory, getHistoryStatus } from "@/lib/wallet-history/engine";

export { appendHistorySnapshot, subscribeToHistory, getHistoryVersion } from "@/lib/wallet-history/storage";
