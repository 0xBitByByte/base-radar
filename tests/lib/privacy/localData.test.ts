import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { clearAllLocalData, getTotalLocalDataSizeBytes, listLocalDataEntries } from "@/lib/privacy/localData";

describe("Local data privacy inventory", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => window.localStorage.clear());

  it("listLocalDataEntries returns an honest empty list when nothing real is stored", () => {
    expect(listLocalDataEntries()).toEqual([]);
  });

  it("lists real base-radar:-prefixed keys with their real, measured byte sizes", () => {
    window.localStorage.setItem("base-radar:account", JSON.stringify({ a: 1 }));
    window.localStorage.setItem("base-radar:personalization", JSON.stringify({ b: 2 }));
    const entries = listLocalDataEntries();
    expect(entries).toHaveLength(2);
    expect(entries.every((e) => e.sizeBytes > 0)).toBe(true);
  });

  it("never includes a real key outside the base-radar: prefix — wagmi's own connection state and next-themes' theme key stay untouched", () => {
    window.localStorage.setItem("base-radar:account", "{}");
    window.localStorage.setItem("wagmi.store", "{}");
    window.localStorage.setItem("theme", "dark");
    const keys = listLocalDataEntries().map((e) => e.key);
    expect(keys).toEqual(["base-radar:account"]);
  });

  it("sorts entries alphabetically for a stable, readable order", () => {
    window.localStorage.setItem("base-radar:zeta", "{}");
    window.localStorage.setItem("base-radar:alpha", "{}");
    expect(listLocalDataEntries().map((e) => e.key)).toEqual(["base-radar:alpha", "base-radar:zeta"]);
  });

  it("getTotalLocalDataSizeBytes sums the real, measured sizes of every real entry", () => {
    window.localStorage.setItem("base-radar:a", "12345");
    window.localStorage.setItem("base-radar:b", "67");
    const entries = listLocalDataEntries();
    const expectedTotal = entries.reduce((sum, e) => sum + e.sizeBytes, 0);
    expect(getTotalLocalDataSizeBytes()).toBe(expectedTotal);
    expect(getTotalLocalDataSizeBytes()).toBeGreaterThan(0);
  });

  describe("clearAllLocalData", () => {
    it("removes every real base-radar: key and returns exactly the real keys removed", () => {
      window.localStorage.setItem("base-radar:account", "{}");
      window.localStorage.setItem("base-radar:personalization", "{}");
      const removed = clearAllLocalData();
      expect(new Set(removed)).toEqual(new Set(["base-radar:account", "base-radar:personalization"]));
      expect(listLocalDataEntries()).toEqual([]);
    });

    it("never touches a real key outside the base-radar: prefix", () => {
      window.localStorage.setItem("base-radar:account", "{}");
      window.localStorage.setItem("wagmi.store", "real-wallet-state");
      window.localStorage.setItem("theme", "dark");
      clearAllLocalData();
      expect(window.localStorage.getItem("wagmi.store")).toBe("real-wallet-state");
      expect(window.localStorage.getItem("theme")).toBe("dark");
    });

    it("clearing an already-empty footprint is honest — returns a real empty array, never a fabricated list", () => {
      expect(clearAllLocalData()).toEqual([]);
    });

    it("is idempotent — calling twice in a row never throws", () => {
      window.localStorage.setItem("base-radar:account", "{}");
      clearAllLocalData();
      expect(() => clearAllLocalData()).not.toThrow();
    });
  });
});
