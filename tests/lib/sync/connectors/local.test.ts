import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { localConnector } from "@/lib/sync/connectors/local";
import { buildOperation } from "@/lib/sync/queue";

describe("LocalConnector", () => {
  const originalOnLine = window.navigator.onLine;
  beforeEach(() => Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true }));
  afterEach(() => Object.defineProperty(window.navigator, "onLine", { value: originalOnLine, configurable: true }));

  it("identifies itself honestly", () => {
    expect(localConnector.id).toBe("local");
    expect(localConnector.label).toBe("Local Storage");
  });

  it("push on an empty batch trivially, honestly succeeds — nothing to fail at", async () => {
    const result = await localConnector.push([]);
    expect(result).toEqual({ outcome: "success", operations: [] });
  });

  it("push on a real non-empty batch honestly reports error — there is no backend to deliver to", async () => {
    const operation = buildOperation("create", "watchlist", "wl-1");
    const result = await localConnector.push([operation]);
    expect(result.outcome).toBe("error");
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0].status).toBe("error");
    expect(result.operations[0].retryCount).toBe(operation.retryCount + 1);
  });

  it("push never fabricates success for real work — retryCount always increments on every failed operation", async () => {
    const a = buildOperation("create", "watchlist", "wl-1");
    const b = buildOperation("update", "account", "acct-1", null);
    const result = await localConnector.push([a, b]);
    expect(result.operations.map((op) => op.retryCount)).toEqual([1, 1]);
  });

  it("pull always returns real empty results — no remote counterpart exists", async () => {
    expect(await localConnector.pull()).toEqual({ operations: [] });
  });

  it("health reports connected true and online reflects real navigator.onLine", async () => {
    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });
    expect(await localConnector.health()).toEqual({ connected: true, online: true });

    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });
    expect(await localConnector.health()).toEqual({ connected: true, online: false });
  });

  it("connect/disconnect/authenticate/signOut are real, safe no-ops", async () => {
    await expect(localConnector.connect()).resolves.toBeUndefined();
    await expect(localConnector.disconnect()).resolves.toBeUndefined();
    await expect(localConnector.authenticate()).resolves.toBeUndefined();
    await expect(localConnector.signOut()).resolves.toBeUndefined();
  });

  it("honestly reports its real, limited capabilities", () => {
    expect(localConnector.supportsRealtime()).toBe(false);
    expect(localConnector.supportsOffline()).toBe(true);
    expect(localConnector.supportsConflictResolution()).toBe(false);
  });
});
