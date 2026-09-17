import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";

import { useRecentlyViewed } from "@/lib/hooks/useRecentlyViewed";
import { recordProjectView } from "@/lib/research-history/storage";

const STORAGE_KEY = "base-radar:research-history";

describe("useRecentlyViewed", () => {
  beforeEach(() => window.localStorage.removeItem(STORAGE_KEY));
  afterEach(() => window.localStorage.removeItem(STORAGE_KEY));

  it("starts with an honest empty list", () => {
    const { result } = renderHook(() => useRecentlyViewed());
    expect(result.current.entries).toEqual([]);
  });

  it("recordView adds a real entry visible on the next render", () => {
    const { result } = renderHook(() => useRecentlyViewed());
    act(() => result.current.recordView("aave", "Aave", "aave"));
    expect(result.current.entries.map((e) => e.projectId)).toEqual(["aave"]);
  });

  it("clear empties the real list", () => {
    const { result } = renderHook(() => useRecentlyViewed());
    act(() => result.current.recordView("aave", "Aave", "aave"));
    act(() => result.current.clear());
    expect(result.current.entries).toEqual([]);
  });

  it("two hook instances stay in sync — a change from one is visible in the other", () => {
    const a = renderHook(() => useRecentlyViewed());
    const b = renderHook(() => useRecentlyViewed());
    act(() => a.result.current.recordView("aave", "Aave", "aave"));
    expect(b.result.current.entries.map((e) => e.projectId)).toEqual(["aave"]);
  });

  it("PR-090.07-established hydration safety: the server-rendered snapshot never reads live localStorage, even when real viewed-project history already exists (which real SSR, with no `window`, could never see) — a `useSyncExternalStore` server-snapshot function that read localStorage instead of a fixed default would mismatch the real server HTML and produce a hydration error", () => {
    recordProjectView("aave", "Aave", "aave");

    function Probe() {
      const { entries } = useRecentlyViewed();
      return <span>{entries.length} recently viewed</span>;
    }

    const html = renderToString(<Probe />);
    expect(html.replace(/<!--\s*-->/g, "")).toContain("0 recently viewed");
  });
});
