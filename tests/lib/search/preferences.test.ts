import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const STORAGE_KEY = "base-radar:search-preferences";

async function freshModule() {
  vi.resetModules();
  return import("@/lib/search/preferences");
}

describe("Search preferences", () => {
  beforeEach(() => window.localStorage.removeItem(STORAGE_KEY));
  afterEach(() => window.localStorage.removeItem(STORAGE_KEY));

  it("starts with real defaults", async () => {
    const { getSearchPreferences, DEFAULT_SEARCH_PREFERENCES } = await freshModule();
    expect(getSearchPreferences()).toEqual(DEFAULT_SEARCH_PREFERENCES);
  });

  it("setSearchPreferences applies a real partial patch, persists it, and notifies", async () => {
    const { setSearchPreferences, getSearchPreferences, subscribeToSearchPreferences } = await freshModule();
    const listener = vi.fn();
    subscribeToSearchPreferences(listener);
    setSearchPreferences({ enableKeyboardShortcut: false });
    expect(getSearchPreferences().enableKeyboardShortcut).toBe(false);
    expect(getSearchPreferences().enableRecentSearches).toBe(true);
    expect(listener).toHaveBeenCalledOnce();
  });

  it("maxRecentSearches is clamped to the real [1, 50] range, never stored out of bounds", async () => {
    const { setSearchPreferences, getSearchPreferences } = await freshModule();
    setSearchPreferences({ maxRecentSearches: 500 });
    expect(getSearchPreferences().maxRecentSearches).toBe(50);
    setSearchPreferences({ maxRecentSearches: -5 });
    expect(getSearchPreferences().maxRecentSearches).toBe(1);
  });

  it("maxRecentSearches is rounded to a real integer", async () => {
    const { setSearchPreferences, getSearchPreferences } = await freshModule();
    setSearchPreferences({ maxRecentSearches: 12.7 });
    expect(getSearchPreferences().maxRecentSearches).toBe(13);
  });

  it("persists across a simulated refresh", async () => {
    const first = await freshModule();
    first.setSearchPreferences({ enableSearchHistory: false });
    const second = await freshModule();
    expect(second.getSearchPreferences().enableSearchHistory).toBe(false);
  });

  it("a corrupted stored value falls back to the honest default rather than throwing", async () => {
    window.localStorage.setItem(STORAGE_KEY, "{not valid json");
    const { getSearchPreferences, DEFAULT_SEARCH_PREFERENCES } = await freshModule();
    expect(() => getSearchPreferences()).not.toThrow();
    expect(getSearchPreferences()).toEqual(DEFAULT_SEARCH_PREFERENCES);
  });

  it("an out-of-range persisted maxRecentSearches is rejected wholesale (all-or-nothing validation), falling back to real defaults", async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, preferences: { enableRecentSearches: true, maxRecentSearches: 999, enableSearchHistory: true, enableKeyboardShortcut: true } }));
    const { getSearchPreferences, DEFAULT_SEARCH_PREFERENCES } = await freshModule();
    expect(getSearchPreferences()).toEqual(DEFAULT_SEARCH_PREFERENCES);
  });

  it("resetSearchPreferences restores real defaults and persists the reset", async () => {
    const first = await freshModule();
    first.setSearchPreferences({ enableKeyboardShortcut: false, maxRecentSearches: 5 });
    first.resetSearchPreferences();
    expect(first.getSearchPreferences()).toEqual(first.DEFAULT_SEARCH_PREFERENCES);

    const second = await freshModule();
    expect(second.getSearchPreferences()).toEqual(second.DEFAULT_SEARCH_PREFERENCES);
  });
});
