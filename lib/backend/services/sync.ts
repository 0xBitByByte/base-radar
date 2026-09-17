/**
 * The Sync capability a backend must provide. Interface only — no
 * implementation lives here. Shaped after `SyncConnector`
 * (`lib/sync/connectors/base.ts`) so a future real backend can satisfy
 * both with the same underlying logic, but kept as a separate contract
 * since the Backend Service Layer sits below the Connector Layer, not
 * beside it.
 *
 * PR-093.06 (Ongoing Cloud Sync) — every method now takes a real
 * `accountId` as its first parameter. The original zero-argument shape
 * (written before Phase D/real authentication existed) had no way to
 * express "which account" — a real, multi-account backend structurally
 * cannot operate without it, the same Contract Readiness gap Phase D's own
 * `lib/backend/sqlite/accounts.ts` already recorded for `AccountService`.
 * `accountId` must always come from a caller's own already-validated
 * session (`resolveRequestSession`), never a client-supplied value trusted
 * as-is — every real implementation of this interface must treat it the
 * same way `/api/auth/verify` treats a wallet address: derived, never
 * claimed.
 */

import type { ConflictRecord, SyncOperation, SyncStatus } from "@/lib/sync/types";

export type SyncPushResult = {
  outcome: "success" | "error";
  operations: SyncOperation[];
};

export type SyncPullResult = {
  operations: SyncOperation[];
};

export type SyncService = {
  push(accountId: string, operations: SyncOperation[]): Promise<SyncPushResult>;
  pull(accountId: string): Promise<SyncPullResult>;
  getStatus(accountId: string): Promise<SyncStatus>;
  getConflicts(accountId: string): Promise<ConflictRecord[]>;
};
