import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const RECENT_SEARCHES_KEY = "base-radar:search-recent";
const SEARCH_PREFERENCES_KEY = "base-radar:search-preferences";
const SYNC_KEYS = ["base-radar:sync-queue", "base-radar:sync-conflicts", "base-radar:sync-status"];

function clearAllStorage() {
  window.localStorage.removeItem(RECENT_SEARCHES_KEY);
  window.localStorage.removeItem(SEARCH_PREFERENCES_KEY);
  for (const key of SYNC_KEYS) window.localStorage.removeItem(key);
}

async function freshModule() {
  vi.resetModules();
  return import("@/lib/search/storage");
}

describe("Recent Searches storage", () => {
  beforeEach(clearAllStorage);
  afterEach(clearAllStorage);

  describe("local (pre-existing) behavior — PR-094.01 must not change any of this", () => {
    it("starts with a real, empty list", async () => {
      const { getRecentSearches } = await freshModule();
      expect(getRecentSearches()).toEqual([]);
    });

    it("recordSearch adds a real query, newest first", async () => {
      const { recordSearch, getRecentSearches } = await freshModule();
      recordSearch("aave");
      recordSearch("uniswap");
      expect(getRecentSearches()).toEqual(["uniswap", "aave"]);
    });

    it("recordSearch de-duplicates case-insensitively, moving the existing entry to the front", async () => {
      const { recordSearch, getRecentSearches } = await freshModule();
      recordSearch("Aave");
      recordSearch("uniswap");
      recordSearch("AAVE");
      expect(getRecentSearches()).toEqual(["AAVE", "uniswap"]);
    });

    it("recordSearch enforces the real maxRecentSearches preference cap", async () => {
      const { setSearchPreferences } = await import("@/lib/search/preferences");
      setSearchPreferences({ maxRecentSearches: 2 });
      const { recordSearch, getRecentSearches } = await freshModule();
      recordSearch("a");
      recordSearch("b");
      recordSearch("c");
      expect(getRecentSearches()).toEqual(["c", "b"]);
    });

    it("recordSearch is a real no-op when the Search History preference is disabled", async () => {
      const { setSearchPreferences } = await import("@/lib/search/preferences");
      setSearchPreferences({ enableSearchHistory: false });
      const { recordSearch, getRecentSearches } = await freshModule();
      recordSearch("aave");
      expect(getRecentSearches()).toEqual([]);
    });

    it("recordSearch ignores an empty/whitespace-only query", async () => {
      const { recordSearch, getRecentSearches } = await freshModule();
      recordSearch("   ");
      expect(getRecentSearches()).toEqual([]);
    });

    it("clearSearchHistory empties the real list", async () => {
      const { recordSearch, clearSearchHistory, getRecentSearches } = await freshModule();
      recordSearch("aave");
      clearSearchHistory();
      expect(getRecentSearches()).toEqual([]);
    });

    it("persists across a simulated refresh", async () => {
      const first = await freshModule();
      first.recordSearch("aave");
      const second = await freshModule();
      expect(second.getRecentSearches()).toEqual(["aave"]);
    });
  });

  describe("PR-094.01 — Cloud Sync enqueueing", () => {
    it("without a real authAccountId (Guest), nothing is enqueued — local-only behavior is unchanged", async () => {
      const { recordSearch } = await freshModule();
      const { getPendingOperations } = await import("@/lib/sync/service");
      recordSearch("aave");
      expect(getPendingOperations()).toEqual([]);
    });

    it("with a real authAccountId, recordSearch enqueues a real search Sync operation with the current, real list", async () => {
      const { recordSearch } = await freshModule();
      const { getPendingOperations } = await import("@/lib/sync/service");
      recordSearch("aave", "real-auth-account-id");

      const queued = getPendingOperations();
      expect(queued).toHaveLength(1);
      expect(queued[0].entity).toBe("search");
      expect(queued[0].entityId).toBe("recent-searches");
      const payload = JSON.parse(queued[0].payload!);
      expect(payload.queries).toEqual(["aave"]);
    });

    it("with a real authAccountId, clearSearchHistory also enqueues a real (now-empty) search Sync operation", async () => {
      const { recordSearch, clearSearchHistory } = await freshModule();
      const { getPendingOperations } = await import("@/lib/sync/service");
      recordSearch("aave", "real-auth-account-id");
      clearSearchHistory("real-auth-account-id");

      const queued = getPendingOperations();
      const last = queued[queued.length - 1];
      const payload = JSON.parse(last.payload!);
      expect(payload.queries).toEqual([]);
    });

    it("a disabled Search History preference still enqueues nothing, even with a real authAccountId", async () => {
      const { setSearchPreferences } = await import("@/lib/search/preferences");
      setSearchPreferences({ enableSearchHistory: false });
      const { recordSearch } = await freshModule();
      const { getPendingOperations } = await import("@/lib/sync/service");
      recordSearch("aave", "real-auth-account-id");
      expect(getPendingOperations()).toEqual([]);
    });
  });

  describe("applyRemoteRecentSearches (PR-094.01 — pull-apply)", () => {
    it("applies a real pulled remote list directly, notifying subscribers", async () => {
      const { applyRemoteRecentSearches, getRecentSearches, subscribeToRecentSearches } = await freshModule();
      const listener = vi.fn();
      subscribeToRecentSearches(listener);

      applyRemoteRecentSearches(["cloud query 1", "cloud query 2"]);
      expect(getRecentSearches()).toEqual(["cloud query 1", "cloud query 2"]);
      expect(listener).toHaveBeenCalled();
    });

    it("never enqueues a Sync operation — applying a pull must never re-trigger a push of the same state back", async () => {
      const { applyRemoteRecentSearches } = await freshModule();
      const { getPendingOperations } = await import("@/lib/sync/service");
      applyRemoteRecentSearches(["cloud query"]);
      expect(getPendingOperations()).toEqual([]);
    });
  });
});
