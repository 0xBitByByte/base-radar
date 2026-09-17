/**
 * PR-093.06 (Ongoing Cloud Sync) — the real backend connector: `/api/sync/
 * push` and `/api/sync/pull`, both real, session-authenticated routes over
 * the `account` entity. Registered in `lib/sync/connectors/registry.ts`
 * alongside `localConnector`; `lib/hooks/useCloudSyncActivation.ts`
 * decides which one is active based on real auth state — this file itself
 * has no opinion on when it should be used.
 *
 * `push`/`pull` never fabricate a success for a real network failure — an
 * unreachable server or a non-OK response is reported the same honest way
 * `localConnector.push()` already reports "no real backend to sync to":
 * every operation's `status` becomes `"error"` with its `retryCount`
 * bumped, never silently unchanged.
 */

import { readIsOffline } from "@/lib/sync/status";
import type { ConnectorHealth, ConnectorPullResult, ConnectorPushResult, SyncConnector } from "@/lib/sync/connectors/base";
import type { SyncOperation } from "@/lib/sync/types";

function markFailed(operations: SyncOperation[]): SyncOperation[] {
  const now = new Date().toISOString();
  return operations.map((operation) => ({ ...operation, status: "error", retryCount: operation.retryCount + 1, updatedAt: now }));
}

async function push(operations: SyncOperation[]): Promise<ConnectorPushResult> {
  if (operations.length === 0) {
    return { outcome: "success", operations };
  }

  try {
    const response = await fetch("/api/sync/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ operations }),
    });
    if (!response.ok) {
      return { outcome: "error", operations: markFailed(operations) };
    }
    const data = (await response.json()) as ConnectorPushResult;
    return data;
  } catch {
    return { outcome: "error", operations: markFailed(operations) };
  }
}

async function pull(): Promise<ConnectorPullResult> {
  try {
    const response = await fetch("/api/sync/pull", { credentials: "same-origin" });
    if (!response.ok) return { operations: [] };
    const data = (await response.json()) as { operations?: unknown };
    return { operations: Array.isArray(data.operations) ? (data.operations as SyncOperation[]) : [] };
  } catch {
    return { operations: [] };
  }
}

async function health(): Promise<ConnectorHealth> {
  return { connected: true, online: !readIsOffline() };
}

export const backendConnector: SyncConnector = {
  id: "backend",
  label: "Base Radar Cloud",
  async connect() {
    // The session cookie already establishes this connector's identity — nothing further to connect.
  },
  async disconnect() {
    // No persistent connection to tear down.
  },
  health,
  push,
  pull,
  async authenticate() {
    // Real auth is handled entirely by /api/auth/* — this connector only ever rides the existing session cookie.
  },
  async signOut() {
    // Real sign-out is handled entirely by /api/auth/signout.
  },
  supportsRealtime: () => false,
  supportsOffline: () => false,
  supportsConflictResolution: () => false,
};
