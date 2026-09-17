import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const STORAGE_KEY = "base-radar:research-history";

async function freshModule() {
  vi.resetModules();
  return import("@/lib/research-history/storage");
}

describe("Research history storage (Recently Viewed Projects)", () => {
  beforeEach(() => window.localStorage.removeItem(STORAGE_KEY));
  afterEach(() => window.localStorage.removeItem(STORAGE_KEY));

  it("starts with an honest empty list — never fabricated history", async () => {
    const { getRecentlyViewed } = await freshModule();
    expect(getRecentlyViewed()).toEqual([]);
  });

  it("recordProjectView adds a real entry with a real current timestamp", async () => {
    const { recordProjectView, getRecentlyViewed } = await freshModule();
    recordProjectView("aave", "Aave", "aave");
    const entries = getRecentlyViewed();
    expect(entries).toHaveLength(1);
    expect(entries[0].projectId).toBe("aave");
    expect(entries[0].projectName).toBe("Aave");
    expect(Date.parse(entries[0].viewedAt)).not.toBeNaN();
  });

  it("most-recently-viewed first", async () => {
    const { recordProjectView, getRecentlyViewed } = await freshModule();
    recordProjectView("aave", "Aave", "aave");
    recordProjectView("compound", "Compound", "compound");
    expect(getRecentlyViewed().map((e) => e.projectId)).toEqual(["compound", "aave"]);
  });

  it("re-viewing an already-recorded project moves it to the front with a fresh timestamp — never a duplicate entry", async () => {
    const { recordProjectView, getRecentlyViewed } = await freshModule();
    recordProjectView("aave", "Aave", "aave");
    recordProjectView("compound", "Compound", "compound");
    recordProjectView("aave", "Aave", "aave");
    const entries = getRecentlyViewed();
    expect(entries.map((e) => e.projectId)).toEqual(["aave", "compound"]);
    expect(entries.filter((e) => e.projectId === "aave")).toHaveLength(1);
  });

  it("caps at MAX_ENTRIES (20), dropping the oldest real entry, never silently growing forever", async () => {
    const { recordProjectView, getRecentlyViewed } = await freshModule();
    for (let i = 0; i < 25; i++) recordProjectView(`project-${i}`, `Project ${i}`, `project-${i}`);
    const entries = getRecentlyViewed();
    expect(entries).toHaveLength(20);
    expect(entries[0].projectId).toBe("project-24"); // most recent survives
    expect(entries.some((e) => e.projectId === "project-0")).toBe(false); // oldest dropped
  });

  it("persists real entries across a simulated refresh", async () => {
    const first = await freshModule();
    first.recordProjectView("aave", "Aave", "aave");
    const second = await freshModule();
    expect(second.getRecentlyViewed().map((e) => e.projectId)).toEqual(["aave"]);
  });

  it("clearRecentlyViewed empties the real list and persists the reset", async () => {
    const first = await freshModule();
    first.recordProjectView("aave", "Aave", "aave");
    first.clearRecentlyViewed();
    expect(first.getRecentlyViewed()).toEqual([]);

    const second = await freshModule();
    expect(second.getRecentlyViewed()).toEqual([]);
  });

  it("a corrupted stored value falls back to the honest empty default rather than throwing", async () => {
    window.localStorage.setItem(STORAGE_KEY, "{not valid json");
    const { getRecentlyViewed } = await freshModule();
    expect(() => getRecentlyViewed()).not.toThrow();
    expect(getRecentlyViewed()).toEqual([]);
  });

  it("a mismatched real version falls back to the honest empty default", async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 999, entries: [{ projectId: "aave", projectName: "Aave", projectSlug: "aave", viewedAt: "2026-01-01T00:00:00.000Z" }] }));
    const { getRecentlyViewed } = await freshModule();
    expect(getRecentlyViewed()).toEqual([]);
  });

  it("subscribers are notified on record and clear, and stop after unsubscribing", async () => {
    const { recordProjectView, clearRecentlyViewed, subscribe } = await freshModule();
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);
    recordProjectView("aave", "Aave", "aave");
    expect(listener).toHaveBeenCalledTimes(1);
    clearRecentlyViewed();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    recordProjectView("compound", "Compound", "compound");
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("clearing an already-empty list is a real no-op — never a spurious notify", async () => {
    const { clearRecentlyViewed, subscribe } = await freshModule();
    const listener = vi.fn();
    subscribe(listener);
    clearRecentlyViewed();
    expect(listener).not.toHaveBeenCalled();
  });
});
