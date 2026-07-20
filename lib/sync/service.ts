/**
 * The Sync Layer's public API — framework-agnostic (no React import).
 * Foundation only, per this PR's brief: no backend, no OAuth, no API, no
 * network request anywhere in this file or anything it calls. It owns
 * sync status, the pending/queued operations, the last sync timestamp,
 * retry count, conflict records, and offline state — nothing about
 * accounts, watchlists, personalization, providers, or engines, all of
 * which keep working identically whether this layer exists or not.
 *
 * Every mutator here is real and working (not a stubbed placeholder),
 * even though nothing in the app calls most of them automatically yet —
 * there is no Cloud Sync to eventually drain this queue into. They exist
 * so a future sync engine has a proper home to build on.
 */

import { addConflict, listConflicts, resolveConflict as resolveConflictRecord } from "@/lib/sync/conflicts";
import { runSyncAttempt } from "@/lib/sync/engine";
import * as operations from "@/lib/sync/operations";
import { deriveState, readIsOffline, readPersistedStatus, writePersistedStatus, type SyncPhase } from "@/lib/sync/status";
import type { ConflictRecord, SyncEntity, SyncOperation, SyncStatus } from "@/lib/sync/types";

let queue: SyncOperation[] = operations.list();
let conflicts: ConflictRecord[] = listConflicts();
let persisted = readPersistedStatus();
let isOffline = readIsOffline();
let phase: SyncPhase = "idle";

const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

function unresolvedConflictCount(): number {
  return conflicts.filter((conflict) => !conflict.resolved).length;
}

function buildSnapshot(): SyncStatus {
  const retryCount = queue.reduce((total, operation) => total + operation.retryCount, 0);
  const conflictCount = unresolvedConflictCount();
  return {
    state: deriveState(queue.length, isOffline, conflictCount > 0, phase),
    pendingCount: queue.length,
    retryCount,
    conflictCount,
    lastSyncAt: persisted.lastSyncAt,
    isOffline,
  };
}

let cached: SyncStatus = buildSnapshot();

function refresh(): void {
  cached = buildSnapshot();
  notify();
}

// Real browser online/offline detection — no polling, no retry loop. A
// transition just recomputes the snapshot; nothing here ever attempts a
// sync automatically in response.
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    isOffline = false;
    refresh();
  });
  window.addEventListener("offline", () => {
    isOffline = true;
    refresh();
  });
}

/** The current snapshot — same object reference until the next mutation, so `useSyncExternalStore` never re-renders on an unrelated call. */
export function getSyncStatus(): SyncStatus {
  return cached;
}

/** The current queue — same array reference until the next mutation. */
export function getPendingOperations(): SyncOperation[] {
  return queue;
}

/** The current conflict list (resolved and unresolved) — same array reference until the next mutation. */
export function getConflicts(): ConflictRecord[] {
  return conflicts;
}

/**
 * Adds an already-built operation to the queue — built by an entity's own
 * adapter (`lib/sync/adapters/*`) via `createOperation()`, never by this
 * service constructing one itself. A genuine local queue any future
 * feature could push into while offline.
 */
export function enqueueOperation(operation: SyncOperation): SyncOperation {
  operations.enqueue(operation);
  queue = operations.list();
  phase = "idle";
  refresh();
  return operation;
}

/** Removes a single operation — the shape a future sync engine would call once an operation is confirmed applied server-side. */
export function dequeueOperation(id: string): void {
  queue = operations.dequeue(id);
  refresh();
}

/** Clears every pending operation — e.g. a future "discard offline changes" action. */
export function clearQueue(): void {
  queue = operations.clear();
  phase = "idle";
  refresh();
}

/**
 * Attempts to flush the queue by delegating to the Sync Engine, which in
 * turn delegates to whichever connector is currently active (today,
 * always `LocalConnector` — see `lib/sync/connectors/`). There is no real
 * backend behind any registered connector yet, so this can never report a
 * fabricated success for work actually sent anywhere: an empty queue
 * honestly succeeds trivially; a non-empty queue honestly ends in
 * "error", with every operation's retry count bumped, never silently
 * cleared as if it had synced.
 */
export async function performSync(): Promise<void> {
  if (isOffline) return;
  phase = "syncing";
  refresh();

  const result = await runSyncAttempt(queue);
  queue = operations.replaceAll(result.operations);
  phase = result.outcome;

  if (result.outcome === "success") {
    persisted = { ...persisted, lastSyncAt: new Date().toISOString() };
    writePersistedStatus(persisted);
  }

  refresh();
}

/** An alias for `performSync()` — a retry is just another sync attempt. */
export async function retrySync(): Promise<void> {
  return performSync();
}

/** Foundation seam — records a conflict between a local and remote version of an entity. Nothing calls this automatically yet, since there is no remote version to ever compare against without a backend. */
export function recordConflict(entity: SyncEntity, entityId: string, localVersion: unknown, remoteVersion: unknown): ConflictRecord {
  const conflict = addConflict(entity, entityId, localVersion, remoteVersion);
  conflicts = listConflicts();
  refresh();
  return conflict;
}

/** Marks a conflict acknowledged. No conflict-resolution logic exists yet — this only flips `resolved`, it never merges data or picks a winner. */
export function resolveConflict(entity: SyncEntity, entityId: string): void {
  conflicts = resolveConflictRecord(entity, entityId);
  refresh();
}

/** Versioned JSON export of the current queue — mirrors `lib/account/service.ts`'s `exportAccount()` shape; local-only, no network. */
export function exportQueue(): string {
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), operations: queue }, null, 2);
}

/** Registers `listener` to be called after every mutation; returns the unsubscribe function — the exact shape `useSyncExternalStore` expects. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
