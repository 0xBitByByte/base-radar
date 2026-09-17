import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ACCOUNT_STORAGE_KEY } from "@/lib/account/storage";
import { CONFLICTS_STORAGE_KEY } from "@/lib/sync/conflicts";
import { QUEUE_STORAGE_KEY } from "@/lib/sync/queue";
import { STATUS_STORAGE_KEY } from "@/lib/sync/status";

function clearAllStorage() {
  window.localStorage.removeItem(QUEUE_STORAGE_KEY);
  window.localStorage.removeItem(CONFLICTS_STORAGE_KEY);
  window.localStorage.removeItem(STATUS_STORAGE_KEY);
  window.localStorage.removeItem(ACCOUNT_STORAGE_KEY);
}

/** All three modules must come from the same fresh module-registry epoch so diagnostics' own `subscribe()` calls bind to the exact sync/account service singletons this test also drives. */
async function freshModules() {
  vi.resetModules();
  const diagnostics = await import("@/lib/sync/diagnostics");
  const syncService = await import("@/lib/sync/service");
  const accountService = await import("@/lib/account/service");
  return { diagnostics, syncService, accountService };
}

describe("Sync Diagnostics", () => {
  beforeEach(clearAllStorage);
  afterEach(clearAllStorage);

  it("computeDiagnostics on an untouched device reports a real, honest zero state", async () => {
    const { diagnostics } = await freshModules();
    const result = diagnostics.computeDiagnostics();
    expect(result.queueSize).toBe(0);
    expect(result.pendingOperationCount).toBe(0);
    expect(result.conflictCount).toBe(0);
    expect(result.lastSyncAt).toBeNull();
    expect(result.storageHealth).toHaveLength(4);
    // Importing `lib/account/service` (needed here just to bind diagnostics'
    // own subscribe()) genuinely stamps a real guest Account at module load
    // — see that file's own "stamp a fresh session's lastActiveAt" comment
    // — so Account honestly exists while Queue/Conflicts/Status don't yet.
    const byKey = Object.fromEntries(result.storageHealth.map((entry) => [entry.key, entry]));
    expect(byKey["Sync Queue"].exists).toBe(false);
    expect(byKey["Sync Conflicts"].exists).toBe(false);
    expect(byKey["Sync Status"].exists).toBe(false);
    expect(byKey["Account"].exists).toBe(true);
    expect(result.storageIntegrity).toBe(true);
    expect(result.migrationIntegrity).toBe(true);
  });

  it("reflects a real enqueued operation and a real recorded conflict", async () => {
    const { diagnostics, syncService } = await freshModules();
    syncService.enqueueOperation({
      id: "sync:1",
      type: "create",
      entity: "watchlist",
      entityId: "wl-1",
      payload: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "pending",
      retryCount: 0,
    });
    syncService.recordConflict("account", "acct-1", { a: 1 }, { a: 2 });

    const result = diagnostics.computeDiagnostics();
    expect(result.queueSize).toBe(1);
    expect(result.pendingOperationCount).toBe(1);
    expect(result.conflictCount).toBe(1);

    const queueEntry = result.storageHealth.find((entry) => entry.key === "Sync Queue")!;
    expect(queueEntry.exists).toBe(true);
    expect(queueEntry.totalRecords).toBe(1);
    expect(queueEntry.validRecords).toBe(1);
    expect(queueEntry.issueCount).toBe(0);
  });

  it("reports real corruption in the raw queue as a genuine integrity issue, not silently", async () => {
    const { diagnostics } = await freshModules();
    window.localStorage.setItem(
      QUEUE_STORAGE_KEY,
      JSON.stringify({ version: 3, operations: [{ id: "sync:bad", type: "explode" }] })
    );

    const result = diagnostics.computeDiagnostics();
    const queueEntry = result.storageHealth.find((entry) => entry.key === "Sync Queue")!;
    expect(queueEntry.issueCount).toBeGreaterThan(0);
    expect(result.storageIntegrity).toBe(false);
  });

  it("getDiagnostics lazily computes once, then returns the same cached reference until a real refresh", async () => {
    const { diagnostics, syncService } = await freshModules();
    const first = diagnostics.getDiagnostics();
    const second = diagnostics.getDiagnostics();
    expect(second).toBe(first);

    syncService.enqueueOperation({
      id: "sync:1",
      type: "create",
      entity: "watchlist",
      entityId: "wl-1",
      payload: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "pending",
      retryCount: 0,
    });
    diagnostics.subscribe(() => {});
    syncService.enqueueOperation({
      id: "sync:2",
      type: "create",
      entity: "watchlist",
      entityId: "wl-2",
      payload: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "pending",
      retryCount: 0,
    });
    expect(diagnostics.getDiagnostics()).not.toBe(first);
  });

  it("subscribe reacts to a real Account mutation, not only Sync mutations", async () => {
    const { diagnostics, accountService } = await freshModules();
    const listener = vi.fn();
    diagnostics.subscribe(listener);

    await accountService.updateAccount({ name: "New Name" });
    expect(listener).toHaveBeenCalled();
  });

  it("unsubscribe stops further refreshes once the last consumer leaves", async () => {
    const { diagnostics, syncService } = await freshModules();
    const listener = vi.fn();
    const unsubscribe = diagnostics.subscribe(listener);
    unsubscribe();

    syncService.enqueueOperation({
      id: "sync:1",
      type: "create",
      entity: "watchlist",
      entityId: "wl-1",
      payload: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "pending",
      retryCount: 0,
    });
    expect(listener).not.toHaveBeenCalled();
  });
});
