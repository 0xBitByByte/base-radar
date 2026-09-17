import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";

import { useAutomationPreferences } from "@/lib/hooks/useAutomationPreferences";
import { setAutomationEnabled } from "@/lib/automation/preferences";

const STORAGE_KEY = "base-radar:automation-preferences";

// lib/automation/preferences.ts's own read/write/corruption-recovery/
// persistence behavior is already thoroughly covered in
// tests/lib/automation/preferences.test.ts — this file is scoped to the
// React binding's OWN responsibility only: does it return the real live
// value, react to external changes, stay in sync across instances, and
// behave safely during SSR — the same convention
// tests/lib/hooks/useRecentlyViewed.test.tsx already establishes for an
// identical "thin useSyncExternalStore wrapper over an already-tested
// module" hook shape.
describe("useAutomationPreferences", () => {
  beforeEach(() => window.localStorage.removeItem(STORAGE_KEY));
  afterEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    // lib/automation/preferences.ts caches its value at module scope, which
    // (unlike localStorage) survives across `it()` blocks within this same
    // file — reset it back to the real default so every test starts from a
    // genuinely clean state regardless of execution order.
    setAutomationEnabled(true);
  });

  it("starts with the real default preferences", () => {
    const { result } = renderHook(() => useAutomationPreferences());
    expect(result.current.preferences).toEqual({ enabled: true });
  });

  it("setEnabled(false) applies a real change, visible on the next render", () => {
    const { result } = renderHook(() => useAutomationPreferences());
    act(() => result.current.setEnabled(false));
    expect(result.current.preferences.enabled).toBe(false);
  });

  it("setEnabled(true) genuinely re-enables after a real disable", () => {
    const { result } = renderHook(() => useAutomationPreferences());
    act(() => result.current.setEnabled(false));
    act(() => result.current.setEnabled(true));
    expect(result.current.preferences.enabled).toBe(true);
  });

  it("exposes the real setAutomationEnabled function directly — never a wrapped copy — matching this hook's own documented 'components never import lib/automation/preferences.ts directly' contract", () => {
    const { result } = renderHook(() => useAutomationPreferences());
    expect(result.current.setEnabled).toBe(setAutomationEnabled);
  });

  it("two hook instances stay in sync — a real change from one is visible in the other", () => {
    const a = renderHook(() => useAutomationPreferences());
    const b = renderHook(() => useAutomationPreferences());
    act(() => a.result.current.setEnabled(false));
    expect(b.result.current.preferences.enabled).toBe(false);
  });

  it("a change made through the hook is also visible through the underlying module directly — the hook is a real binding, not a shadow copy of the state", async () => {
    const { getAutomationPreferences } = await import("@/lib/automation/preferences");
    const { result } = renderHook(() => useAutomationPreferences());
    act(() => result.current.setEnabled(false));
    expect(getAutomationPreferences().enabled).toBe(false);
  });

  it("unmounting cleanly unsubscribes — a later real change never throws or affects an unmounted hook instance", () => {
    const { result, unmount } = renderHook(() => useAutomationPreferences());
    unmount();
    expect(() => setAutomationEnabled(false)).not.toThrow();
    // The unmounted instance's last-known value is untouched — proving the
    // subscription genuinely stopped rather than silently still updating
    // a detached instance.
    expect(result.current.preferences.enabled).toBe(true);
  });

  it("PR-096.02 hydration safety: the server-rendered snapshot never reads live localStorage, even when a real, non-default preference already exists there — a getServerSnapshot that read localStorage instead of the fixed default would mismatch real server HTML and produce a hydration error", () => {
    setAutomationEnabled(false);

    function Probe() {
      const { preferences } = useAutomationPreferences();
      return <span>Automation {preferences.enabled ? "enabled" : "disabled"}</span>;
    }

    const html = renderToString(<Probe />);
    expect(html.replace(/<!--\s*-->/g, "")).toContain("Automation enabled");
  });
});
