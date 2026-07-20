/**
 * Queue semantics on top of `lib/sync/queue.ts`'s raw storage — enqueue,
 * dequeue, peek, clear, retry. This file only ever handles a generic,
 * already-built `SyncOperation` — it has no knowledge of Account,
 * Watchlist, or Preferences shapes; that belongs entirely to
 * `lib/sync/adapters/*`, whose `createOperation()` is the only place a
 * `SyncOperation` gets constructed. Foundation only: nothing in this
 * codebase enqueues a real operation yet (there is no Cloud Sync to
 * eventually drain this queue into), but every function here is real and
 * working, not a stubbed placeholder.
 */

import { readQueue, writeQueue } from "@/lib/sync/queue";
import type { SyncOperation } from "@/lib/sync/types";

export function list(): SyncOperation[] {
  return readQueue();
}

/** Appends an already-built operation to the queue — a genuine local queue any future feature could push into while offline. */
export function enqueue(operation: SyncOperation): SyncOperation {
  writeQueue([...readQueue(), operation]);
  return operation;
}

/** Removes a single operation — the shape a future sync engine would call once an operation is confirmed applied server-side. */
export function dequeue(id: string): SyncOperation[] {
  const next = readQueue().filter((operation) => operation.id !== id);
  writeQueue(next);
  return next;
}

/** Returns the oldest queued operation without removing it — FIFO, `null` when empty. */
export function peek(): SyncOperation | null {
  const queue = readQueue();
  return queue.length > 0 ? queue[0] : null;
}

/** Clears every pending operation — e.g. a future "discard offline changes" action. */
export function clear(): SyncOperation[] {
  writeQueue([]);
  return [];
}

/** Marks a single operation for retry — increments its retry count, resets status to "pending". Real and working, with no automatic caller yet since there is no failed sync attempt to retry from. */
export function retry(id: string): SyncOperation[] {
  const now = new Date().toISOString();
  const next = readQueue().map((operation) =>
    operation.id === id
      ? { ...operation, retryCount: operation.retryCount + 1, updatedAt: now, status: "pending" as const }
      : operation
  );
  writeQueue(next);
  return next;
}

/** Bulk-replaces the queue — used by the sync engine after an attempt, when every operation's status/retryCount changes together in one write. */
export function replaceAll(next: SyncOperation[]): SyncOperation[] {
  writeQueue(next);
  return next;
}
