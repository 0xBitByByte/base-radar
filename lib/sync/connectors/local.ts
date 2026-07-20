/**
 * Today's production connector — the default in `registry.ts`. It uses
 * only `navigator.onLine` (via `lib/sync/status.ts`) and never makes a
 * network request; `lib/sync/queue.ts` already persists operations to
 * localStorage before the engine ever calls this connector, so there is
 * nothing else for this connector itself to store.
 *
 * `push()` preserves the exact honest behavior the Sync Engine had before
 * the Connector Layer existed: there is still no real backend for this
 * device's queue to converge with, only its own local storage, so a push
 * can never fabricate a success for work that wasn't actually delivered
 * anywhere else — an empty batch trivially succeeds (nothing to fail at);
 * a non-empty one honestly reports "error" with every retry count bumped.
 */

import { readIsOffline } from "@/lib/sync/status";
import type { ConnectorHealth, ConnectorPullResult, ConnectorPushResult, SyncConnector } from "@/lib/sync/connectors/base";
import type { SyncOperation } from "@/lib/sync/types";

async function push(operations: SyncOperation[]): Promise<ConnectorPushResult> {
  if (operations.length === 0) {
    return { outcome: "success", operations };
  }

  const now = new Date().toISOString();
  return {
    outcome: "error",
    operations: operations.map((operation) => ({
      ...operation,
      status: "error",
      retryCount: operation.retryCount + 1,
      updatedAt: now,
    })),
  };
}

async function pull(): Promise<ConnectorPullResult> {
  // No remote counterpart exists yet — nothing to pull.
  return { operations: [] };
}

async function health(): Promise<ConnectorHealth> {
  return { connected: true, online: !readIsOffline() };
}

export const localConnector: SyncConnector = {
  id: "local",
  label: "Local Storage",
  async connect() {
    // Always available — nothing to establish.
  },
  async disconnect() {
    // No persistent connection exists.
  },
  health,
  push,
  pull,
  async authenticate() {
    // No authentication concept without a real backend.
  },
  async signOut() {
    // No authenticated session to end.
  },
  supportsRealtime: () => false,
  supportsOffline: () => true,
  supportsConflictResolution: () => false,
};
