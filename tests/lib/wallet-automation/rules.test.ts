import { beforeEach, describe, expect, it } from "vitest";

import {
  DEFAULT_WALLET_AUTOMATION_RULES,
  getWalletAutomationRules,
  resetWalletAutomationRules,
  setWalletRuleEnabled,
} from "@/lib/wallet-automation/rules";
import { WALLET_RULE_IDS } from "@/lib/wallet-automation/types";

const STORAGE_KEY = "base-radar:wallet-automation-rule-state";

describe("Wallet automation rule persistence", () => {
  beforeEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    resetWalletAutomationRules();
  });

  it("ships exactly 11 default rules (V4-AUTOMATION-001's 5 smart rules added to the original 6), all enabled, matching WALLET_RULE_IDS", () => {
    expect(DEFAULT_WALLET_AUTOMATION_RULES).toHaveLength(11);
    expect(DEFAULT_WALLET_AUTOMATION_RULES.every((rule) => rule.enabled)).toBe(true);
    expect(new Set(DEFAULT_WALLET_AUTOMATION_RULES.map((rule) => rule.id))).toEqual(new Set(WALLET_RULE_IDS));
  });

  it("disabling a rule persists across a simulated reload (new localStorage read)", () => {
    setWalletRuleEnabled("wallet-rule:concentration", false);
    expect(getWalletAutomationRules().find((r) => r.id === "wallet-rule:concentration")?.enabled).toBe(false);

    const raw = window.localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.enabledByRuleId["wallet-rule:concentration"]).toBe(false);
  });

  it("does not affect other rules when one is disabled", () => {
    setWalletRuleEnabled("wallet-rule:concentration", false);
    const rules = getWalletAutomationRules();
    expect(rules.find((r) => r.id === "wallet-rule:stablecoin")?.enabled).toBe(true);
  });

  it("resetWalletAutomationRules reverts every override back to its own default", () => {
    setWalletRuleEnabled("wallet-rule:concentration", false);
    setWalletRuleEnabled("wallet-rule:health", false);
    resetWalletAutomationRules();
    const rules = getWalletAutomationRules();
    expect(rules.every((r) => r.enabled)).toBe(true);
  });

  it("ignores an unknown rule id rather than throwing or corrupting state", () => {
    expect(() => setWalletRuleEnabled("wallet-rule:not-real", false)).not.toThrow();
    expect(getWalletAutomationRules()).toEqual(DEFAULT_WALLET_AUTOMATION_RULES);
  });
});
