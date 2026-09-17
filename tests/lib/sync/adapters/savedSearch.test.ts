import { describe, expect, it } from "vitest";

import { savedSearchSyncAdapter } from "@/lib/sync/adapters/savedSearch";

describe("savedSearchSyncAdapter", () => {
  it("identifies itself as the savedSearch entity with a real version number", () => {
    expect(savedSearchSyncAdapter.entity).toBe("savedSearch");
    expect(savedSearchSyncAdapter.version()).toBe(1);
  });

  it("validate accepts a real, well-formed SavedSearch", () => {
    expect(savedSearchSyncAdapter.validate({ id: "s1", query: "aave", createdAt: "2026-01-01T00:00:00.000Z" })).toBe(true);
  });

  it("validate rejects a structurally malformed value", () => {
    expect(savedSearchSyncAdapter.validate({ id: "", query: "aave", createdAt: "2026-01-01T00:00:00.000Z" })).toBe(false);
    expect(savedSearchSyncAdapter.validate({ id: "s1", query: "", createdAt: "2026-01-01T00:00:00.000Z" })).toBe(false);
    expect(savedSearchSyncAdapter.validate({ id: "s1", query: "aave", createdAt: "not a date" })).toBe(false);
    expect(savedSearchSyncAdapter.validate(null)).toBe(false);
    expect(savedSearchSyncAdapter.validate({})).toBe(false);
  });

  it("serialize/deserialize round-trip a real SavedSearch exactly", () => {
    const data = { id: "s1", query: "aave", createdAt: "2026-01-01T00:00:00.000Z" };
    expect(savedSearchSyncAdapter.deserialize(savedSearchSyncAdapter.serialize(data))).toEqual(data);
  });

  it("deserialize throws on a payload that fails validation, never returns a malformed object", () => {
    expect(() => savedSearchSyncAdapter.deserialize(JSON.stringify({ id: "s1" }))).toThrow();
    expect(() => savedSearchSyncAdapter.deserialize("{not valid json")).toThrow();
  });

  it("createOperation addresses the real record's own id — a genuine multi-record entity, unlike search/account's fixed singleton id", () => {
    const data = { id: "s1", query: "aave", createdAt: "2026-01-01T00:00:00.000Z" };
    const created = savedSearchSyncAdapter.createOperation("create", "s1", data);
    expect(created.entity).toBe("savedSearch");
    expect(created.entityId).toBe("s1");
    expect(created.type).toBe("create");
    expect(created.payload).toBe(JSON.stringify(data));

    const deleted = savedSearchSyncAdapter.createOperation("delete", "s1", data);
    expect(deleted.type).toBe("delete");
  });

  it("createOperation gives two real records genuinely distinct entityIds", () => {
    const a = savedSearchSyncAdapter.createOperation("create", "s1", { id: "s1", query: "aave", createdAt: "2026-01-01T00:00:00.000Z" });
    const b = savedSearchSyncAdapter.createOperation("create", "s2", { id: "s2", query: "uniswap", createdAt: "2026-01-01T00:00:00.000Z" });
    expect(a.entityId).not.toBe(b.entityId);
  });

  it("merge treats remote as authoritative — a Saved Search is immutable, so this is never actually invoked in practice", () => {
    const local = { id: "s1", query: "local", createdAt: "2026-01-01T00:00:00.000Z" };
    const remote = { id: "s1", query: "remote", createdAt: "2026-01-02T00:00:00.000Z" };
    expect(savedSearchSyncAdapter.merge(local, remote)).toEqual(remote);
  });
});
