import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const STORAGE_KEY = "base-radar:dashboard-layout-preferences";

async function freshModule() {
  vi.resetModules();
  return import("@/lib/dashboard-layout/preferences");
}

describe("Dashboard layout (widget visibility) preferences", () => {
  beforeEach(() => window.localStorage.removeItem(STORAGE_KEY));
  afterEach(() => window.localStorage.removeItem(STORAGE_KEY));

  it("starts with every real widget visible — nothing hidden until the user says so", async () => {
    const { getHiddenWidgetIds, isWidgetHidden } = await freshModule();
    expect(getHiddenWidgetIds()).toEqual([]);
    expect(isWidgetHidden("watchlist")).toBe(false);
  });

  it("setWidgetHidden(id, true) hides exactly one real widget, persists, and notifies", async () => {
    const { setWidgetHidden, isWidgetHidden, getHiddenWidgetIds, subscribeToDashboardLayoutPreferences } = await freshModule();
    const listener = vi.fn();
    subscribeToDashboardLayoutPreferences(listener);

    setWidgetHidden("trending", true);
    expect(isWidgetHidden("trending")).toBe(true);
    expect(isWidgetHidden("signals")).toBe(false); // untouched widget stays real
    expect(getHiddenWidgetIds()).toEqual(["trending"]);
    expect(listener).toHaveBeenCalledOnce();
  });

  it("setWidgetHidden(id, false) reveals a real hidden widget again", async () => {
    const { setWidgetHidden, isWidgetHidden } = await freshModule();
    setWidgetHidden("trending", true);
    setWidgetHidden("trending", false);
    expect(isWidgetHidden("trending")).toBe(false);
  });

  it("setting the same real visibility state again is a no-op — never a spurious notify", async () => {
    const { setWidgetHidden, subscribeToDashboardLayoutPreferences } = await freshModule();
    const listener = vi.fn();
    subscribeToDashboardLayoutPreferences(listener);
    setWidgetHidden("trending", false); // already visible by default
    expect(listener).not.toHaveBeenCalled();
  });

  it("persists multiple real hidden widgets across a simulated refresh", async () => {
    const first = await freshModule();
    first.setWidgetHidden("trending", true);
    first.setWidgetHidden("signals", true);
    const second = await freshModule();
    expect(second.getHiddenWidgetIds().sort()).toEqual(["signals", "trending"]);
  });

  it("a corrupted or foreign stored value falls back to the honest all-visible default", async () => {
    window.localStorage.setItem(STORAGE_KEY, "{not valid json");
    const { getHiddenWidgetIds } = await freshModule();
    expect(() => getHiddenWidgetIds()).not.toThrow();
    expect(getHiddenWidgetIds()).toEqual([]);
  });

  it("a mismatched real version falls back to the honest default rather than trusting stale data", async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 999, hiddenWidgetIds: ["trending"] }));
    const { getHiddenWidgetIds } = await freshModule();
    expect(getHiddenWidgetIds()).toEqual([]);
  });

  it("drops a stored id naming a widget that no longer exists, rather than trusting it forever", async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, hiddenWidgetIds: ["trending", "a-retired-widget"] }));
    const { getHiddenWidgetIds } = await freshModule();
    expect(getHiddenWidgetIds()).toEqual(["trending"]);
  });
});
