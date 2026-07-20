/**
 * The Sync Layer's conflict record store — the only file touching
 * localStorage for conflicts. Foundation only: nothing in this codebase
 * ever produces a real conflict yet (there is no remote version to
 * compare a local one against without a backend), but the store and its
 * resolve mechanism are real and working, not stubbed. Per this PR's
 * brief there is no conflict *resolution* logic yet — `resolveConflict`
 * only flips the `resolved` flag, it never merges or picks a winner.
 */

import { CURRENT_CONFLICTS_VERSION, migrateConflictsRecord } from "@/lib/sync/migration";
import type { ConflictRecord, SyncEntity } from "@/lib/sync/types";

/** Exported so `lib/sync/diagnostics.ts` can read this key's raw value for storage-health reporting without duplicating the string literal. */
export const CONFLICTS_STORAGE_KEY = "base-radar:sync-conflicts";
const STORAGE_KEY = CONFLICTS_STORAGE_KEY;
const STORAGE_VERSION = CURRENT_CONFLICTS_VERSION;

type PersistedConflicts = {
  version: number;
  conflicts: ConflictRecord[];
};

const EMPTY_CONFLICTS: ConflictRecord[] = [];

function isValidConflict(value: unknown): value is ConflictRecord {
  if (typeof value !== "object" || value === null) return false;
  const conflict = value as Record<string, unknown>;
  return (
    (conflict.entity === "watchlist" || conflict.entity === "preferences" || conflict.entity === "account") &&
    typeof conflict.entityId === "string" &&
    typeof conflict.resolved === "boolean"
  );
}

function sanitizeConflicts(value: unknown): ConflictRecord[] {
  if (typeof value !== "object" || value === null) return EMPTY_CONFLICTS;
  const persisted = value as Partial<PersistedConflicts>;
  if (!Array.isArray(persisted.conflicts)) return EMPTY_CONFLICTS;
  return persisted.conflicts.filter(isValidConflict);
}

/** SSR-safe; falls back to an empty list on any parse/validation failure — never throws. */
export function readConflicts(): ConflictRecord[] {
  if (typeof window === "undefined") return EMPTY_CONFLICTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_CONFLICTS;
    const parsed = JSON.parse(raw) as Partial<PersistedConflicts> | null;
    if (typeof parsed !== "object" || parsed === null) return EMPTY_CONFLICTS;
    const migrated = migrateConflictsRecord(parsed.version, parsed as unknown as Record<string, unknown>);
    return sanitizeConflicts(migrated.value);
  } catch {
    return EMPTY_CONFLICTS;
  }
}

/** Best-effort — a full localStorage or private-browsing mode should never crash the app. */
export function writeConflicts(conflicts: ConflictRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    const payload: PersistedConflicts = { version: STORAGE_VERSION, conflicts };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // best-effort — see comment above
  }
}

export function listConflicts(): ConflictRecord[] {
  return readConflicts();
}

/** Foundation seam — records a conflict between a local and remote version of an entity. Nothing calls this automatically yet, since there is no remote version to ever compare against without a backend. */
export function addConflict(entity: SyncEntity, entityId: string, localVersion: unknown, remoteVersion: unknown): ConflictRecord {
  const conflict: ConflictRecord = { entity, entityId, localVersion, remoteVersion, resolved: false };
  const next = [...readConflicts().filter((existing) => !(existing.entity === entity && existing.entityId === entityId)), conflict];
  writeConflicts(next);
  return conflict;
}

/** Marks a conflict acknowledged. No merge/reconciliation logic exists yet — this only flips `resolved`, it never picks a winner or merges data. */
export function resolveConflict(entity: SyncEntity, entityId: string): ConflictRecord[] {
  const next = readConflicts().map((conflict) =>
    conflict.entity === entity && conflict.entityId === entityId ? { ...conflict, resolved: true } : conflict
  );
  writeConflicts(next);
  return next;
}
