/**
 * The Sync capability a backend must provide. Interface only — no
 * implementation lives here. Shaped after `SyncConnector`
 * (`lib/sync/connectors/base.ts`) so a future real backend can satisfy
 * both with the same underlying logic, but kept as a separate contract
 * since the Backend Service Layer sits below the Connector Layer, not
 * beside it.
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
  push(operations: SyncOperation[]): Promise<SyncPushResult>;
  pull(): Promise<SyncPullResult>;
  getStatus(): Promise<SyncStatus>;
  getConflicts(): Promise<ConflictRecord[]>;
};
