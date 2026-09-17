import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMockConnector } from "@/lib/sync/connectors/mock";
import { buildOperation, QUEUE_STORAGE_KEY } from "@/lib/sync/queue";
import { CONFLICTS_STORAGE_KEY } from "@/lib/sync/conflicts";
import { STATUS_STORAGE_KEY } from "@/lib/sync/status";

function clearSyncStorage() {
  window.localStorage.removeItem(QUEUE_STORAGE_KEY);
  window.localStorage.removeItem(CONFLICTS_STORAGE_KEY);
  window.localStorage.removeItem(STATUS_STORAGE_KEY);
}

function setOnline(online: boolean) {
  Object.defineProperty(window.navigator, "onLine", { value: online, configurable: true });
}

async function freshServiceModule() {
  vi.resetModules();
  return import("@/lib/sync/service");
}

describe("Sync Service", () => {
  const originalOnLine = window.navigator.onLine;

  beforeEach(() => {
    clearSyncStorage();
    setOnline(true);
  });
  afterEach(() => {
    clearSyncStorage();
    setOnline(originalOnLine);
  });

  it("starts idle with an honest, empty snapshot", async () => {
    const { getSyncStatus, getPendingOperations, getConflicts } = await freshServiceModule();
    expect(getSyncStatus()).toEqual({
      state: "idle",
      pendingCount: 0,
      retryCount: 0,
      conflictCount: 0,
      lastSyncAt: null,
      isOffline: false,
    });
    expect(getPendingOperations()).toEqual([]);
    expect(getConflicts()).toEqual([]);
  });

  it("reflects real offline state from navigator.onLine at load time", async () => {
    setOnline(false);
    const { getSyncStatus } = await freshServiceModule();
    expect(getSyncStatus().state).toBe("offline");
    expect(getSyncStatus().isOffline).toBe(true);
  });

  it("enqueueOperation adds a real operation and updates the snapshot to pending", async () => {
    const { enqueueOperation, getSyncStatus, getPendingOperations } = await freshServiceModule();
    const operation = buildOperation("create", "watchlist", "wl-1");
    enqueueOperation(operation);
    expect(getPendingOperations()).toEqual([operation]);
    expect(getSyncStatus().state).toBe("pending");
    expect(getSyncStatus().pendingCount).toBe(1);
  });

  it("dequeueOperation removes a specific operation", async () => {
    const { enqueueOperation, dequeueOperation, getPendingOperations } = await freshServiceModule();
    const operation = buildOperation("create", "watchlist", "wl-1");
    enqueueOperation(operation);
    dequeueOperation(operation.id);
    expect(getPendingOperations()).toEqual([]);
  });

  it("clearQueue empties every pending operation", async () => {
    const { enqueueOperation, clearQueue, getPendingOperations, getSyncStatus } = await freshServiceModule();
    enqueueOperation(buildOperation("create", "watchlist", "wl-1"));
    clearQueue();
    expect(getPendingOperations()).toEqual([]);
    expect(getSyncStatus().state).toBe("idle");
  });

  it("performSync against an empty queue honestly succeeds and records a real lastSyncAt", async () => {
    const { performSync, getSyncStatus } = await freshServiceModule();
    await performSync();
    const status = getSyncStatus();
    expect(status.state).toBe("success");
    expect(status.lastSyncAt).not.toBeNull();
    expect(Number.isNaN(Date.parse(status.lastSyncAt!))).toBe(false);
  });

  it("performSync against a real non-empty queue honestly ends in error — there is no backend to deliver to", async () => {
    const { enqueueOperation, performSync, getSyncStatus, getPendingOperations } = await freshServiceModule();
    enqueueOperation(buildOperation("create", "watchlist", "wl-1"));
    await performSync();
    expect(getSyncStatus().state).toBe("error");
    expect(getPendingOperations()[0].status).toBe("error");
    expect(getPendingOperations()[0].retryCount).toBe(1);
  });

  it("performSync never fabricates lastSyncAt on a failed attempt", async () => {
    const { enqueueOperation, performSync, getSyncStatus } = await freshServiceModule();
    enqueueOperation(buildOperation("create", "watchlist", "wl-1"));
    await performSync();
    expect(getSyncStatus().lastSyncAt).toBeNull();
  });

  it("performSync is a real no-op while offline — never attempts a sync it can't honestly complete", async () => {
    const { enqueueOperation, performSync, getSyncStatus } = await freshServiceModule();
    enqueueOperation(buildOperation("create", "watchlist", "wl-1"));
    setOnline(false);
    // Re-derive offline state the same way the "online"/"offline" window listeners would.
    window.dispatchEvent(new Event("offline"));
    await performSync();
    expect(getSyncStatus().state).toBe("offline");
  });

  it("retrySync is a real alias for performSync", async () => {
    const { enqueueOperation, retrySync, getSyncStatus } = await freshServiceModule();
    enqueueOperation(buildOperation("create", "watchlist", "wl-1"));
    await retrySync();
    expect(getSyncStatus().state).toBe("error");
  });

  it("recordConflict adds a real, unresolved conflict and shifts state to conflict", async () => {
    const { recordConflict, getSyncStatus, getConflicts } = await freshServiceModule();
    recordConflict("account", "acct-1", { name: "Local" }, { name: "Remote" });
    expect(getSyncStatus().state).toBe("conflict");
    expect(getSyncStatus().conflictCount).toBe(1);
    expect(getConflicts()).toHaveLength(1);
  });

  it("resolveConflict flips the flag and clears the conflict state once nothing is unresolved", async () => {
    const { recordConflict, resolveConflict, getSyncStatus } = await freshServiceModule();
    recordConflict("account", "acct-1", { a: 1 }, { a: 2 });
    resolveConflict("account", "acct-1");
    expect(getSyncStatus().conflictCount).toBe(0);
    expect(getSyncStatus().state).toBe("idle");
  });

  it("exportQueue produces real, versioned JSON containing the exact current queue", async () => {
    const { enqueueOperation, exportQueue } = await freshServiceModule();
    const operation = buildOperation("create", "watchlist", "wl-1");
    enqueueOperation(operation);
    const parsed = JSON.parse(exportQueue());
    expect(parsed.version).toBe(1);
    expect(Number.isNaN(Date.parse(parsed.exportedAt))).toBe(false);
    expect(parsed.operations).toEqual([operation]);
  });

  it("subscribe notifies listeners on every real mutation, and unsubscribe stops it", async () => {
    const { enqueueOperation, subscribe } = await freshServiceModule();
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);

    enqueueOperation(buildOperation("create", "watchlist", "wl-1"));
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    enqueueOperation(buildOperation("create", "watchlist", "wl-2"));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  /**
   * Bug fix (Guest + Sign Out follow-up — profile not restored on
   * re-sign-in) — a `"success"` operation used to stay in the queue and get
   * resent on every later `performSync()`, which (confirmed live) caused a
   * real backend to report a false per-operation error on replay (a
   * `sync_operations_log.id` `PRIMARY KEY` collision — see
   * `accountSync.ts`'s matching fix), permanently blocking future pulls.
   * The queue only holds work still worth sending.
   */
  it("performSync drops a successfully-synced operation from the queue — it is never resent", async () => {
    const { enqueueOperation, performSync, getPendingOperations, getSyncStatus } = await freshServiceModule();
    const { register, setActive } = await import("@/lib/sync/connectors/registry");
    const { createMockConnector } = await import("@/lib/sync/connectors/mock");
    const mock = createMockConnector({ scenario: "success" });
    register(mock);
    setActive("mock");

    enqueueOperation(buildOperation("update", "account", "acct-1"));
    await performSync();

    expect(getPendingOperations()).toEqual([]);
    expect(getSyncStatus().pendingCount).toBe(0);
  });

  it("performSync keeps a real still-failing operation in the queue — only success is ever dropped", async () => {
    const { enqueueOperation, performSync, getPendingOperations } = await freshServiceModule();
    enqueueOperation(buildOperation("update", "watchlist", "wl-1"));

    await performSync(); // LocalConnector — no real backend, honestly ends in error

    expect(getPendingOperations()).toHaveLength(1);
    expect(getPendingOperations()[0].status).toBe("error");
  });

  it("retryCount in the snapshot sums every queued operation's own retryCount", async () => {
    const { enqueueOperation, performSync, getSyncStatus } = await freshServiceModule();
    enqueueOperation(buildOperation("create", "watchlist", "wl-1"));
    enqueueOperation(buildOperation("create", "watchlist", "wl-2"));
    await performSync();
    expect(getSyncStatus().retryCount).toBe(2);
  });

  describe("performPull (PR-093.06 — Ongoing Cloud Sync)", () => {
    it("with no local pending change, a real remote operation is reported safe to apply — never applied to storage by this function itself", async () => {
      const { performPull, getSyncStatus } = await freshServiceModule();
      // Dynamically imported *after* resetModules so it's the exact same
      // registry instance `performPull` (via `engine.ts`) resolves against
      // — a statically-imported registry would be a stale, pre-reset copy.
      const { register, setActive } = await import("@/lib/sync/connectors/registry");
      const mock = createMockConnector({ scenario: "success" });
      const remoteOperation = buildOperation("update", "account", "acct-1", JSON.stringify({ name: "Cloud Name" }));
      mock.setPullOperations([remoteOperation]);
      register(mock);
      setActive("mock");

      const result = await performPull();
      expect(result.applied).toEqual([remoteOperation]);
      expect(result.conflicted).toEqual([]);
      expect(getSyncStatus().lastSyncAt).not.toBeNull();
    });

    it("a real, not-yet-synced local change for the same entity is never silently overwritten — recorded as a real conflict instead", async () => {
      const { performPull, enqueueOperation, getSyncStatus, getConflicts } = await freshServiceModule();
      const { register, setActive } = await import("@/lib/sync/connectors/registry");
      const localOperation = buildOperation("update", "account", "acct-1", JSON.stringify({ name: "Local Name" }));
      enqueueOperation(localOperation);

      const mock = createMockConnector({ scenario: "success" });
      const remoteOperation = buildOperation("update", "account", "acct-1", JSON.stringify({ name: "Cloud Name" }));
      mock.setPullOperations([remoteOperation]);
      register(mock);
      setActive("mock");

      const result = await performPull();
      expect(result.applied).toEqual([]);
      expect(result.conflicted).toEqual([remoteOperation]);
      expect(getSyncStatus().state).toBe("conflict");

      const conflicts = getConflicts();
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].localVersion).toBe(localOperation.payload);
      expect(conflicts[0].remoteVersion).toBe(remoteOperation.payload);
    });

    it("a local change for a DIFFERENT entity never blocks an unrelated remote pull", async () => {
      const { performPull, enqueueOperation } = await freshServiceModule();
      const { register, setActive } = await import("@/lib/sync/connectors/registry");
      enqueueOperation(buildOperation("update", "watchlist", "wl-1"));

      const mock = createMockConnector({ scenario: "success" });
      const remoteOperation = buildOperation("update", "account", "acct-1", JSON.stringify({ name: "Cloud Name" }));
      mock.setPullOperations([remoteOperation]);
      register(mock);
      setActive("mock");

      const result = await performPull();
      expect(result.applied).toEqual([remoteOperation]);
      expect(result.conflicted).toEqual([]);
    });

    it("is a real no-op while offline — never attempts a pull it can't honestly complete", async () => {
      const { performPull } = await freshServiceModule();
      setOnline(false);
      window.dispatchEvent(new Event("offline"));

      const result = await performPull();
      expect(result).toEqual({ applied: [], conflicted: [] });
    });

    it("a real empty remote result reconciles to nothing applied and nothing conflicted", async () => {
      const { performPull } = await freshServiceModule();
      const { register, setActive } = await import("@/lib/sync/connectors/registry");
      const mock = createMockConnector({ scenario: "success" });
      register(mock);
      setActive("mock");

      const result = await performPull();
      expect(result).toEqual({ applied: [], conflicted: [] });
    });
  });
});
