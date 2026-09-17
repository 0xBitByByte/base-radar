import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ACCOUNT_STORAGE_KEY } from "@/lib/account/storage";

const QUEUE_KEY = "base-radar:sync-queue";
const CONFLICTS_KEY = "base-radar:sync-conflicts";
const STATUS_KEY = "base-radar:sync-status";
const BACKEND_TEST_KEY = "backend-local-test-key";

function clearAllStorage() {
  window.localStorage.removeItem(QUEUE_KEY);
  window.localStorage.removeItem(CONFLICTS_KEY);
  window.localStorage.removeItem(STATUS_KEY);
  window.localStorage.removeItem(ACCOUNT_STORAGE_KEY);
  window.localStorage.removeItem(BACKEND_TEST_KEY);
}

/** `localBackend` forwards to `lib/account/service.ts` and `lib/sync/*` — both module singletons — so a real, isolated test needs a fresh epoch, the same technique used throughout `tests/lib/sync/`. */
async function freshBackend() {
  vi.resetModules();
  const { localBackend } = await import("@/lib/backend/local");
  return { localBackend };
}

describe("localBackend — real forwarding to existing local implementations", () => {
  beforeEach(clearAllStorage);
  afterEach(clearAllStorage);

  describe("services.account", () => {
    it("getAccount returns the real current guest account", async () => {
      const { localBackend } = await freshBackend();
      const account = await localBackend.services.account.getAccount();
      expect(account.isGuest).toBe(true);
      expect(account.name).toBe("Guest User");
    });

    it("updateAccount genuinely applies the patch and returns the real updated account", async () => {
      const { localBackend } = await freshBackend();
      const updated = await localBackend.services.account.updateAccount({ name: "Rin", username: "rin_dev" });
      expect(updated.name).toBe("Rin");
      expect(updated.username).toBe("rin_dev");
      expect(await localBackend.services.account.getAccount()).toEqual(updated);
    });

    it("deleteAccount genuinely resets to a fresh guest account", async () => {
      const { localBackend } = await freshBackend();
      await localBackend.services.account.updateAccount({ name: "Rin", username: "rin_dev" });
      await localBackend.services.account.deleteAccount();
      const account = await localBackend.services.account.getAccount();
      expect(account.isGuest).toBe(true);
      expect(account.name).toBe("Guest User");
    });
  });

  describe("services.sync", () => {
    it("push on an empty batch honestly succeeds, delegating to the real LocalConnector", async () => {
      const { localBackend } = await freshBackend();
      const result = await localBackend.services.sync.push("acct-local", []);
      expect(result).toEqual({ outcome: "success", operations: [] });
    });

    it("push on a real non-empty batch honestly errors — there is no backend to deliver to", async () => {
      const { localBackend } = await freshBackend();
      const { buildOperation } = await import("@/lib/sync/queue");
      const operation = buildOperation("create", "watchlist", "wl-1");

      const result = await localBackend.services.sync.push("acct-local", [operation]);
      expect(result.outcome).toBe("error");
      expect(result.operations[0].retryCount).toBe(1);
    });

    it("pull always returns a real empty result — no remote counterpart exists", async () => {
      const { localBackend } = await freshBackend();
      expect(await localBackend.services.sync.pull("acct-local")).toEqual({ operations: [] });
    });

    it("getStatus forwards the real current sync status snapshot", async () => {
      const { localBackend } = await freshBackend();
      const syncService = await import("@/lib/sync/service");
      const { buildOperation } = await import("@/lib/sync/queue");
      syncService.enqueueOperation(buildOperation("create", "watchlist", "wl-1"));

      const status = await localBackend.services.sync.getStatus("acct-local");
      expect(status.pendingCount).toBe(1);
      expect(status.state).toBe("pending");
    });

    it("getConflicts forwards the real current conflict list", async () => {
      const { localBackend } = await freshBackend();
      const syncService = await import("@/lib/sync/service");
      syncService.recordConflict("account", "acct-1", { a: 1 }, { a: 2 });

      const conflicts = await localBackend.services.sync.getConflicts("acct-local");
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].entityId).toBe("acct-1");
    });
  });

  describe("services.storage", () => {
    it("write then read round-trips a real value", async () => {
      const { localBackend } = await freshBackend();
      await localBackend.services.storage.write(BACKEND_TEST_KEY, "hello");
      expect(await localBackend.services.storage.read(BACKEND_TEST_KEY)).toBe("hello");
    });

    it("read on a key that was never written returns a real null, never a fabricated default", async () => {
      const { localBackend } = await freshBackend();
      expect(await localBackend.services.storage.read(BACKEND_TEST_KEY)).toBeNull();
    });

    it("remove genuinely deletes a real stored value", async () => {
      const { localBackend } = await freshBackend();
      await localBackend.services.storage.write(BACKEND_TEST_KEY, "hello");
      await localBackend.services.storage.remove(BACKEND_TEST_KEY);
      expect(await localBackend.services.storage.read(BACKEND_TEST_KEY)).toBeNull();
    });
  });

  describe("services.health", () => {
    it("reports healthy true when the real LocalConnector is connected and online", async () => {
      const originalOnLine = window.navigator.onLine;
      Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });

      const { localBackend } = await freshBackend();
      expect(await localBackend.services.health.check()).toEqual({ healthy: true });

      Object.defineProperty(window.navigator, "onLine", { value: originalOnLine, configurable: true });
    });

    it("reports healthy false when genuinely offline — never a fabricated healthy status", async () => {
      const originalOnLine = window.navigator.onLine;
      Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });

      const { localBackend } = await freshBackend();
      expect(await localBackend.services.health.check()).toEqual({ healthy: false });

      Object.defineProperty(window.navigator, "onLine", { value: originalOnLine, configurable: true });
    });
  });

  it("identifies itself honestly as the local backend", async () => {
    const { localBackend } = await freshBackend();
    expect(localBackend.id).toBe("local");
    expect(localBackend.label).toBe("Local Storage");
  });
});
