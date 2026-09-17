import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";

import { useWalletAutomationRules } from "@/lib/hooks/useWalletAutomationRules";
import { DEFAULT_WALLET_AUTOMATION_RULES, resetWalletAutomationRules, setWalletRuleEnabled } from "@/lib/wallet-automation/rules";

const STORAGE_KEY = "base-radar:wallet-automation-rule-state";
const RULE_ID = "wallet-rule:concentration";

// lib/wallet-automation/rules.ts's own read/write/enable/disable/reset/
// corruption-recovery/persistence behavior is already covered in
// tests/lib/wallet-automation/rules.test.ts — this file is scoped to the
// React binding's OWN responsibility only, the exact same convention
// tests/lib/hooks/useAutomationPreferences.test.tsx and
// tests/lib/hooks/useAutomationRules.test.tsx already establish for this
// identical "thin useSyncExternalStore wrapper over an already-tested
// module" hook shape — useWalletAutomationRules.ts is structurally
// byte-for-byte the same as useAutomationRules.ts, just wired to the
// wallet-scoped rules module instead of the watchlist-scoped one.
describe("useWalletAutomationRules", () => {
  beforeEach(() => window.localStorage.removeItem(STORAGE_KEY));
  afterEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    // lib/wallet-automation/rules.ts caches its merged rule list at module
    // scope, which (unlike localStorage) survives across `it()` blocks
    // within this same file — reset it back to the real defaults so every
    // test starts from a genuinely clean state regardless of execution
    // order.
    resetWalletAutomationRules();
  });

  it("starts with the real default wallet automation rules, every one enabled", () => {
    const { result } = renderHook(() => useWalletAutomationRules());
    expect(result.current.rules).toEqual(DEFAULT_WALLET_AUTOMATION_RULES);
  });

  it("returns all 11 real wallet rules, including the 5 later-added smart-tier ones", () => {
    const { result } = renderHook(() => useWalletAutomationRules());
    expect(result.current.rules).toHaveLength(11);
    expect(result.current.rules.map((rule) => rule.id)).toContain("wallet-rule:top-warning");
  });

  it("setEnabled(ruleId, false) applies a real change to exactly the targeted rule, visible on the next render", () => {
    const { result } = renderHook(() => useWalletAutomationRules());
    act(() => result.current.setEnabled(RULE_ID, false));

    const target = result.current.rules.find((rule) => rule.id === RULE_ID)!;
    expect(target.enabled).toBe(false);
    expect(result.current.rules.filter((rule) => rule.id !== RULE_ID).every((rule) => rule.enabled)).toBe(true);
  });

  it("setEnabled(ruleId, true) genuinely re-enables after a real disable", () => {
    const { result } = renderHook(() => useWalletAutomationRules());
    act(() => result.current.setEnabled(RULE_ID, false));
    act(() => result.current.setEnabled(RULE_ID, true));

    expect(result.current.rules.find((rule) => rule.id === RULE_ID)!.enabled).toBe(true);
  });

  it("reset() restores every rule to its own real default after multiple real changes", () => {
    const { result } = renderHook(() => useWalletAutomationRules());
    act(() => result.current.setEnabled(RULE_ID, false));
    act(() => result.current.setEnabled("wallet-rule:health", false));

    act(() => result.current.reset());
    expect(result.current.rules.every((rule) => rule.enabled)).toBe(true);
  });

  it("exposes the real setWalletRuleEnabled and resetWalletAutomationRules functions directly — never wrapped copies", () => {
    const { result } = renderHook(() => useWalletAutomationRules());
    expect(result.current.setEnabled).toBe(setWalletRuleEnabled);
    expect(result.current.reset).toBe(resetWalletAutomationRules);
  });

  it("two hook instances stay in sync — a real change from one is visible in the other", () => {
    const a = renderHook(() => useWalletAutomationRules());
    const b = renderHook(() => useWalletAutomationRules());
    act(() => a.result.current.setEnabled(RULE_ID, false));
    expect(b.result.current.rules.find((rule) => rule.id === RULE_ID)!.enabled).toBe(false);
  });

  it("a change made through the hook is also visible through the underlying module directly — the hook is a real binding, not a shadow copy of the state", async () => {
    const { getWalletAutomationRules } = await import("@/lib/wallet-automation/rules");
    const { result } = renderHook(() => useWalletAutomationRules());
    act(() => result.current.setEnabled(RULE_ID, false));
    expect(getWalletAutomationRules().find((rule) => rule.id === RULE_ID)!.enabled).toBe(false);
  });

  it("rules stays the exact same reference across an unrelated re-render — real memoization, not rebuilt on every call", () => {
    const { result, rerender } = renderHook(() => useWalletAutomationRules());
    const before = result.current.rules;
    rerender();
    expect(result.current.rules).toBe(before);
  });

  it("unmounting cleanly unsubscribes — a later real change never throws or affects an unmounted hook instance", () => {
    const { result, unmount } = renderHook(() => useWalletAutomationRules());
    unmount();
    expect(() => setWalletRuleEnabled(RULE_ID, false)).not.toThrow();
    // The unmounted instance's last-known value is untouched — proving the
    // subscription genuinely stopped rather than silently still updating a
    // detached instance.
    expect(result.current.rules.find((rule) => rule.id === RULE_ID)!.enabled).toBe(true);
  });

  it("PR-096.05 hydration safety: the server-rendered snapshot never reads live localStorage, even when a real, non-default rule state already exists there — a getServerSnapshot that read localStorage instead of the fixed defaults would mismatch real server HTML and produce a hydration error", () => {
    setWalletRuleEnabled(RULE_ID, false);

    function Probe() {
      const { rules } = useWalletAutomationRules();
      const target = rules.find((rule) => rule.id === RULE_ID)!;
      return <span>{target.enabled ? "Enabled" : "Disabled"}</span>;
    }

    const html = renderToString(<Probe />);
    expect(html.replace(/<!--\s*-->/g, "")).toContain("Enabled");
  });
});
