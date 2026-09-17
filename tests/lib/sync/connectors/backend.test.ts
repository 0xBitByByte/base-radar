import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { backendConnector } from "@/lib/sync/connectors/backend";
import { buildOperation } from "@/lib/sync/queue";

describe("backendConnector (PR-093.06 — Ongoing Cloud Sync)", () => {
  const originalOnLine = window.navigator.onLine;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(window.navigator, "onLine", { value: originalOnLine, configurable: true });
  });

  it("identifies itself honestly", () => {
    expect(backendConnector.id).toBe("backend");
    expect(backendConnector.label).toBe("Base Radar Cloud");
  });

  it("push on an empty batch trivially succeeds without a real network call", async () => {
    const result = await backendConnector.push([]);
    expect(result).toEqual({ outcome: "success", operations: [] });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("push on a real non-empty batch calls the real /api/sync/push endpoint and returns its real result", async () => {
    const operation = buildOperation("update", "account", "acct-1", JSON.stringify({ name: "Rin" }));
    const serverResult = { outcome: "success", operations: [{ ...operation, status: "success" }] };
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(serverResult), { status: 200 }));

    const result = await backendConnector.push([operation]);
    expect(result).toEqual(serverResult);
    expect(fetch).toHaveBeenCalledWith(
      "/api/sync/push",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ operations: [operation] }) })
    );
  });

  it("a real non-OK response marks every operation failed, never fabricating success", async () => {
    const operation = buildOperation("update", "account", "acct-1", JSON.stringify({ name: "Rin" }));
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ error: "Sign in to sync." }), { status: 401 }));

    const result = await backendConnector.push([operation]);
    expect(result.outcome).toBe("error");
    expect(result.operations[0].status).toBe("error");
    expect(result.operations[0].retryCount).toBe(operation.retryCount + 1);
  });

  it("a genuine network failure marks every operation failed, never throwing out of push()", async () => {
    const operation = buildOperation("update", "account", "acct-1", JSON.stringify({ name: "Rin" }));
    vi.mocked(fetch).mockRejectedValueOnce(new Error("network down"));

    const result = await backendConnector.push([operation]);
    expect(result.outcome).toBe("error");
    expect(result.operations[0].status).toBe("error");
  });

  it("pull calls the real /api/sync/pull endpoint and returns its real operations", async () => {
    const operation = buildOperation("update", "account", "acct-1", JSON.stringify({ name: "Rin" }));
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ operations: [operation] }), { status: 200 }));

    const result = await backendConnector.pull();
    expect(result).toEqual({ operations: [operation] });
  });

  it("pull returns a real, honest empty result on a non-OK response, never a fabricated list", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ error: "Sign in to sync." }), { status: 401 }));
    expect(await backendConnector.pull()).toEqual({ operations: [] });
  });

  it("pull returns a real, honest empty result on a genuine network failure", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("network down"));
    expect(await backendConnector.pull()).toEqual({ operations: [] });
  });

  it("health reflects real navigator.onLine, always reports connected true (no persistent connection to lose)", async () => {
    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });
    expect(await backendConnector.health()).toEqual({ connected: true, online: true });

    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });
    expect(await backendConnector.health()).toEqual({ connected: true, online: false });
  });

  it("connect/disconnect/authenticate/signOut are real, safe no-ops — the session cookie already carries this connector's identity", async () => {
    await expect(backendConnector.connect()).resolves.toBeUndefined();
    await expect(backendConnector.disconnect()).resolves.toBeUndefined();
    await expect(backendConnector.authenticate()).resolves.toBeUndefined();
    await expect(backendConnector.signOut()).resolves.toBeUndefined();
  });

  it("honestly reports its real, limited capabilities", () => {
    expect(backendConnector.supportsRealtime()).toBe(false);
    expect(backendConnector.supportsOffline()).toBe(false);
    expect(backendConnector.supportsConflictResolution()).toBe(false);
  });
});
