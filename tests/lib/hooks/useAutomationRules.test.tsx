import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";

import { useAutomationRules } from "@/lib/hooks/useAutomationRules";
import { DEFAULT_AUTOMATION_RULES, resetAutomationRules, setRuleEnabled } from "@/lib/automation/rules";

const STORAGE_KEY = "base-radar:automation-rule-state";
const RULE_ID = "rule:critical-security";

// lib/automation/rules.ts's own read/write/enable/disable/reset/
// corruption-recovery/persistence behavior is already thoroughly covered
// in tests/lib/automation/rules.test.ts — this file is scoped to the React
// binding's OWN responsibility only, the same convention
// tests/lib/hooks/useAutomationPreferences.test.tsx already establishes
// for an identical-shape "thin useSyncExternalStore wrapper over an
// already-tested module" hook.
describe("useAutomationRules", () => {
  beforeEach(() => window.localStorage.removeItem(STORAGE_KEY));
  afterEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    // lib/automation/rules.ts caches its merged rule list at module scope,
    // which (unlike localStorage) survives across `it()` blocks within
    // this same file — reset it back to the real defaults so every test
    // starts from a genuinely clean state regardless of execution order.
    resetAutomationRules();
  });

  it("starts with the real default rules, every one enabled", () => {
    const { result } = renderHook(() => useAutomationRules());
    expect(result.current.rules).toEqual(DEFAULT_AUTOMATION_RULES);
  });

  it("setEnabled(ruleId, false) applies a real change to exactly the targeted rule, visible on the next render", () => {
    const { result } = renderHook(() => useAutomationRules());
    act(() => result.current.setEnabled(RULE_ID, false));

    const target = result.current.rules.find((rule) => rule.id === RULE_ID)!;
    expect(target.enabled).toBe(false);
    expect(result.current.rules.filter((rule) => rule.id !== RULE_ID).every((rule) => rule.enabled)).toBe(true);
  });

  it("setEnabled(ruleId, true) genuinely re-enables after a real disable", () => {
    const { result } = renderHook(() => useAutomationRules());
    act(() => result.current.setEnabled(RULE_ID, false));
    act(() => result.current.setEnabled(RULE_ID, true));

    expect(result.current.rules.find((rule) => rule.id === RULE_ID)!.enabled).toBe(true);
  });

  it("reset() restores every rule to its own real default after multiple real changes", () => {
    const { result } = renderHook(() => useAutomationRules());
    act(() => result.current.setEnabled(RULE_ID, false));
    act(() => result.current.setEnabled("rule:daily-brief", false));

    act(() => result.current.reset());
    expect(result.current.rules.every((rule) => rule.enabled)).toBe(true);
  });

  it("exposes the real setRuleEnabled and resetAutomationRules functions directly — never wrapped copies — matching this hook's own documented 'components never import lib/automation/rules.ts directly' contract", () => {
    const { result } = renderHook(() => useAutomationRules());
    expect(result.current.setEnabled).toBe(setRuleEnabled);
    expect(result.current.reset).toBe(resetAutomationRules);
  });

  it("two hook instances stay in sync — a real change from one is visible in the other", () => {
    const a = renderHook(() => useAutomationRules());
    const b = renderHook(() => useAutomationRules());
    act(() => a.result.current.setEnabled(RULE_ID, false));
    expect(b.result.current.rules.find((rule) => rule.id === RULE_ID)!.enabled).toBe(false);
  });

  it("a change made through the hook is also visible through the underlying module directly — the hook is a real binding, not a shadow copy of the state", async () => {
    const { getAutomationRules } = await import("@/lib/automation/rules");
    const { result } = renderHook(() => useAutomationRules());
    act(() => result.current.setEnabled(RULE_ID, false));
    expect(getAutomationRules().find((rule) => rule.id === RULE_ID)!.enabled).toBe(false);
  });

  it("rules stays the exact same reference across an unrelated re-render — real memoization, not rebuilt on every call", () => {
    const { result, rerender } = renderHook(() => useAutomationRules());
    const before = result.current.rules;
    rerender();
    expect(result.current.rules).toBe(before);
  });

  it("unmounting cleanly unsubscribes — a later real change never throws or affects an unmounted hook instance", () => {
    const { result, unmount } = renderHook(() => useAutomationRules());
    unmount();
    expect(() => setRuleEnabled(RULE_ID, false)).not.toThrow();
    // The unmounted instance's last-known value is untouched — proving the
    // subscription genuinely stopped rather than silently still updating a
    // detached instance.
    expect(result.current.rules.find((rule) => rule.id === RULE_ID)!.enabled).toBe(true);
  });

  it("PR-096.04 hydration safety: the server-rendered snapshot never reads live localStorage, even when a real, non-default rule state already exists there — a getServerSnapshot that read localStorage instead of the fixed defaults would mismatch real server HTML and produce a hydration error", () => {
    setRuleEnabled(RULE_ID, false);

    function Probe() {
      const { rules } = useAutomationRules();
      const target = rules.find((rule) => rule.id === RULE_ID)!;
      return <span>{target.enabled ? "Enabled" : "Disabled"}</span>;
    }

    const html = renderToString(<Probe />);
    expect(html.replace(/<!--\s*-->/g, "")).toContain("Enabled");
  });
});
