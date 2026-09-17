import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const STORAGE_KEY = "base-radar:personalization-preferences";

async function freshModule() {
  vi.resetModules();
  return import("@/lib/personalization/preferences");
}

describe("Personalization preferences", () => {
  beforeEach(() => window.localStorage.removeItem(STORAGE_KEY));
  afterEach(() => window.localStorage.removeItem(STORAGE_KEY));

  it("starts with real, all-enabled defaults", async () => {
    const { getPersonalizationPreferences, DEFAULT_PERSONALIZATION_PREFERENCES } = await freshModule();
    expect(getPersonalizationPreferences()).toEqual(DEFAULT_PERSONALIZATION_PREFERENCES);
  });

  it("setPersonalizationPreferences applies a real partial patch, persists it, and notifies", async () => {
    const { setPersonalizationPreferences, getPersonalizationPreferences, subscribeToPersonalizationPreferences } = await freshModule();
    const listener = vi.fn();
    subscribeToPersonalizationPreferences(listener);
    setPersonalizationPreferences({ filterDashboardByActiveWatchlist: false });
    expect(getPersonalizationPreferences().filterDashboardByActiveWatchlist).toBe(false);
    expect(getPersonalizationPreferences().enableSearchPrioritization).toBe(true); // untouched field stays real
    expect(listener).toHaveBeenCalledOnce();
  });

  it("persists across a simulated refresh", async () => {
    const first = await freshModule();
    first.setPersonalizationPreferences({ showWatchlistSelectorInTopbar: false });
    const second = await freshModule();
    expect(second.getPersonalizationPreferences().showWatchlistSelectorInTopbar).toBe(false);
  });

  it("field-by-field recovery: one corrupted/missing field never discards the rest of a real persisted record", async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, preferences: { filterDashboardByActiveWatchlist: false, enableSearchPrioritization: "not a boolean" } }));
    const { getPersonalizationPreferences } = await freshModule();
    const prefs = getPersonalizationPreferences();
    expect(prefs.filterDashboardByActiveWatchlist).toBe(false); // real, valid field recovered
    expect(prefs.enableSearchPrioritization).toBe(true); // invalid field falls back to default
    expect(prefs.rememberActiveWatchlist).toBe(true); // missing field falls back to default
  });

  it("a corrupted stored value falls back to the honest full default rather than throwing", async () => {
    window.localStorage.setItem(STORAGE_KEY, "{not valid json");
    const { getPersonalizationPreferences, DEFAULT_PERSONALIZATION_PREFERENCES } = await freshModule();
    expect(() => getPersonalizationPreferences()).not.toThrow();
    expect(getPersonalizationPreferences()).toEqual(DEFAULT_PERSONALIZATION_PREFERENCES);
  });

  it("resetPersonalizationPreferences restores real defaults and persists the reset", async () => {
    const first = await freshModule();
    first.setPersonalizationPreferences({ filterDashboardByActiveWatchlist: false, rememberActiveWatchlist: false });
    first.resetPersonalizationPreferences();
    expect(first.getPersonalizationPreferences()).toEqual(first.DEFAULT_PERSONALIZATION_PREFERENCES);

    const second = await freshModule();
    expect(second.getPersonalizationPreferences()).toEqual(second.DEFAULT_PERSONALIZATION_PREFERENCES);
  });

  it("unsubscribing stops further notifications", async () => {
    const { setPersonalizationPreferences, subscribeToPersonalizationPreferences } = await freshModule();
    const listener = vi.fn();
    const unsubscribe = subscribeToPersonalizationPreferences(listener);
    setPersonalizationPreferences({ rememberActiveWatchlist: false });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    setPersonalizationPreferences({ rememberActiveWatchlist: true });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
