"use client";

/**
 * React binding for `lib/wallet-automation/rules.ts`'s rule-state overlay —
 * the exact same `useSyncExternalStore` shape `useAutomationRules.ts` uses
 * for the watchlist-based rules.
 */

import { useSyncExternalStore } from "react";

import {
  DEFAULT_WALLET_AUTOMATION_RULES,
  getWalletAutomationRules,
  resetWalletAutomationRules,
  setWalletRuleEnabled,
  subscribeToWalletAutomationRules,
} from "@/lib/wallet-automation/rules";

function getServerSnapshot() {
  return DEFAULT_WALLET_AUTOMATION_RULES;
}

export function useWalletAutomationRules() {
  const rules = useSyncExternalStore(subscribeToWalletAutomationRules, getWalletAutomationRules, getServerSnapshot);

  return {
    rules,
    setEnabled: setWalletRuleEnabled,
    reset: resetWalletAutomationRules,
  };
}
