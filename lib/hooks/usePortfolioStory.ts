"use client";

/**
 * V4-FUTURE-002 (Feature 5 — Portfolio Story Mode) — the one hook every
 * Story Mode UI surface reads through. Builds an "all"-period
 * `HistoricalReport` (the wallet's whole recorded history, not a rolling
 * window like `useMonthlyDigest()`'s 30-day report) via the SAME
 * `buildHistoricalReport()` every other Wallet surface already calls, then
 * hands it to `buildPortfolioStory()` — never a second report/correlation
 * computation.
 */

import { useMemo } from "react";

import { useWalletPortfolioIntelligence } from "@/lib/hooks/useWalletPortfolioIntelligence";
import { useWalletPortfolioAI } from "@/lib/hooks/useWalletPortfolioAI";
import { useWalletAnalytics } from "@/lib/hooks/useWalletAnalytics";
import { useCrossFeatureIntelligence } from "@/lib/hooks/useCrossFeatureIntelligence";
import { buildPortfolioStory } from "@/lib/portfolio-story/engine";
import type { PortfolioStory } from "@/lib/portfolio-story/types";
import { buildHistoricalReport } from "@/components/wallet/walletReportEngine";

export function usePortfolioStory(): PortfolioStory | null {
  const { intelligence } = useWalletPortfolioIntelligence();
  const { ai } = useWalletPortfolioAI();
  const { analytics, history } = useWalletAnalytics();
  const crossFeature = useCrossFeatureIntelligence();

  const report = useMemo(() => buildHistoricalReport(history, analytics, "all"), [history, analytics]);

  return useMemo(() => buildPortfolioStory(report, analytics, intelligence, ai, crossFeature), [report, analytics, intelligence, ai, crossFeature]);
}
