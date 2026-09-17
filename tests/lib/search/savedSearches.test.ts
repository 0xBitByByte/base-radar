import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const STORAGE_KEY = "base-radar:search-saved";

async function freshModule() {
  vi.resetModules();
  return import("@/lib/search/savedSearches");
}

describe("Saved Searches storage", () => {
  beforeEach(() => window.localStorage.removeItem(STORAGE_KEY));
  afterEach(() => window.localStorage.removeItem(STORAGE_KEY));

  it("starts with a real, empty list", async () => {
    const { getSavedSearches } = await freshModule();
    expect(getSavedSearches()).toEqual([]);
  });

  it("saveSearch adds a real, well-formed entry — newest first", async () => {
    const { saveSearch, getSavedSearches } = await freshModule();
    saveSearch("aave");
    saveSearch("uniswap");
    const saved = getSavedSearches();
    expect(saved.map((s) => s.query)).toEqual(["uniswap", "aave"]);
    expect(saved[0].id).toBeTruthy();
    expect(Number.isNaN(Date.parse(saved[0].createdAt))).toBe(false);
  });

  it("saveSearch is a real no-op for an empty/whitespace-only query", async () => {
    const { saveSearch, getSavedSearches } = await freshModule();
    expect(saveSearch("   ")).toBeNull();
    expect(getSavedSearches()).toEqual([]);
  });

  it("saveSearch de-duplicates case-insensitively — returns the real existing entry, never a duplicate", async () => {
    const { saveSearch, getSavedSearches } = await freshModule();
    const first = saveSearch("Aave");
    const second = saveSearch("AAVE");
    expect(second?.id).toBe(first?.id);
    expect(getSavedSearches()).toHaveLength(1);
  });

  it("saveSearch trims whitespace before storing", async () => {
    const { saveSearch } = await freshModule();
    const entry = saveSearch("  aave  ");
    expect(entry?.query).toBe("aave");
  });

  it("saveSearch enforces a real ceiling — never silently evicts an existing real entry to make room", async () => {
    const { saveSearch, getSavedSearches } = await freshModule();
    for (let i = 0; i < 50; i++) saveSearch(`query-${i}`);
    expect(getSavedSearches()).toHaveLength(50);

    const overflow = saveSearch("one-too-many");
    expect(overflow).toBeNull();
    expect(getSavedSearches()).toHaveLength(50);
    expect(getSavedSearches().some((s) => s.query === "query-0")).toBe(true); // the oldest real entry is still there — never evicted
  });

  it("isQuerySaved reports the real, current state, case-insensitively", async () => {
    const { saveSearch, isQuerySaved } = await freshModule();
    expect(isQuerySaved("aave")).toBe(false);
    saveSearch("Aave");
    expect(isQuerySaved("aave")).toBe(true);
    expect(isQuerySaved("AAVE")).toBe(true);
  });

  it("deleteSavedSearch removes a real entry by id — a genuine no-op for an unknown id", async () => {
    const { saveSearch, deleteSavedSearch, getSavedSearches } = await freshModule();
    const entry = saveSearch("aave")!;
    deleteSavedSearch("not-a-real-id");
    expect(getSavedSearches()).toHaveLength(1);
    deleteSavedSearch(entry.id);
    expect(getSavedSearches()).toEqual([]);
  });

  it("deleteSavedSearchByQuery removes a real entry by its query text, case-insensitively", async () => {
    const { saveSearch, deleteSavedSearchByQuery, getSavedSearches } = await freshModule();
    saveSearch("aave");
    deleteSavedSearchByQuery("AAVE");
    expect(getSavedSearches()).toEqual([]);
  });

  it("persists across a simulated refresh", async () => {
    const first = await freshModule();
    first.saveSearch("aave");
    const second = await freshModule();
    expect(second.getSavedSearches().map((s) => s.query)).toEqual(["aave"]);
  });

  it("a wholesale-corrupted stored value falls back to a real, honest empty list, never throws", async () => {
    window.localStorage.setItem(STORAGE_KEY, "{not valid json");
    const { getSavedSearches } = await freshModule();
    expect(() => getSavedSearches()).not.toThrow();
    expect(getSavedSearches()).toEqual([]);
  });

  it("a mismatched real version falls back to the honest empty default rather than trusting stale data", async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 999, searches: [{ id: "x", query: "aave", createdAt: "2026-01-01T00:00:00.000Z" }] }));
    const { getSavedSearches } = await freshModule();
    expect(getSavedSearches()).toEqual([]);
  });

  it("an individually malformed entry inside an otherwise-valid envelope is dropped on its own — one corrupted entry never costs every other real one", async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        searches: [
          { id: "real-1", query: "aave", createdAt: "2026-01-01T00:00:00.000Z" },
          { id: "bad-1", query: "", createdAt: "2026-01-01T00:00:00.000Z" }, // empty query — invalid
          { id: "bad-2", query: "uniswap" }, // missing createdAt — invalid
          { query: "compound", createdAt: "2026-01-01T00:00:00.000Z" }, // missing id — invalid
          { id: "real-2", query: "morpho", createdAt: "2026-01-01T00:00:00.000Z" },
        ],
      })
    );
    const { getSavedSearches } = await freshModule();
    expect(getSavedSearches().map((s) => s.id)).toEqual(["real-1", "real-2"]);
  });

  it("subscribe notifies listeners on every real mutation, and unsubscribe stops it", async () => {
    const { saveSearch, deleteSavedSearch, subscribeToSavedSearches } = await freshModule();
    const listener = vi.fn();
    const unsubscribe = subscribeToSavedSearches(listener);

    const entry = saveSearch("aave")!;
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    deleteSavedSearch(entry.id);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

const QUEUE_STORAGE_KEY = "base-radar:sync-queue";

describe("Saved Searches — PR-094.02 Cloud Sync", () => {
  beforeEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(QUEUE_STORAGE_KEY);
  });
  afterEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(QUEUE_STORAGE_KEY);
  });

  it("Guest regression: saveSearch/delete without an authAccountId never enqueues a real Sync operation", async () => {
    const { saveSearch, deleteSavedSearch } = await freshModule();
    const { readQueue } = await import("@/lib/sync/queue");

    const entry = saveSearch("aave")!;
    expect(readQueue()).toEqual([]);
    deleteSavedSearch(entry.id);
    expect(readQueue()).toEqual([]);
  });

  it("saveSearch with a real authAccountId enqueues a real create Sync operation addressed by the record's own id", async () => {
    const { saveSearch } = await freshModule();
    const { readQueue } = await import("@/lib/sync/queue");

    const entry = saveSearch("aave", "acct-1")!;
    const queue = readQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].entity).toBe("savedSearch");
    expect(queue[0].type).toBe("create");
    expect(queue[0].entityId).toBe(entry.id);
  });

  it("deleteSavedSearch with a real authAccountId enqueues a real delete Sync operation for the removed record's own id", async () => {
    const { saveSearch, deleteSavedSearch } = await freshModule();
    const { readQueue } = await import("@/lib/sync/queue");

    const entry = saveSearch("aave", "acct-1")!;
    deleteSavedSearch(entry.id, "acct-1");
    const queue = readQueue();
    const deleteOp = queue.find((op) => op.type === "delete");
    expect(deleteOp?.entity).toBe("savedSearch");
    expect(deleteOp?.entityId).toBe(entry.id);
  });

  it("deleteSavedSearchByQuery with a real authAccountId enqueues a real delete Sync operation", async () => {
    const { saveSearch, deleteSavedSearchByQuery } = await freshModule();
    const { readQueue } = await import("@/lib/sync/queue");

    saveSearch("Aave", "acct-1");
    deleteSavedSearchByQuery("AAVE", "acct-1");
    const queue = readQueue();
    expect(queue.some((op) => op.type === "delete" && op.entity === "savedSearch")).toBe(true);
  });

  it("a real no-op save (already-saved query, or an empty query) never enqueues a spurious real Sync operation", async () => {
    const { saveSearch } = await freshModule();
    const { readQueue } = await import("@/lib/sync/queue");

    saveSearch("aave", "acct-1");
    saveSearch("AAVE", "acct-1"); // already saved — a real no-op
    saveSearch("   ", "acct-1"); // empty — a real no-op
    expect(readQueue()).toHaveLength(1);
  });

  it("applyRemoteSavedSearch inserts a real pulled record locally and never enqueues a Sync operation — no sync loop when applying pulled remote data", async () => {
    const { applyRemoteSavedSearch, getSavedSearches } = await freshModule();
    const { readQueue } = await import("@/lib/sync/queue");

    applyRemoteSavedSearch({ id: "remote-1", query: "aave", createdAt: "2026-01-01T00:00:00.000Z" });
    expect(getSavedSearches().map((s) => s.id)).toEqual(["remote-1"]);
    expect(readQueue()).toEqual([]); // applying a pull result must never re-enqueue a push for the same data
  });

  it("applyRemoteSavedSearch upserts by id — a duplicate/replayed remote record for the same id never creates a second local entry", async () => {
    const { applyRemoteSavedSearch, getSavedSearches } = await freshModule();
    applyRemoteSavedSearch({ id: "remote-1", query: "aave", createdAt: "2026-01-01T00:00:00.000Z" });
    applyRemoteSavedSearch({ id: "remote-1", query: "aave (updated)", createdAt: "2026-01-01T00:00:00.000Z" });
    expect(getSavedSearches()).toHaveLength(1);
    expect(getSavedSearches()[0].query).toBe("aave (updated)");
  });

  it("applyRemoteSavedSearch rejects a structurally malformed remote record, never crashes and never inserts it", async () => {
    const { applyRemoteSavedSearch, getSavedSearches } = await freshModule();
    expect(() => applyRemoteSavedSearch({ id: "", query: "aave", createdAt: "2026-01-01T00:00:00.000Z" } as never)).not.toThrow();
    expect(getSavedSearches()).toEqual([]);
  });

  it("removeSavedSearchLocally removes a real local record by id and never enqueues a Sync operation — no sync loop when applying a pulled remote deletion", async () => {
    const { saveSearch, removeSavedSearchLocally, getSavedSearches } = await freshModule();
    const { readQueue } = await import("@/lib/sync/queue");

    const entry = saveSearch("aave")!; // local-only, Guest save — never enqueued
    removeSavedSearchLocally(entry.id);
    expect(getSavedSearches()).toEqual([]);
    expect(readQueue()).toEqual([]);
  });

  it("removeSavedSearchLocally is a real, honest no-op for an id never seen locally — a record this device never synced is simply untouched", async () => {
    const { saveSearch, removeSavedSearchLocally, getSavedSearches } = await freshModule();
    saveSearch("aave");
    removeSavedSearchLocally("never-seen-id");
    expect(getSavedSearches()).toHaveLength(1);
  });

  it("existing Recent Searches behavior remains unaffected by Saved Searches Cloud Sync — separate storage keys, separate queue entries", async () => {
    vi.resetModules();
    const savedModule = await import("@/lib/search/savedSearches");
    const recentModule = await import("@/lib/search/storage");

    savedModule.saveSearch("aave", "acct-1");
    recentModule.recordSearch("uniswap", "acct-1");

    const { readQueue } = await import("@/lib/sync/queue");
    const entities = readQueue().map((op) => op.entity);
    expect(entities).toContain("savedSearch");
    expect(entities).toContain("search");
    expect(savedModule.getSavedSearches().map((s) => s.query)).toEqual(["aave"]);
    expect(recentModule.getRecentSearches()).toEqual(["uniswap"]);
  });
});
