/**
 * V4-HISTORY-001 (Phases 2-4) — the persistence layer itself. Mirrors
 * `lib/wallet-automation/rules.ts`'s exact established `localStorage` +
 * module-scope cache + `listeners`/`notify()` + `subscribe()` pattern (the
 * same one `lib/account/service.ts`/`lib/alerts/service.ts` use) — not a
 * new persistence mechanism invented for this module.
 *
 * Each snapshot is stored via `serializeAnalyticsSnapshot()` individually
 * (not one big `JSON.stringify` of the whole array) so a single corrupted
 * entry — a bad write, a manually-edited localStorage value — never
 * invalidates the rest of history: `deserializeAnalyticsSnapshot()` is
 * applied per-entry on read, and any entry it rejects is silently skipped,
 * never thrown.
 *
 * Deduplication (Phase 4) reuses the REAL `AutomationDiff` a caller already
 * computed (`lib/wallet-automation/snapshot.ts`'s `buildAutomationDiff`) —
 * this file never invents a second diff/comparison engine. A snapshot is
 * only ever persisted when it's the first real entry, or the given `diff`
 * reports at least one real changed field, or (with no diff supplied) its
 * timestamp differs from the last stored entry — the same minimum bar
 * `lib/wallet-analytics/history.ts`'s own `appendSnapshot` already uses.
 */

import { DEFAULT_MAX_HISTORY_LENGTH } from "@/lib/wallet-analytics/history";
import { deserializeAnalyticsSnapshot, serializeAnalyticsSnapshot } from "@/lib/wallet-analytics/serialization";
import type { AnalyticsSnapshot, PersistedHistoryState } from "@/lib/wallet-history/types";
import type { AutomationDiff } from "@/lib/wallet-automation/types";

const HISTORY_STORAGE_KEY = "base-radar:wallet-history";
const HISTORY_STORAGE_VERSION = 1;

function isPersistedHistoryState(value: unknown): value is PersistedHistoryState {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<PersistedHistoryState>;
  if (candidate.version !== HISTORY_STORAGE_VERSION) return false;
  return Array.isArray(candidate.snapshots) && candidate.snapshots.every((s) => typeof s === "string");
}

let snapshots: AnalyticsSnapshot[] = [];
let hydrated = false;
let lastRawSize = 0;

function ensureHydrated(): void {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;

  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return;
    lastRawSize = raw.length;

    const parsed: unknown = JSON.parse(raw);
    if (!isPersistedHistoryState(parsed)) return;

    // Per-entry deserialization — one corrupted entry is skipped, never
    // discards the rest of a real history.
    snapshots = parsed.snapshots.map((s) => deserializeAnalyticsSnapshot(s)).filter((s): s is AnalyticsSnapshot => s !== null);
  } catch {
    // Corrupted localStorage value — same "start from empty, never throw" convention every other overlay in this codebase uses.
    snapshots = [];
  }
}

function persist(): void {
  if (typeof window === "undefined") return;
  try {
    const state: PersistedHistoryState = { version: HISTORY_STORAGE_VERSION, snapshots: snapshots.map(serializeAnalyticsSnapshot) };
    const raw = JSON.stringify(state);
    window.localStorage.setItem(HISTORY_STORAGE_KEY, raw);
    lastRawSize = raw.length;
  } catch {
    // Best-effort persistence — same convention as every other localStorage-backed module here (e.g. private browsing / quota exceeded).
  }
}

let historyVersion = 0;
const listeners = new Set<() => void>();

function notify(): void {
  historyVersion += 1;
  for (const listener of listeners) listener();
}

/** Real facts only — the same minimum bar `lib/wallet-analytics/history.ts`'s own `appendSnapshot` uses (never re-append an identical timestamp), extended with a real diff when the caller has one: no changed field means no real change occurred, so nothing is persisted. */
function isMeaningfulAppend(snapshot: AnalyticsSnapshot, diff: AutomationDiff | null): boolean {
  const last = snapshots[snapshots.length - 1];
  if (!last) return true;
  if (last.timestamp === snapshot.timestamp) return false;
  if (diff && diff.toTimestamp === snapshot.timestamp && diff.changed.length === 0) return false;
  return true;
}

/** Appends `snapshot` when it's meaningful (see `isMeaningfulAppend`), capping at `DEFAULT_MAX_HISTORY_LENGTH` — the same real limit `lib/wallet-analytics/history.ts` already established, reused rather than a second arbitrary number invented here. Returns whether it was actually appended. */
export function appendHistorySnapshot(snapshot: AnalyticsSnapshot, diff: AutomationDiff | null): boolean {
  ensureHydrated();
  if (!isMeaningfulAppend(snapshot, diff)) return false;

  snapshots = [...snapshots, snapshot];
  if (snapshots.length > DEFAULT_MAX_HISTORY_LENGTH) {
    snapshots = snapshots.slice(snapshots.length - DEFAULT_MAX_HISTORY_LENGTH);
  }
  persist();
  notify();
  return true;
}

export function getStoredSnapshots(): AnalyticsSnapshot[] {
  ensureHydrated();
  return snapshots;
}

export function getStorageSizeBytes(): number {
  ensureHydrated();
  return lastRawSize;
}

/** The real mutation both `deleteHistory()` and `clearHistory()` are — see `engine.ts`'s doc comment on why both names exist. */
export function deleteHistoryStorage(): void {
  ensureHydrated();
  if (snapshots.length === 0 && lastRawSize === 0) return;

  snapshots = [];
  lastRawSize = 0;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch {
      // Best-effort — same convention as `persist()`.
    }
  }
  notify();
}

export function subscribeToHistory(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getHistoryVersion(): number {
  return historyVersion;
}
