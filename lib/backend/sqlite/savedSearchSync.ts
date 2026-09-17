/**
 * PR-094.02 (Saved Searches Cloud Sync) — real push/pull for the
 * `savedSearch` entity, a genuine multi-record entity (unlike `account`/
 * `search`'s singleton-per-account shape) — each real saved search is its
 * own row in `saved_searches`, keyed by its own client-generated id, the
 * same real "one row per record" shape `linked_wallets` already
 * established for a different multi-record entity.
 *
 * Deletion is a real, explicit soft-delete (`deleted_at`), never a hard
 * row removal — this is what lets `pullSavedSearchState()` return an
 * EXPLICIT `"delete"` operation for a genuinely-removed record on every
 * subsequent pull, rather than requiring a caller to infer "missing from
 * this response = deleted." An explicit tombstone signal is what makes
 * "a deleted record can never unexpectedly reappear" a real, structural
 * guarantee instead of an inferred one: a record this account never
 * pushed at all is simply never mentioned in a pull response either way
 * (never wiped), while a record that genuinely was deleted keeps
 * reporting `"delete"` on every future pull until the end of time — cheap
 * at this entity's real scale (at most 50 real records per account, see
 * `lib/search/savedSearches.ts`'s own cap).
 *
 * Every write is scoped to the real, session-derived `accountId` the
 * caller already resolved via `resolveRequestSession` — this module never
 * trusts an id embedded in a client-supplied payload, and a create/delete
 * naming an id that belongs to a *different* real account always fails
 * honestly rather than silently no-op'ing as if it had succeeded, or
 * (worse) ever mutating that other account's real row.
 */

import type { DatabaseSync } from "node:sqlite";

import { savedSearchSyncAdapter } from "@/lib/sync/adapters/savedSearch";
import type { SyncOperation } from "@/lib/sync/types";

export type PushSavedSearchOperationsResult = {
  outcome: "success" | "error";
  operations: SyncOperation[];
};

/**
 * `OR IGNORE` (not a plain `INSERT`) — a real, idempotent create can be
 * legitimately replayed with its exact same real operation `id` (a client
 * retry after a lost ack, or this file's own idempotent duplicate-create
 * handling in `applyCreate`), and a second log entry for the same real
 * operation is never useful, only a spurious `sync_operations_log.id`
 * collision.
 */
function logSyncOperation(db: DatabaseSync, accountId: string, operation: SyncOperation): void {
  db.prepare(
    "INSERT OR IGNORE INTO sync_operations_log (id, account_id, entity, entity_id, type, applied_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(operation.id, accountId, operation.entity, operation.entityId, operation.type, new Date().toISOString());
}

function ownerOf(db: DatabaseSync, id: string): string | null {
  const row = db.prepare("SELECT account_id FROM saved_searches WHERE id = ?").get(id) as { account_id: string } | undefined;
  return row?.account_id ?? null;
}

function applyCreate(db: DatabaseSync, accountId: string, operation: SyncOperation, now: string): boolean {
  if (operation.payload === null) return false;
  const data = savedSearchSyncAdapter.deserialize(operation.payload);
  if (data.id !== operation.entityId) return false; // the operation's own real identity, not the payload's, is authoritative

  const existingOwner = ownerOf(db, operation.entityId);
  if (existingOwner !== null) {
    // Real idempotency for a duplicate/replayed create — a genuine no-op
    // for a record this same account already has (live or tombstoned;
    // `ON CONFLICT DO NOTHING` never resurrects a real tombstone), and an
    // honest failure (never a silent success, never a mutation) for an id
    // that collides with a different real account's own record.
    return existingOwner === accountId;
  }

  db.prepare(
    "INSERT INTO saved_searches (id, account_id, query, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, NULL) ON CONFLICT(id) DO NOTHING"
  ).run(operation.entityId, accountId, data.query, data.createdAt, now);
  return ownerOf(db, operation.entityId) === accountId;
}

function applyDelete(db: DatabaseSync, accountId: string, operation: SyncOperation, now: string): boolean {
  const result = db.prepare("UPDATE saved_searches SET deleted_at = ?, updated_at = ? WHERE id = ? AND account_id = ?").run(
    now,
    now,
    operation.entityId,
    accountId
  );
  if (result.changes > 0) return true;

  const existingOwner = ownerOf(db, operation.entityId);
  if (existingOwner !== null) return existingOwner === accountId; // belongs to someone else — real, honest rejection, never a cross-account effect

  // Doesn't exist anywhere yet — a genuine "delete arrived before create"
  // race. A real tombstone is still recorded, owned by the requesting
  // account, so a later out-of-order "create" replay for this same id
  // finds it already tombstoned (see `applyCreate`'s own idempotency)
  // rather than resurrecting it.
  try {
    db.prepare("INSERT INTO saved_searches (id, account_id, query, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?)").run(
      operation.entityId,
      accountId,
      "",
      now,
      now,
      now
    );
    return true;
  } catch {
    return false; // a genuine concurrent race where another real write already claimed this id
  }
}

/**
 * Applies every real `savedSearch` operation, one at a time, each
 * reporting its own honest outcome — a malformed payload, an entityId
 * belonging to a different real account, or a genuine race each fail
 * only their own operation, never the whole batch.
 */
export function pushSavedSearchOperations(db: DatabaseSync, accountId: string, operations: SyncOperation[]): PushSavedSearchOperationsResult {
  const now = new Date().toISOString();

  const results: SyncOperation[] = operations.map((operation) => {
    if (operation.entity !== "savedSearch") {
      return { ...operation, status: "error", retryCount: operation.retryCount + 1, updatedAt: now };
    }

    try {
      const applied = operation.type === "delete" ? applyDelete(db, accountId, operation, now) : applyCreate(db, accountId, operation, now);
      if (!applied) return { ...operation, status: "error", retryCount: operation.retryCount + 1, updatedAt: now };
      logSyncOperation(db, accountId, operation);
      return { ...operation, status: "success", retryCount: operation.retryCount, updatedAt: now };
    } catch {
      return { ...operation, status: "error", retryCount: operation.retryCount + 1, updatedAt: now };
    }
  });

  const outcome = results.every((result) => result.status === "success") ? "success" : "error";
  return { outcome, operations: results };
}

export type PullSavedSearchResult = {
  operations: SyncOperation[];
};

type SavedSearchRow = { id: string; query: string; created_at: string; deleted_at: string | null };

/**
 * The real, complete current state for this account — one real
 * `SyncOperation` per row, live rows as `"create"` and tombstoned rows as
 * a real, explicit `"delete"`. This is what makes reconciliation on the
 * client (`lib/hooks/useCloudSyncActivation.ts`) a matter of applying
 * exactly what's returned, never inferring anything from absence.
 */
export function pullSavedSearchState(db: DatabaseSync, accountId: string): PullSavedSearchResult {
  const rows = db.prepare("SELECT id, query, created_at, deleted_at FROM saved_searches WHERE account_id = ?").all(accountId) as SavedSearchRow[];

  const operations = rows.map((row) => {
    if (row.deleted_at !== null) {
      return { ...savedSearchSyncAdapter.createOperation("delete", row.id, { id: row.id, query: row.query, createdAt: row.created_at }), status: "success" as const, payload: null };
    }
    return {
      ...savedSearchSyncAdapter.createOperation("create", row.id, { id: row.id, query: row.query, createdAt: row.created_at }),
      status: "success" as const,
    };
  });

  return { operations };
}
