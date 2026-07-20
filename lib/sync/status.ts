/**
 * The Sync Layer's status tracking — last sync timestamp and online/offline
 * detection. `pendingCount`/`retryCount` are derived from the queue
 * (lib/sync/operations.ts) and `conflictCount` from the conflict store
 * (lib/sync/conflicts.ts) at snapshot time in `service.ts`, rather than
 * duplicated here, so nothing can drift out of sync with the data it
 * summarizes.
 */

import { CURRENT_STATUS_VERSION, migrateStatusRecord } from "@/lib/sync/migration";
import type { SyncState } from "@/lib/sync/types";

/** Exported so `lib/sync/diagnostics.ts` can read this key's raw value for storage-health reporting without duplicating the string literal. */
export const STATUS_STORAGE_KEY = "base-radar:sync-status";
const STORAGE_KEY = STATUS_STORAGE_KEY;
const STORAGE_VERSION = CURRENT_STATUS_VERSION;

export type PersistedSyncStatus = {
  version: number;
  lastSyncAt: string | null;
};

const DEFAULT_STATUS: PersistedSyncStatus = {
  version: STORAGE_VERSION,
  lastSyncAt: null,
};

function sanitizeStatus(value: unknown, fallback: PersistedSyncStatus): PersistedSyncStatus {
  if (typeof value !== "object" || value === null) return fallback;
  const persisted = value as Partial<PersistedSyncStatus>;
  return {
    version: STORAGE_VERSION,
    lastSyncAt:
      typeof persisted.lastSyncAt === "string" || persisted.lastSyncAt === null
        ? (persisted.lastSyncAt ?? null)
        : fallback.lastSyncAt,
  };
}

/** SSR-safe; falls back to `DEFAULT_STATUS` on any parse/validation failure — never throws. */
export function readPersistedStatus(): PersistedSyncStatus {
  if (typeof window === "undefined") return DEFAULT_STATUS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATUS;
    const parsed = JSON.parse(raw) as Partial<PersistedSyncStatus> | null;
    if (typeof parsed !== "object" || parsed === null) return DEFAULT_STATUS;
    const migrated = migrateStatusRecord(parsed.version, parsed as unknown as Record<string, unknown>);
    return sanitizeStatus(migrated.value, DEFAULT_STATUS);
  } catch {
    return DEFAULT_STATUS;
  }
}

/** Best-effort — a full localStorage or private-browsing mode should never crash the app. */
export function writePersistedStatus(status: PersistedSyncStatus): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(status));
  } catch {
    // best-effort — see comment above
  }
}

/** Real browser online/offline detection — no network request, `navigator.onLine` only. */
export function readIsOffline(): boolean {
  if (typeof navigator === "undefined") return false;
  return !navigator.onLine;
}

export type SyncPhase = "idle" | "syncing" | "success" | "error";

/**
 * Priority order: offline (nothing can be attempted while offline) beats
 * conflict (needs attention) beats an in-flight/just-finished attempt's
 * own honest outcome beats the plain queue-derived idle/pending split.
 */
export function deriveState(pendingCount: number, isOffline: boolean, hasConflicts: boolean, phase: SyncPhase): SyncState {
  if (isOffline) return "offline";
  if (hasConflicts) return "conflict";
  if (phase === "syncing") return "syncing";
  if (phase === "error") return "error";
  if (phase === "success" && pendingCount === 0) return "success";
  if (pendingCount > 0) return "pending";
  return "idle";
}
