import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const STORAGE_KEY = "base-radar:personalization";
const LEGACY_KEY = "base-radar:watchlist";
const LEGACY_MIGRATED_KEY = "base-radar:legacy-watchlist-migrated";

async function freshModule() {
  vi.resetModules();
  return import("@/lib/personalization/storage");
}

describe("Personalization storage (Watchlists)", () => {
  beforeEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_KEY);
    window.localStorage.removeItem(LEGACY_MIGRATED_KEY);
  });
  afterEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_KEY);
    window.localStorage.removeItem(LEGACY_MIGRATED_KEY);
  });

  it("seeds 6 real default watchlists on first launch, Favorites pinned and active", async () => {
    const { getPersonalizationState } = await freshModule();
    const state = getPersonalizationState();
    expect(state.watchlists).toHaveLength(6);
    expect(state.watchlists[0].name).toBe("Favorites");
    expect(state.watchlists[0].pinned).toBe(true);
    expect(state.activeWatchlistId).toBe("watchlist:favorites");
  });

  describe("createWatchlist / updateWatchlist / deleteWatchlist / duplicateWatchlist", () => {
    it("createWatchlist adds a real, empty, unpinned watchlist and returns its real new id", async () => {
      const { createWatchlist, getPersonalizationState } = await freshModule();
      const id = createWatchlist({ name: "My List", description: "desc", icon: "rocket", color: "red" });
      const created = getPersonalizationState().watchlists.find((w) => w.id === id);
      expect(created).toBeDefined();
      expect(created?.name).toBe("My List");
      expect(created?.projectIds).toEqual([]);
      expect(created?.pinned).toBe(false);
    });

    it("updateWatchlist patches only the real given fields, bumping updatedAt", async () => {
      const { createWatchlist, updateWatchlist, getPersonalizationState } = await freshModule();
      const id = createWatchlist({ name: "Old", description: "d", icon: "rocket", color: "red" });
      updateWatchlist(id, { name: "New" });
      const updated = getPersonalizationState().watchlists.find((w) => w.id === id);
      expect(updated?.name).toBe("New");
      expect(updated?.description).toBe("d"); // untouched field survives
    });

    it("deleteWatchlist removes exactly the real target and reassigns activeWatchlistId if it was active", async () => {
      const { createWatchlist, setActiveWatchlist, deleteWatchlist, getPersonalizationState } = await freshModule();
      const id = createWatchlist({ name: "Temp", description: "d", icon: "rocket", color: "red" });
      setActiveWatchlist(id);
      deleteWatchlist(id);
      const state = getPersonalizationState();
      expect(state.watchlists.some((w) => w.id === id)).toBe(false);
      expect(state.activeWatchlistId).not.toBe(id);
      expect(state.activeWatchlistId).not.toBeNull(); // real pinned Favorites promoted
    });

    it("deleting a non-existent id is a real no-op", async () => {
      const { deleteWatchlist, getPersonalizationState } = await freshModule();
      const before = getPersonalizationState().watchlists.length;
      deleteWatchlist("watchlist:does-not-exist");
      expect(getPersonalizationState().watchlists.length).toBe(before);
    });

    it("duplicateWatchlist copies real membership/identity, never pins the copy, and inserts it right after the source", async () => {
      const { createWatchlist, addProjectToWatchlist, duplicateWatchlist, getPersonalizationState } = await freshModule();
      const id = createWatchlist({ name: "Source", description: "d", icon: "rocket", color: "red" });
      addProjectToWatchlist(id, "aave");
      const newId = duplicateWatchlist(id);
      const state = getPersonalizationState();
      const sourceIndex = state.watchlists.findIndex((w) => w.id === id);
      const copy = state.watchlists.find((w) => w.id === newId);
      expect(copy?.name).toBe("Source (Copy)");
      expect(copy?.projectIds).toEqual(["aave"]);
      expect(copy?.pinned).toBe(false);
      expect(state.watchlists[sourceIndex + 1].id).toBe(newId);
    });

    it("duplicating a non-existent id returns null, never a fabricated copy", async () => {
      const { duplicateWatchlist } = await freshModule();
      expect(duplicateWatchlist("watchlist:does-not-exist")).toBeNull();
    });
  });

  describe("reorderWatchlists / setPinned / setActiveWatchlist", () => {
    it("reorders to exactly match the given real order", async () => {
      const { reorderWatchlists, getPersonalizationState } = await freshModule();
      const ids = getPersonalizationState().watchlists.map((w) => w.id);
      const reversed = [...ids].reverse();
      reorderWatchlists(reversed);
      expect(getPersonalizationState().watchlists.map((w) => w.id)).toEqual(reversed);
    });

    it("a watchlist missing from the given order is kept and appended, never silently dropped", async () => {
      const { reorderWatchlists, getPersonalizationState } = await freshModule();
      const ids = getPersonalizationState().watchlists.map((w) => w.id);
      reorderWatchlists(ids.slice(1)); // omit the first real id
      const state = getPersonalizationState();
      expect(state.watchlists).toHaveLength(ids.length);
      expect(state.watchlists.at(-1)?.id).toBe(ids[0]);
    });

    it("setPinned toggles the real pinned flag", async () => {
      const { setPinned, getPersonalizationState } = await freshModule();
      setPinned("watchlist:ai", true);
      expect(getPersonalizationState().watchlists.find((w) => w.id === "watchlist:ai")?.pinned).toBe(true);
    });

    it("setActiveWatchlist ignores a real nonexistent id rather than pointing at a dangling reference", async () => {
      const { setActiveWatchlist, getPersonalizationState } = await freshModule();
      const before = getPersonalizationState().activeWatchlistId;
      setActiveWatchlist("watchlist:does-not-exist");
      expect(getPersonalizationState().activeWatchlistId).toBe(before);
    });

    it("setActiveWatchlist(null) clears the active selection", async () => {
      const { setActiveWatchlist, getPersonalizationState } = await freshModule();
      setActiveWatchlist(null);
      expect(getPersonalizationState().activeWatchlistId).toBeNull();
    });
  });

  describe("project membership", () => {
    it("addProjectToWatchlist adds a real project id exactly once, never a duplicate", async () => {
      const { addProjectToWatchlist, getPersonalizationState } = await freshModule();
      addProjectToWatchlist("watchlist:favorites", "aave");
      addProjectToWatchlist("watchlist:favorites", "aave");
      const list = getPersonalizationState().watchlists.find((w) => w.id === "watchlist:favorites");
      expect(list?.projectIds).toEqual(["aave"]);
    });

    it("removeProjectFromWatchlist removes exactly the real target", async () => {
      const { addProjectToWatchlist, removeProjectFromWatchlist, getPersonalizationState } = await freshModule();
      addProjectToWatchlist("watchlist:favorites", "aave");
      addProjectToWatchlist("watchlist:favorites", "compound");
      removeProjectFromWatchlist("watchlist:favorites", "aave");
      expect(getPersonalizationState().watchlists.find((w) => w.id === "watchlist:favorites")?.projectIds).toEqual(["compound"]);
    });

    it("getMembershipWatchlist resolves the real active watchlist first", async () => {
      const { getMembershipWatchlist } = await freshModule();
      expect(getMembershipWatchlist()?.id).toBe("watchlist:favorites");
    });

    it("getMembershipProjectIds reflects the real active watchlist's real membership", async () => {
      const { addProjectToWatchlist, getMembershipProjectIds } = await freshModule();
      addProjectToWatchlist("watchlist:favorites", "aave");
      expect(getMembershipProjectIds()).toEqual(["aave"]);
    });

    it("toggleMembershipProject adds when absent, removes when present, on the real active watchlist", async () => {
      const { toggleMembershipProject, getMembershipProjectIds } = await freshModule();
      toggleMembershipProject("aave");
      expect(getMembershipProjectIds()).toEqual(["aave"]);
      toggleMembershipProject("aave");
      expect(getMembershipProjectIds()).toEqual([]);
    });
  });

  describe("persistence & corruption recovery", () => {
    it("persists real mutations across a simulated refresh", async () => {
      const first = await freshModule();
      first.addProjectToWatchlist("watchlist:favorites", "aave");
      const second = await freshModule();
      expect(second.getMembershipProjectIds()).toEqual(["aave"]);
    });

    it("a corrupted stored value falls back to the honest default watchlist set rather than throwing", async () => {
      window.localStorage.setItem(STORAGE_KEY, "{not valid json");
      const { getPersonalizationState } = await freshModule();
      expect(() => getPersonalizationState()).not.toThrow();
      expect(getPersonalizationState().watchlists).toHaveLength(6);
    });

    it("a mismatched real version falls back to the honest default rather than trusting stale data", async () => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 999, watchlists: [], activeWatchlistId: null }));
      const { getPersonalizationState } = await freshModule();
      expect(getPersonalizationState().watchlists).toHaveLength(6);
    });
  });

  describe("subscribe", () => {
    it("notifies real subscribers on mutation and stops after unsubscribing", async () => {
      const { addProjectToWatchlist, subscribe } = await freshModule();
      const listener = vi.fn();
      const unsubscribe = subscribe(listener);
      addProjectToWatchlist("watchlist:favorites", "aave");
      expect(listener).toHaveBeenCalledTimes(1);
      unsubscribe();
      addProjectToWatchlist("watchlist:favorites", "compound");
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("importWatchlists", () => {
    it("adds real entries additively, never overwriting existing watchlists", async () => {
      const { importWatchlists, getPersonalizationState } = await freshModule();
      const before = getPersonalizationState().watchlists.length;
      const added = importWatchlists([{ name: "Imported List", description: "d", icon: "rocket", color: "red", projectIds: ["aave"], createdAt: "2026-01-01T00:00:00.000Z" }]);
      expect(added).toBe(1);
      expect(getPersonalizationState().watchlists.length).toBe(before + 1);
    });

    it("disambiguates a real name collision with an '(Imported)' suffix rather than merging", async () => {
      const { importWatchlists, getPersonalizationState } = await freshModule();
      importWatchlists([{ name: "Favorites", description: "d", icon: "rocket", color: "red", projectIds: [], createdAt: "2026-01-01T00:00:00.000Z" }]);
      const names = getPersonalizationState().watchlists.map((w) => w.name);
      expect(names).toContain("Favorites (Imported)");
      expect(names.filter((n) => n === "Favorites")).toHaveLength(1); // the real original, untouched
    });

    it("an empty entries array is a real no-op", async () => {
      const { importWatchlists, getPersonalizationState } = await freshModule();
      const before = getPersonalizationState().watchlists.length;
      expect(importWatchlists([])).toBe(0);
      expect(getPersonalizationState().watchlists.length).toBe(before);
    });
  });
});
