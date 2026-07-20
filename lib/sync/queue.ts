/**
 * The Sync Layer's raw operation storage — the only file touching
 * localStorage for the pending-operations queue. `lib/sync/operations.ts`
 * builds queue semantics (enqueue/dequeue/peek/clear/retry) on top of the
 * read/write functions here.
 */

import { CURRENT_QUEUE_VERSION, migrateQueueRecord } from "@/lib/sync/migration";
import type { SyncEntity, SyncOperation, SyncOperationType } from "@/lib/sync/types";

/** Exported so `lib/sync/diagnostics.ts` can read this key's raw value for storage-health reporting without duplicating the string literal. */
export const QUEUE_STORAGE_KEY = "base-radar:sync-queue";
const STORAGE_KEY = QUEUE_STORAGE_KEY;
const STORAGE_VERSION = CURRENT_QUEUE_VERSION;

type PersistedQueue = {
  version: number;
  operations: SyncOperation[];
};

const EMPTY_QUEUE: SyncOperation[] = [];

function isValidOperation(value: unknown): value is SyncOperation {
  if (typeof value !== "object" || value === null) return false;
  const op = value as Record<string, unknown>;
  return (
    typeof op.id === "string" &&
    (op.type === "create" || op.type === "update" || op.type === "delete") &&
    (op.entity === "watchlist" || op.entity === "preferences" || op.entity === "account") &&
    typeof op.entityId === "string" &&
    (typeof op.payload === "string" || op.payload === null) &&
    typeof op.createdAt === "string" &&
    typeof op.updatedAt === "string" &&
    (op.status === "pending" || op.status === "syncing" || op.status === "error" || op.status === "success") &&
    typeof op.retryCount === "number"
  );
}

function sanitizeQueue(value: unknown): SyncOperation[] {
  if (typeof value !== "object" || value === null) return EMPTY_QUEUE;
  const persisted = value as Partial<PersistedQueue>;
  if (!Array.isArray(persisted.operations)) return EMPTY_QUEUE;
  return persisted.operations.filter(isValidOperation);
}

/** SSR-safe; falls back to an empty queue on any parse/validation failure — never throws. An older (Part 1) schema's entries simply fail validation and are dropped, the same graceful-recovery approach every other layer uses. */
export function readQueue(): SyncOperation[] {
  if (typeof window === "undefined") return EMPTY_QUEUE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_QUEUE;
    const parsed = JSON.parse(raw) as Partial<PersistedQueue> | null;
    if (typeof parsed !== "object" || parsed === null) return EMPTY_QUEUE;
    const migrated = migrateQueueRecord(parsed.version, parsed as unknown as Record<string, unknown>);
    return sanitizeQueue(migrated.value);
  } catch {
    return EMPTY_QUEUE;
  }
}

/** Best-effort — a full localStorage or private-browsing mode should never crash the app. */
export function writeQueue(operations: SyncOperation[]): void {
  if (typeof window === "undefined") return;
  try {
    const payload: PersistedQueue = { version: STORAGE_VERSION, operations };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // best-effort — see comment above
  }
}

function generateOperationId(): string {
  return `sync:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function buildOperation(
  type: SyncOperationType,
  entity: SyncEntity,
  entityId: string,
  payload: string | null = null
): SyncOperation {
  const now = new Date().toISOString();
  return {
    id: generateOperationId(),
    type,
    entity,
    entityId,
    payload,
    createdAt: now,
    updatedAt: now,
    status: "pending",
    retryCount: 0,
  };
}
