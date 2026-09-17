import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { deriveState, readIsOffline, readPersistedStatus, STATUS_STORAGE_KEY, writePersistedStatus } from "@/lib/sync/status";

describe("Sync Status storage", () => {
  beforeEach(() => window.localStorage.removeItem(STATUS_STORAGE_KEY));
  afterEach(() => window.localStorage.removeItem(STATUS_STORAGE_KEY));

  it("defaults to a real null lastSyncAt on first load", () => {
    expect(readPersistedStatus()).toEqual({ version: 2, lastSyncAt: null });
  });

  it("round-trips a real lastSyncAt written via writePersistedStatus", () => {
    writePersistedStatus({ version: 2, lastSyncAt: "2026-02-01T00:00:00.000Z" });
    expect(readPersistedStatus()).toEqual({ version: 2, lastSyncAt: "2026-02-01T00:00:00.000Z" });
  });

  it("recovers to the default on corrupted JSON", () => {
    window.localStorage.setItem(STATUS_STORAGE_KEY, "{not json");
    expect(readPersistedStatus()).toEqual({ version: 2, lastSyncAt: null });
  });

  it("falls back to the default lastSyncAt when the persisted field is the wrong type", () => {
    window.localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify({ version: 2, lastSyncAt: 12345 }));
    expect(readPersistedStatus().lastSyncAt).toBeNull();
  });
});

describe("readIsOffline", () => {
  const originalOnLine = window.navigator.onLine;
  afterEach(() => {
    Object.defineProperty(window.navigator, "onLine", { value: originalOnLine, configurable: true });
  });

  it("reflects real navigator.onLine — online means not offline", () => {
    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });
    expect(readIsOffline()).toBe(false);
  });

  it("reflects real navigator.onLine — offline means offline", () => {
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });
    expect(readIsOffline()).toBe(true);
  });
});

describe("deriveState priority order", () => {
  it("offline beats everything else", () => {
    expect(deriveState(5, true, true, "syncing")).toBe("offline");
  });

  it("conflict beats an in-flight attempt when online", () => {
    expect(deriveState(5, false, true, "syncing")).toBe("conflict");
  });

  it("an in-flight syncing attempt beats plain pending/idle", () => {
    expect(deriveState(5, false, false, "syncing")).toBe("syncing");
  });

  it("a just-finished error attempt is reported honestly", () => {
    expect(deriveState(5, false, false, "error")).toBe("error");
  });

  it("a just-finished success attempt with nothing left pending is success", () => {
    expect(deriveState(0, false, false, "success")).toBe("success");
  });

  it("a success phase with real work still pending falls through to pending, not a false success", () => {
    expect(deriveState(2, false, false, "success")).toBe("pending");
  });

  it("a nonzero queue with an idle phase is pending", () => {
    expect(deriveState(3, false, false, "idle")).toBe("pending");
  });

  it("an empty queue with an idle phase is idle", () => {
    expect(deriveState(0, false, false, "idle")).toBe("idle");
  });
});
