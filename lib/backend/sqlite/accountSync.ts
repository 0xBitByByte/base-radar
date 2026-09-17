/**
 * PR-093.06 (Ongoing Cloud Sync) — the real push/pull logic behind
 * `sqliteBackend.services.sync` (`lib/backend/sqlite/index.ts`), scoped
 * deliberately to the `account` entity only: the smallest slice the
 * existing Sync Adapter/Queue/Engine architecture already represents for
 * "account/profile data." `watchlist`/`preferences` operations reach this
 * module too (the Sync Queue is entity-agnostic), but nothing in the app
 * enqueues them yet, and their own sync semantics are left for a later
 * pass rather than guessed at here — a non-`account` operation is reported
 * as a real, honest per-operation error, never silently dropped or
 * fabricated as a success.
 *
 * Every write is scoped to the real, session-derived `accountId` the
 * caller (`/api/sync/push`, `/api/sync/pull`) already resolved via
 * `resolveRequestSession` — this module never trusts an id embedded in a
 * client-supplied payload. Only the real, editable profile fields
 * (`name`/`username`/`email`/`avatar`/`bio`) are ever written from a
 * pushed payload — `id`/`createdAt`/`isGuest`/etc. are server-owned and
 * silently ignored even if present in the deserialized `Account`.
 */

import type { DatabaseSync } from "node:sqlite";

import { getAccountById } from "@/lib/backend/sqlite/accounts";
import { accountSyncAdapter } from "@/lib/sync/adapters/account";
import type { SyncOperation } from "@/lib/sync/types";

export type PushAccountOperationsResult = {
  outcome: "success" | "error";
  operations: SyncOperation[];
};

/**
 * Bug fix (Guest + Sign Out follow-up — profile not restored on re-sign-in)
 * — was a plain `INSERT`, unlike `savedSearchSync.ts`'s own
 * `logSyncOperation` (see that file's doc comment for the general
 * argument). The local Sync Queue keeps every operation, including already-
 * `"success"` ones (nothing dequeues them), so the exact same operation id
 * gets re-pushed on a later `performSync()` — a real, reachable path (e.g.
 * on the very next sign-in). Since `id` is this table's `PRIMARY KEY`, that
 * re-push's second `INSERT` threw, and the surrounding `try/catch` reported
 * the *entire* operation as a false `"error"` even though the `UPDATE
 * accounts` just above it had already re-succeeded. That false error then
 * permanently blocked `performPull()`'s reconciliation (its own `status !==
 * "success"` check) from ever applying real cloud data back down —
 * confirmed live: a signed-in profile edit never came back on a later
 * sign-in for the same wallet, with the Topbar stuck on "Conflict". `OR
 * IGNORE` makes a replayed log entry a real no-op instead of a false
 * failure, exactly `savedSearchSync.ts`'s existing precedent.
 */
function logSyncOperation(db: DatabaseSync, accountId: string, operation: SyncOperation): void {
  db.prepare(
    "INSERT OR IGNORE INTO sync_operations_log (id, account_id, entity, entity_id, type, applied_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(operation.id, accountId, operation.entity, operation.entityId, operation.type, new Date().toISOString());
}

/**
 * Applies every real `account` operation in order (last one wins for a
 * given field, the same last-write-wins semantics `accountSyncAdapter`'s
 * own `merge()` already documents), reporting one honest outcome per
 * operation — a malformed payload, a deserialize failure, or a genuine
 * username collision with a different real account each fail only their
 * own operation, never the whole batch.
 */
export function pushAccountOperations(db: DatabaseSync, accountId: string, operations: SyncOperation[]): PushAccountOperationsResult {
  const now = new Date().toISOString();

  const results: SyncOperation[] = operations.map((operation) => {
    if (operation.entity !== "account") {
      // Real, honest boundary — see this file's own doc comment. Never
      // silently dropped, never fabricated as a success.
      return { ...operation, status: "error", retryCount: operation.retryCount + 1, updatedAt: now };
    }
    /**
     * Bug fix (Guest + Sign Out follow-up — profile not restored on
     * re-sign-in) — the `UPDATE` below always targets the real,
     * session-derived `accountId` (never trusts an id from the payload,
     * per this file's own doc comment), but never checked that the
     * operation's own `entityId` — set once, client-side, at enqueue time
     * — still names *that same* account. The local Sync Queue keeps every
     * operation until it succeeds and is never scoped/cleared per account
     * (see `lib/account/service.ts`'s `signOut()`), so an operation queued
     * for one account can still be sitting there on a *later* sign-in as a
     * different account (e.g. a different wallet in the same browser, or a
     * fresh account after a data reset) — confirmed directly against a
     * real database: a stale queued edit for a defunct account id got
     * silently applied to a brand-new, unrelated account's name/username
     * on its very first sign-in. Rejecting a mismatched `entityId` here
     * closes that cross-account leak at its source, the same "never trust
     * a client-supplied identity for a write" principle this file already
     * applies to the payload's own `id` field.
     */
    if (operation.entityId !== accountId) {
      return { ...operation, status: "error", retryCount: operation.retryCount + 1, updatedAt: now };
    }
    if (operation.payload === null) {
      return { ...operation, status: "error", retryCount: operation.retryCount + 1, updatedAt: now };
    }

    try {
      const data = accountSyncAdapter.deserialize(operation.payload);
      db.prepare("UPDATE accounts SET name = ?, username = ?, email = ?, avatar = ?, bio = ?, updated_at = ? WHERE id = ?").run(
        data.name,
        data.username,
        data.email,
        data.avatar,
        data.bio,
        now,
        accountId
      );
      logSyncOperation(db, accountId, operation);
      return { ...operation, status: "success", retryCount: operation.retryCount, updatedAt: now };
    } catch {
      // Covers a malformed/undeserializable payload and a real SQLite
      // failure alike (e.g. a genuine username collision with a
      // different real account — the same UNIQUE constraint
      // `lib/backend/sqlite/accounts.ts`'s own username resolution
      // guards against at account creation) — reported the same honest
      // per-operation failure either way, never a crash.
      return { ...operation, status: "error", retryCount: operation.retryCount + 1, updatedAt: now };
    }
  });

  const outcome = results.every((result) => result.status === "success") ? "success" : "error";
  return { outcome, operations: results };
}

export type PullAccountResult = {
  operations: SyncOperation[];
};

/** The real, current cloud account state, wrapped as the one `SyncOperation` a caller applies locally — reuses `accountSyncAdapter.createOperation()`, the one place a real `Account`-shaped `SyncOperation` is ever built, rather than hand-assembling one here. Returns an empty result for an account that genuinely no longer exists, never a fabricated placeholder. */
export function pullAccountState(db: DatabaseSync, accountId: string): PullAccountResult {
  const account = getAccountById(db, accountId);
  if (!account) return { operations: [] };

  const operation = accountSyncAdapter.createOperation("update", accountId, account);
  return { operations: [{ ...operation, status: "success" }] };
}
