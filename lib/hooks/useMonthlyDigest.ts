"use client";

/**
 * V4-FUTURE-001 (Monthly Portfolio Digest) — the one hook every Digest UI
 * surface reads through. Builds the SAME "30d" `HistoricalReport` and
 * `CrossFeatureIntelligence` the Wallet page's other panels already build
 * (via `buildHistoricalReport()`/`buildCrossFeatureIntelligence()`), then
 * hands them to `buildMonthlyDigest()` — never a second report/correlation
 * computation.
 */

import { useMemo } from "react";

import { useWalletPortfolioIntelligence } from "@/lib/hooks/useWalletPortfolioIntelligence";
import { useWalletPortfolioAI } from "@/lib/hooks/useWalletPortfolioAI";
import { useWalletAnalytics } from "@/lib/hooks/useWalletAnalytics";
import { useWalletAutomation } from "@/lib/hooks/useWalletAutomation";
import { buildCrossFeatureIntelligence } from "@/lib/cross-feature/engine";
import { buildMonthlyDigest } from "@/lib/monthly-digest/engine";
import type { MonthlyDigest } from "@/lib/monthly-digest/types";
import { buildHistoricalReport } from "@/components/wallet/walletReportEngine";

export function useMonthlyDigest(): MonthlyDigest | null {
  const { intelligence } = useWalletPortfolioIntelligence();
  const { ai } = useWalletPortfolioAI();
  const { analytics, history } = useWalletAnalytics();
  const walletAutomation = useWalletAutomation();

  const report = useMemo(() => buildHistoricalReport(history, analytics, "30d"), [history, analytics]);

  const crossFeature = useMemo(
    () =>
      buildCrossFeatureIntelligence({
        intelligence,
        ai,
        analytics,
        history,
        automationEvents: walletAutomation.events,
        automationResults: walletAutomation.results,
        monthlyReport: report,
      }),
    [intelligence, ai, analytics, history, walletAutomation.events, walletAutomation.results, report]
  );

  return useMemo(() => buildMonthlyDigest(report, analytics, intelligence, ai, crossFeature), [report, analytics, intelligence, ai, crossFeature]);
}
