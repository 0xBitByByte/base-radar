/**
 * PR-094.01 (Recent Searches Cross-Device Sync) — the real push/pull logic
 * for the `search` entity, the exact same shape
 * `lib/backend/sqlite/accountSync.ts` already established for `account`:
 * scoped to the real, session-derived `accountId` the caller already
 * resolved via `resolveRequestSession` — never an id embedded in a
 * client-supplied payload. Only ever reads/writes the real `queries`
 * column (query strings only, the same "never search results or provider
 * data" boundary `lib/search/storage.ts` already enforces locally) — there
 * is no field here that could ever carry session/auth material, the same
 * structural guarantee `accountSync.ts`'s whitelisted `UPDATE` already
 * has.
 */

import type { DatabaseSync } from "node:sqlite";

import { RECENT_SEARCHES_ENTITY_ID, searchSyncAdapter, type RecentSearchesData } from "@/lib/sync/adapters/search";
import type { SyncOperation } from "@/lib/sync/types";

export type PushSearchOperationsResult = {
  outcome: "success" | "error";
  operations: SyncOperation[];
};

/**
 * `OR IGNORE`, matching `accountSync.ts`'s own identical fix and
 * `savedSearchSync.ts`'s established precedent — a replayed real operation
 * id (the local Sync Queue keeps `"success"` operations and re-pushes them
 * on a later sync) must never throw on this table's `PRIMARY KEY`, or the
 * otherwise-successful `search_history` write above it gets reported as a
 * false per-operation `"error"`.
 */
function logSyncOperation(db: DatabaseSync, accountId: string, operation: SyncOperation): void {
  db.prepare(
    "INSERT OR IGNORE INTO sync_operations_log (id, account_id, entity, entity_id, type, applied_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(operation.id, accountId, operation.entity, operation.entityId, operation.type, new Date().toISOString());
}

/**
 * Applies every real `search` operation in order (last one wins, the same
 * "remote/latest is authoritative" shape `searchSyncAdapter.merge()`
 * already documents) — a malformed payload or a payload naming the wrong
 * entity fails only its own operation, never the whole batch, exactly
 * mirroring `pushAccountOperations()`'s own error handling.
 */
export function pushSearchOperations(db: DatabaseSync, accountId: string, operations: SyncOperation[]): PushSearchOperationsResult {
  const now = new Date().toISOString();

  const results: SyncOperation[] = operations.map((operation) => {
    if (operation.entity !== "search") {
      return { ...operation, status: "error", retryCount: operation.retryCount + 1, updatedAt: now };
    }
    if (operation.payload === null) {
      return { ...operation, status: "error", retryCount: operation.retryCount + 1, updatedAt: now };
    }

    try {
      const data = searchSyncAdapter.deserialize(operation.payload);
      db.prepare(
        `INSERT INTO search_history (account_id, queries, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(account_id) DO UPDATE SET queries = excluded.queries, updated_at = excluded.updated_at`
      ).run(accountId, JSON.stringify(data.queries), now);
      logSyncOperation(db, accountId, operation);
      return { ...operation, status: "success", retryCount: operation.retryCount, updatedAt: now };
    } catch {
      // Covers a malformed/undeserializable payload and any real SQLite
      // failure alike — reported as an honest per-operation failure,
      // never a crash.
      return { ...operation, status: "error", retryCount: operation.retryCount + 1, updatedAt: now };
    }
  });

  const outcome = results.every((result) => result.status === "success") ? "success" : "error";
  return { outcome, operations: results };
}

export type PullSearchResult = {
  operations: SyncOperation[];
};

/** The real, current cloud Recent Searches list, wrapped as the one real `SyncOperation` a caller applies locally — reuses `searchSyncAdapter.createOperation()`. Returns an empty result when this account has never pushed a real Recent Searches list, never a fabricated empty-list placeholder pretending to be real cloud state. */
export function pullSearchState(db: DatabaseSync, accountId: string): PullSearchResult {
  const row = db.prepare("SELECT queries FROM search_history WHERE account_id = ?").get(accountId) as { queries: string } | undefined;
  if (!row) return { operations: [] };

  let data: RecentSearchesData;
  try {
    const parsed: unknown = JSON.parse(row.queries);
    if (!Array.isArray(parsed) || !parsed.every((query) => typeof query === "string")) return { operations: [] };
    data = { queries: parsed };
  } catch {
    // A genuinely corrupted stored row is treated the same as "nothing real to pull" — never a fabricated or partially-parsed list.
    return { operations: [] };
  }

  const operation = searchSyncAdapter.createOperation("update", RECENT_SEARCHES_ENTITY_ID, data);
  return { operations: [{ ...operation, status: "success" }] };
}
