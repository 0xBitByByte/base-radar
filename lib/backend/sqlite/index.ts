/**
 * Phase C's real backend — SQLite-backed `Storage` and `Health` services,
 * both genuinely working against `lib/backend/sqlite/db.ts`'s real
 * database. `account` is deliberately **not** implemented (this backend's
 * zero-parameter `AccountService` contract structurally can't express
 * "which account" — see `lib/backend/sqlite/accounts.ts`'s own Contract
 * Readiness note; `/api/auth/*` calls that file's real, explicitly-scoped
 * functions directly instead).
 *
 * `sync` (PR-093.06, Ongoing Cloud Sync; extended by PR-094.01 for the
 * `search` entity) is now real for `account` and `search` — `push`/`pull`
 * dispatch each operation to the right entity-specific module
 * (`accountSync.ts`/`searchSync.ts`) by its own real `entity` field, then
 * merge the results back in the original request order. Called by
 * `/api/sync/push`/`/api/sync/pull` with the real, session-derived
 * `accountId` those routes already resolved. `getStatus`/`getConflicts`
 * stay honest throws: nothing in this app tracks queue/conflict state
 * server-side (that's the client-side Sync Queue's own job — see
 * `lib/sync/service.ts`), so implementing them here would mean inventing a
 * meaning this interface was never given, not completing one that already
 * exists.
 *
 * Registered in `lib/backend/registry.ts` but **not** activated as the
 * default backend — `localBackend` stays active, exactly as before.
 * Nothing in the running app calls `activeBackend()` yet; the real
 * Account/Sync activity this phase adds happens through `/api/auth/*` and
 * `/api/sync/*` directly, the same "call the real, scoped functions
 * directly" precedent Phase D already established.
 */

import { getDb } from "@/lib/backend/sqlite/db";
import { pullAccountState, pushAccountOperations } from "@/lib/backend/sqlite/accountSync";
import { pullSearchState, pushSearchOperations } from "@/lib/backend/sqlite/searchSync";
import { pullSavedSearchState, pushSavedSearchOperations } from "@/lib/backend/sqlite/savedSearchSync";
import { createHealthService } from "@/lib/backend/sqlite/health";
import { createStorageService } from "@/lib/backend/sqlite/storage";
import type { AccountService } from "@/lib/backend/services/account";
import type { SyncPushResult, SyncService } from "@/lib/backend/services/sync";
import type { Backend } from "@/lib/backend/types";
import type { SyncOperation } from "@/lib/sync/types";

const ACCOUNT_SERVICE_NOT_YET_IMPLEMENTED =
  "sqliteBackend: this zero-parameter AccountService contract can't express which account — /api/auth/* calls lib/backend/sqlite/accounts.ts's real, explicitly-scoped functions directly instead. See that file's own Contract Readiness note.";

const SYNC_STATUS_NOT_YET_IMPLEMENTED =
  "sqliteBackend: getStatus/getConflicts have no server-side meaning yet — queue and conflict state are tracked entirely client-side (lib/sync/service.ts). Only push/pull (the account entity) are real here.";

const accountService: AccountService = {
  async getAccount() {
    throw new Error(ACCOUNT_SERVICE_NOT_YET_IMPLEMENTED);
  },
  async updateAccount() {
    throw new Error(ACCOUNT_SERVICE_NOT_YET_IMPLEMENTED);
  },
  async deleteAccount() {
    throw new Error(ACCOUNT_SERVICE_NOT_YET_IMPLEMENTED);
  },
};

/**
 * Splits `operations` by their own real `entity` field, delegates each
 * group to its real, entity-specific module, then reconstructs the result
 * array in the original request order (never the grouped order) by
 * looking each processed operation back up by its real `id` — the caller
 * gets one result per operation it sent, positioned exactly where it sent
 * it, regardless of how many different entities were mixed into one push.
 */
function dispatchPush(db: ReturnType<typeof getDb>, accountId: string, operations: SyncOperation[]): SyncPushResult {
  const accountOps = operations.filter((op) => op.entity === "account");
  const searchOps = operations.filter((op) => op.entity === "search");
  const savedSearchOps = operations.filter((op) => op.entity === "savedSearch");
  const otherOps = operations.filter(
    (op) => op.entity !== "account" && op.entity !== "search" && op.entity !== "savedSearch"
  );
  const now = new Date().toISOString();

  const accountResult = accountOps.length > 0 ? pushAccountOperations(db, accountId, accountOps) : { outcome: "success" as const, operations: [] };
  const searchResult = searchOps.length > 0 ? pushSearchOperations(db, accountId, searchOps) : { outcome: "success" as const, operations: [] };
  const savedSearchResult =
    savedSearchOps.length > 0 ? pushSavedSearchOperations(db, accountId, savedSearchOps) : { outcome: "success" as const, operations: [] };
  // Any entity this Backend Service Layer doesn't yet know how to sync
  // (e.g. `watchlist`/`preferences` — real adapters exist, but nothing
  // wires them into a server module yet) fails honestly, per-operation,
  // rather than being silently dropped or fabricated as a success.
  const otherResults = otherOps.map((op) => ({ ...op, status: "error" as const, retryCount: op.retryCount + 1, updatedAt: now }));

  const byId = new Map<string, SyncOperation>();
  for (const op of [...accountResult.operations, ...searchResult.operations, ...savedSearchResult.operations, ...otherResults]) byId.set(op.id, op);
  const results = operations.map((op) => byId.get(op.id) ?? { ...op, status: "error" as const, retryCount: op.retryCount + 1, updatedAt: now });

  const outcome = results.every((result) => result.status === "success") ? "success" : "error";
  return { outcome, operations: results };
}

const syncService: SyncService = {
  async push(accountId, operations) {
    return dispatchPush(getDb(), accountId, operations);
  },
  async pull(accountId) {
    const db = getDb();
    const [account, search, savedSearch] = [
      pullAccountState(db, accountId),
      pullSearchState(db, accountId),
      pullSavedSearchState(db, accountId),
    ];
    return { operations: [...account.operations, ...search.operations, ...savedSearch.operations] };
  },
  async getStatus() {
    throw new Error(SYNC_STATUS_NOT_YET_IMPLEMENTED);
  },
  async getConflicts() {
    throw new Error(SYNC_STATUS_NOT_YET_IMPLEMENTED);
  },
};

export const sqliteBackend: Backend = {
  id: "sqlite",
  label: "SQLite",
  services: {
    account: accountService,
    sync: syncService,
    storage: createStorageService(getDb),
    health: createHealthService(getDb),
  },
};
