import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const STORAGE_KEY = "base-radar:compare";

/** Same "simulated browser refresh" technique `tests/lib/ai-watch/storage.test.ts` established — resets `lib/compare/storage.ts`'s module-scope cache while leaving real jsdom `localStorage` untouched. */
async function freshStorageModule() {
  vi.resetModules();
  return import("@/lib/compare/storage");
}

describe("Compare storage — persistence across a simulated browser refresh", () => {
  beforeEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
  });
  afterEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
  });

  it("a fresh install starts with an empty list — never a fabricated selection", async () => {
    const mod = await freshStorageModule();
    expect(mod.getCompareState()).toEqual({ projectIds: [] });
  });

  it("adding a project persists across a refresh", async () => {
    const first = await freshStorageModule();
    first.addToCompare("aave");
    expect(first.getCompareState().projectIds).toEqual(["aave"]);

    const second = await freshStorageModule();
    expect(second.getCompareState().projectIds).toEqual(["aave"]);
  });

  it("preserves insertion order across multiple adds", async () => {
    const mod = await freshStorageModule();
    mod.addToCompare("aave");
    mod.addToCompare("compound");
    mod.addToCompare("uniswap");
    expect(mod.getCompareState().projectIds).toEqual(["aave", "compound", "uniswap"]);
  });

  it("never adds the same project twice", async () => {
    const mod = await freshStorageModule();
    mod.addToCompare("aave");
    mod.addToCompare("aave");
    expect(mod.getCompareState().projectIds).toEqual(["aave"]);
  });

  it("refuses to add past MAX_COMPARE_PROJECTS", async () => {
    const mod = await freshStorageModule();
    const { MAX_COMPARE_PROJECTS } = await import("@/lib/compare/types");
    for (let i = 0; i < MAX_COMPARE_PROJECTS + 2; i++) mod.addToCompare(`project-${i}`);
    expect(mod.getCompareState().projectIds).toHaveLength(MAX_COMPARE_PROJECTS);
  });

  it("removeFromCompare removes exactly the given project and persists the removal", async () => {
    const first = await freshStorageModule();
    first.addToCompare("aave");
    first.addToCompare("compound");
    first.removeFromCompare("aave");
    expect(first.getCompareState().projectIds).toEqual(["compound"]);

    const second = await freshStorageModule();
    expect(second.getCompareState().projectIds).toEqual(["compound"]);
  });

  it("clearCompare empties the list and persists the reset", async () => {
    const first = await freshStorageModule();
    first.addToCompare("aave");
    first.addToCompare("compound");
    first.clearCompare();
    expect(first.getCompareState()).toEqual({ projectIds: [] });

    const second = await freshStorageModule();
    expect(second.getCompareState()).toEqual({ projectIds: [] });
  });

  it("a corrupted stored value falls back to the honest empty default rather than throwing", async () => {
    window.localStorage.setItem(STORAGE_KEY, "{not valid json");
    const mod = await freshStorageModule();
    expect(() => mod.getCompareState()).not.toThrow();
    expect(mod.getCompareState()).toEqual({ projectIds: [] });
  });

  it("an older/foreign version envelope falls back to the honest empty default", async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 999, state: { projectIds: ["aave"] } }));
    const mod = await freshStorageModule();
    expect(mod.getCompareState()).toEqual({ projectIds: [] });
  });

  it("subscribers are notified on add, remove, and clear", async () => {
    const mod = await freshStorageModule();
    const listener = vi.fn();
    mod.subscribe(listener);

    mod.addToCompare("aave");
    expect(listener).toHaveBeenCalledTimes(1);

    mod.removeFromCompare("aave");
    expect(listener).toHaveBeenCalledTimes(2);

    mod.addToCompare("aave");
    mod.clearCompare();
    expect(listener).toHaveBeenCalledTimes(4);
  });

  it("a no-op call (removing a project not in the list, re-adding a duplicate) never notifies subscribers", async () => {
    const mod = await freshStorageModule();
    mod.addToCompare("aave");
    const listener = vi.fn();
    mod.subscribe(listener);

    mod.addToCompare("aave");
    mod.removeFromCompare("not-in-list");
    expect(listener).not.toHaveBeenCalled();
  });
});
