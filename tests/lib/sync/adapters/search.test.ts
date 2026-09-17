import { describe, expect, it } from "vitest";

import { RECENT_SEARCHES_ENTITY_ID, searchSyncAdapter } from "@/lib/sync/adapters/search";

describe("searchSyncAdapter", () => {
  it("identifies itself as the search entity with a real version number", () => {
    expect(searchSyncAdapter.entity).toBe("search");
    expect(searchSyncAdapter.version()).toBe(1);
  });

  it("validate accepts a real, well-formed RecentSearchesData", () => {
    expect(searchSyncAdapter.validate({ queries: ["aave", "uniswap"] })).toBe(true);
    expect(searchSyncAdapter.validate({ queries: [] })).toBe(true);
  });

  it("validate rejects a structurally malformed value", () => {
    expect(searchSyncAdapter.validate({ queries: "not an array" })).toBe(false);
    expect(searchSyncAdapter.validate({ queries: [1, 2, 3] })).toBe(false);
    expect(searchSyncAdapter.validate(null)).toBe(false);
    expect(searchSyncAdapter.validate({})).toBe(false);
  });

  it("serialize/deserialize round-trip a real RecentSearchesData exactly", () => {
    const data = { queries: ["aave", "uniswap"] };
    expect(searchSyncAdapter.deserialize(searchSyncAdapter.serialize(data))).toEqual(data);
  });

  it("deserialize throws on a payload that fails validation, never returns a malformed object", () => {
    expect(() => searchSyncAdapter.deserialize(JSON.stringify({ queries: [1, 2] }))).toThrow();
    expect(() => searchSyncAdapter.deserialize("{not valid json")).toThrow();
  });

  it("createOperation always addresses the fixed, real entityId — Recent Searches has no per-record id", () => {
    const operation = searchSyncAdapter.createOperation("update", RECENT_SEARCHES_ENTITY_ID, { queries: ["aave"] });
    expect(operation.entity).toBe("search");
    expect(operation.entityId).toBe("recent-searches");
    expect(operation.payload).toBe(JSON.stringify({ queries: ["aave"] }));
  });

  it("merge treats remote as authoritative — the same real convention preferencesSyncAdapter already uses for its own singleton entity", () => {
    const local = { queries: ["local"] };
    const remote = { queries: ["remote"] };
    expect(searchSyncAdapter.merge(local, remote)).toEqual(remote);
  });
});
