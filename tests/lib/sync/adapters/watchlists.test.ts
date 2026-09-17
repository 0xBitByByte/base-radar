import { describe, expect, it } from "vitest";

import { watchlistSyncAdapter } from "@/lib/sync/adapters/watchlists";
import type { PersonalWatchlist } from "@/lib/personalization/types";

function makeWatchlist(overrides: Partial<PersonalWatchlist> = {}): PersonalWatchlist {
  return {
    id: "wl-1",
    name: "Favorites",
    description: "",
    icon: "star",
    color: "primary",
    projectIds: ["aave", "uniswap"],
    pinned: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("watchlistSyncAdapter", () => {
  it("identifies itself as the watchlist entity with a real version number", () => {
    expect(watchlistSyncAdapter.entity).toBe("watchlist");
    expect(watchlistSyncAdapter.version()).toBe(1);
  });

  it("validate accepts a real, well-formed watchlist", () => {
    expect(watchlistSyncAdapter.validate(makeWatchlist())).toBe(true);
  });

  it("validate rejects an unknown icon or color — not just any string", () => {
    expect(watchlistSyncAdapter.validate(makeWatchlist({ icon: "not-a-real-icon" as PersonalWatchlist["icon"] }))).toBe(false);
    expect(watchlistSyncAdapter.validate(makeWatchlist({ color: "not-a-real-color" as PersonalWatchlist["color"] }))).toBe(false);
  });

  it("validate rejects a projectIds array containing a non-string entry", () => {
    expect(watchlistSyncAdapter.validate(makeWatchlist({ projectIds: ["aave", 42] as unknown as string[] }))).toBe(false);
  });

  it("validate rejects a structurally malformed value", () => {
    expect(watchlistSyncAdapter.validate({ id: "wl-1" })).toBe(false);
    expect(watchlistSyncAdapter.validate(null)).toBe(false);
  });

  it("serialize/deserialize round-trip a real watchlist exactly", () => {
    const watchlist = makeWatchlist({ projectIds: ["aave"] });
    const payload = watchlistSyncAdapter.serialize(watchlist);
    expect(watchlistSyncAdapter.deserialize(payload)).toEqual(watchlist);
  });

  it("deserialize throws on a payload that fails validation", () => {
    expect(() => watchlistSyncAdapter.deserialize(JSON.stringify({ id: "wl-1" }))).toThrow(/failed validation/);
  });

  it("createOperation addresses the specific watchlist's own id", () => {
    const watchlist = makeWatchlist();
    const operation = watchlistSyncAdapter.createOperation("create", watchlist.id, watchlist);
    expect(operation.entity).toBe("watchlist");
    expect(operation.entityId).toBe(watchlist.id);
    expect(watchlistSyncAdapter.deserialize(operation.payload!)).toEqual(watchlist);
  });

  it("merge picks whichever real version has the newer updatedAt, same strategy as accountSyncAdapter", () => {
    const older = makeWatchlist({ updatedAt: "2026-01-01T00:00:00.000Z" });
    const newer = makeWatchlist({ updatedAt: "2026-02-01T00:00:00.000Z", name: "Newer Favorites" });
    expect(watchlistSyncAdapter.merge(older, newer)).toEqual(newer);
    expect(watchlistSyncAdapter.merge(newer, older)).toEqual(newer);
  });
});
