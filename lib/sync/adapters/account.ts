/**
 * The Account entity's Sync Adapter — the only place that knows how an
 * `Account` serializes, merges, and validates for the Sync Layer. The
 * Sync Queue and Sync Engine never import `lib/account/` directly; they
 * only ever see the generic `SyncOperation` this adapter's
 * `createOperation()` produces.
 */

import { buildOperation } from "@/lib/sync/queue";
import type { SyncAdapter, SyncOperation, SyncOperationType } from "@/lib/sync/types";
import type { Account } from "@/lib/account/types";

const ADAPTER_VERSION = 1;

function isValidAccount(data: unknown): data is Account {
  if (typeof data !== "object" || data === null) return false;
  const account = data as Record<string, unknown>;
  return (
    typeof account.id === "string" &&
    typeof account.name === "string" &&
    typeof account.username === "string" &&
    (typeof account.email === "string" || account.email === null) &&
    (typeof account.avatar === "string" || account.avatar === null) &&
    typeof account.createdAt === "string" &&
    typeof account.updatedAt === "string" &&
    typeof account.lastActiveAt === "string" &&
    typeof account.isGuest === "boolean"
  );
}

function serializeAccount(data: Account): string {
  return JSON.stringify(data);
}

function deserializeAccount(payload: string): Account {
  const parsed: unknown = JSON.parse(payload);
  if (!isValidAccount(parsed)) {
    throw new Error("accountSyncAdapter.deserialize: payload failed validation");
  }
  return parsed;
}

function createAccountOperation(type: SyncOperationType, entityId: string, data: Account): SyncOperation {
  return buildOperation(type, "account", entityId, serializeAccount(data));
}

/**
 * Last-write-wins by `updatedAt` — the simplest honest merge strategy for
 * a single-owner record with no field-level conflict semantics defined
 * yet. Never called automatically today: there is no remote Account
 * version to merge against without a backend.
 */
function mergeAccount(local: Account, remote: Account): Account {
  return new Date(remote.updatedAt).getTime() >= new Date(local.updatedAt).getTime() ? remote : local;
}

export const accountSyncAdapter: SyncAdapter<Account> = {
  entity: "account",
  version: () => ADAPTER_VERSION,
  validate: isValidAccount,
  serialize: serializeAccount,
  deserialize: deserializeAccount,
  createOperation: createAccountOperation,
  merge: mergeAccount,
};
