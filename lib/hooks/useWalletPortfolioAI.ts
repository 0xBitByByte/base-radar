"use client";

/**
 * V4-INTELLIGENCE-003 — the one hook every AI-flavored UI surface (Dashboard's
 * compact read, the Wallet page's Executive Summary/AI Summary/Score
 * Contributors-successor cards) goes through, the same "component never
 * computes, only renders what a hook already computed" rule this app's
 * other `PortfolioIntelligence`/`WalletAutomation` hooks already establish.
 *
 * Wraps `useWalletPortfolioIntelligence()` (the sole source of truth) and
 * `useWalletAutomation()` (the sole source of the real event log the
 * timeline reads) — never fetches anything itself. `buildPortfolioAI` is
 * memoized on `intelligence`'s own reference and `events`, so a re-render
 * that changes neither never recomputes the AI layer.
 */

import { useMemo } from "react";

import { useWalletAutomation } from "@/lib/hooks/useWalletAutomation";
import { useWalletPortfolioIntelligence } from "@/lib/hooks/useWalletPortfolioIntelligence";
import { buildPortfolioAI } from "@/lib/portfolio-ai/engine";
import type { PortfolioAI } from "@/lib/portfolio-ai/types";

export type UseWalletPortfolioAIResult = {
  ai: PortfolioAI | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  chainSupported: boolean;
  partial: boolean;
  refresh: () => void;
};

export function useWalletPortfolioAI(): UseWalletPortfolioAIResult {
  const { intelligence, loading, refreshing, error, chainSupported, partial, refresh } = useWalletPortfolioIntelligence();
  const { events } = useWalletAutomation();

  const ai = useMemo(() => (intelligence ? buildPortfolioAI(intelligence, events) : null), [intelligence, events]);

  return { ai, loading, refreshing, error, chainSupported, partial, refresh };
}
