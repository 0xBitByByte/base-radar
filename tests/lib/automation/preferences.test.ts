import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const STORAGE_KEY = "base-radar:automation-preferences";

async function freshModule() {
  vi.resetModules();
  return import("@/lib/automation/preferences");
}

describe("Automation preferences", () => {
  beforeEach(() => window.localStorage.removeItem(STORAGE_KEY));
  afterEach(() => window.localStorage.removeItem(STORAGE_KEY));

  it("starts enabled by real default", async () => {
    const { getAutomationPreferences } = await freshModule();
    expect(getAutomationPreferences()).toEqual({ enabled: true });
  });

  it("setAutomationEnabled applies a real change, persists it, and notifies", async () => {
    const { setAutomationEnabled, getAutomationPreferences, subscribeToAutomationPreferences } = await freshModule();
    const listener = vi.fn();
    subscribeToAutomationPreferences(listener);
    setAutomationEnabled(false);
    expect(getAutomationPreferences().enabled).toBe(false);
    expect(listener).toHaveBeenCalledOnce();
  });

  it("setting to the current real value is a no-op — never a spurious notify", async () => {
    const { setAutomationEnabled, subscribeToAutomationPreferences } = await freshModule();
    const listener = vi.fn();
    subscribeToAutomationPreferences(listener);
    setAutomationEnabled(true); // already true by default
    expect(listener).not.toHaveBeenCalled();
  });

  it("persists across a simulated refresh", async () => {
    const first = await freshModule();
    first.setAutomationEnabled(false);
    const second = await freshModule();
    expect(second.getAutomationPreferences().enabled).toBe(false);
  });

  it("a corrupted stored value falls back to the honest enabled default rather than throwing", async () => {
    window.localStorage.setItem(STORAGE_KEY, "{not valid json");
    const { getAutomationPreferences } = await freshModule();
    expect(() => getAutomationPreferences()).not.toThrow();
    expect(getAutomationPreferences()).toEqual({ enabled: true });
  });

  it("a mismatched real version falls back to the honest default rather than trusting stale data", async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 999, preferences: { enabled: false } }));
    const { getAutomationPreferences } = await freshModule();
    expect(getAutomationPreferences()).toEqual({ enabled: true });
  });
});
