"use client";

/**
 * V3-WALLET-003 — the one hook every UI consumer of wallet-holdings
 * intelligence goes through, the same "component never computes, only
 * renders what a hook already computed" rule `usePersonalizedDashboard()`
 * already establishes for the watchlist-based Portfolio Intelligence.
 * Named `useWalletPortfolioIntelligence`, not `usePortfolioIntelligence` —
 * that name is already taken by `lib/portfolio/`'s watchlist-based hook;
 * picking a different name keeps both unambiguous at every call site.
 *
 * Wraps `usePortfolio()` (V3-WALLET-002) — never fetches balances or prices
 * itself. The `buildPortfolioIntelligence` call is memoized on the exact
 * primitive/array fields that can actually change (`assets`, `totalValue`,
 * `lastUpdated`), so a re-render that doesn't change any of those (e.g. a
 * sibling widget's own state update) never recomputes the engine — matching
 * `lib/hooks/usePersonalizedDashboard.ts:74-97`'s established `useMemo`
 * convention (found during this feature's required investigation).
 */

import { useMemo } from "react";

import { usePortfolio } from "@/lib/hooks/usePortfolio";
import { buildPortfolioIntelligence } from "@/lib/portfolio-intelligence/engine";
import type { PortfolioIntelligence } from "@/lib/portfolio-intelligence/types";

export type UseWalletPortfolioIntelligenceResult = {
  intelligence: PortfolioIntelligence | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  chainSupported: boolean;
  partial: boolean;
  refresh: () => void;
};

export function useWalletPortfolioIntelligence(): UseWalletPortfolioIntelligenceResult {
  const { assets, totalValue, loading, refreshing, error, chainSupported, partial, lastUpdated, refresh } = usePortfolio();

  const intelligence = useMemo(() => {
    if (assets.length === 0 || !lastUpdated) return null;
    return buildPortfolioIntelligence(assets, totalValue, lastUpdated);
  }, [assets, totalValue, lastUpdated]);

  return { intelligence, loading, refreshing, error, chainSupported, partial, refresh };
}
