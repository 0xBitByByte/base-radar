import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { addConflict, CONFLICTS_STORAGE_KEY, listConflicts, readConflicts, resolveConflict, writeConflicts } from "@/lib/sync/conflicts";
import type { ConflictRecord } from "@/lib/sync/types";

describe("Sync Conflicts store", () => {
  beforeEach(() => window.localStorage.removeItem(CONFLICTS_STORAGE_KEY));
  afterEach(() => window.localStorage.removeItem(CONFLICTS_STORAGE_KEY));

  it("starts with an honest empty list", () => {
    expect(readConflicts()).toEqual([]);
    expect(listConflicts()).toEqual([]);
  });

  it("recovers to an empty list on corrupted JSON", () => {
    window.localStorage.setItem(CONFLICTS_STORAGE_KEY, "{not json");
    expect(readConflicts()).toEqual([]);
  });

  it("filters out a structurally invalid conflict record", () => {
    const valid: ConflictRecord = { entity: "watchlist", entityId: "wl-1", localVersion: 1, remoteVersion: 2, resolved: false };
    const invalid = { entity: "watchlist", entityId: "wl-2" };
    writeConflicts([valid, invalid as unknown as ConflictRecord]);
    expect(readConflicts()).toEqual([valid]);
  });

  it("addConflict records a real, unresolved conflict with both versions", () => {
    const conflict = addConflict("account", "acct-1", { name: "Local" }, { name: "Remote" });
    expect(conflict).toEqual({ entity: "account", entityId: "acct-1", localVersion: { name: "Local" }, remoteVersion: { name: "Remote" }, resolved: false });
    expect(readConflicts()).toEqual([conflict]);
  });

  it("addConflict replaces any prior conflict for the same entity+entityId rather than duplicating", () => {
    addConflict("account", "acct-1", { v: 1 }, { v: 2 });
    const replacement = addConflict("account", "acct-1", { v: 3 }, { v: 4 });
    const stored = readConflicts();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toEqual(replacement);
  });

  it("resolveConflict flips only the matching record's resolved flag, never merges data", () => {
    addConflict("watchlist", "wl-1", { name: "Local" }, { name: "Remote" });
    addConflict("watchlist", "wl-2", { name: "Other" }, { name: "OtherRemote" });
    const next = resolveConflict("watchlist", "wl-1");
    const resolved = next.find((c) => c.entityId === "wl-1")!;
    const untouched = next.find((c) => c.entityId === "wl-2")!;
    expect(resolved.resolved).toBe(true);
    expect(resolved.localVersion).toEqual({ name: "Local" });
    expect(untouched.resolved).toBe(false);
  });

  it("resolveConflict on a nonexistent entity/entityId is a real no-op", () => {
    addConflict("watchlist", "wl-1", { a: 1 }, { a: 2 });
    const next = resolveConflict("account", "does-not-exist");
    expect(next).toEqual(readConflicts());
    expect(next.every((c) => !c.resolved)).toBe(true);
  });
});
