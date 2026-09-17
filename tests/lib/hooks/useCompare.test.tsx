import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";

import { useCompare } from "@/lib/hooks/useCompare";
import { addToCompare, clearCompare } from "@/lib/compare/storage";
import { MAX_COMPARE_PROJECTS } from "@/lib/compare/types";

const STORAGE_KEY = "base-radar:compare";

describe("useCompare", () => {
  beforeEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    clearCompare();
  });
  afterEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    clearCompare();
  });

  it("starts empty — never a fabricated selection", () => {
    const { result } = renderHook(() => useCompare());
    expect(result.current.projectIds).toEqual([]);
    expect(result.current.count).toBe(0);
    expect(result.current.isFull).toBe(false);
  });

  it("toggle adds a project not yet in the list", () => {
    const { result } = renderHook(() => useCompare());
    act(() => result.current.toggle("aave"));
    expect(result.current.projectIds).toEqual(["aave"]);
    expect(result.current.isComparing("aave")).toBe(true);
  });

  it("toggle removes a project already in the list", () => {
    const { result } = renderHook(() => useCompare());
    act(() => result.current.toggle("aave"));
    act(() => result.current.toggle("aave"));
    expect(result.current.projectIds).toEqual([]);
    expect(result.current.isComparing("aave")).toBe(false);
  });

  it("isFull becomes true at MAX_COMPARE_PROJECTS and toggle on a new id is then a no-op", () => {
    const { result } = renderHook(() => useCompare());
    act(() => {
      for (let i = 0; i < MAX_COMPARE_PROJECTS; i++) result.current.toggle(`project-${i}`);
    });
    expect(result.current.isFull).toBe(true);

    act(() => result.current.toggle("one-too-many"));
    expect(result.current.projectIds).toHaveLength(MAX_COMPARE_PROJECTS);
    expect(result.current.isComparing("one-too-many")).toBe(false);
  });

  it("isFull does not block toggling OFF an already-selected project", () => {
    const { result } = renderHook(() => useCompare());
    act(() => {
      for (let i = 0; i < MAX_COMPARE_PROJECTS; i++) result.current.toggle(`project-${i}`);
    });
    act(() => result.current.remove("project-0"));
    expect(result.current.projectIds).toHaveLength(MAX_COMPARE_PROJECTS - 1);
    expect(result.current.isFull).toBe(false);
  });

  it("clear empties the whole list", () => {
    const { result } = renderHook(() => useCompare());
    act(() => {
      result.current.toggle("aave");
      result.current.toggle("compound");
    });
    act(() => result.current.clear());
    expect(result.current.projectIds).toEqual([]);
  });

  it("two hook instances stay in sync — a change from one is visible in the other", () => {
    const a = renderHook(() => useCompare());
    const b = renderHook(() => useCompare());
    act(() => a.result.current.toggle("aave"));
    expect(b.result.current.projectIds).toEqual(["aave"]);
  });

  it("PR-090.07-established hydration safety: the server-rendered snapshot never reads live localStorage, even when a real non-empty Compare list already exists (which real SSR, with no `window`, could never see) — a `useSyncExternalStore` server-snapshot function that read localStorage instead of a fixed default would mismatch the real server HTML and produce a hydration error", () => {
    addToCompare("aave");
    addToCompare("compound");

    function Probe() {
      const { count } = useCompare();
      return <span>{count} selected</span>;
    }

    const html = renderToString(<Probe />);
    expect(html).not.toContain("2 selected");
    expect(html.replace(/<!--\s*-->/g, "")).toContain("0 selected");
  });
});
