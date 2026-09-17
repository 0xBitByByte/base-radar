"use client";

/**
 * V4-INTELLIGENCE-003 (Phase 6/7/8) — the one hook every Cross-Feature
 * Intelligence UI surface reads through. Assembles `CrossFeatureInput` from
 * hooks that already exist — the same set `useAIChat()` already assembles,
 * plus `useWalletAnalytics()`'s own `analytics.highlights`/`trends`. No
 * blockchain call, no Analytics/History/Report recomputation happens in
 * this file.
 */

import { useMemo } from "react";

import { useWalletPortfolioIntelligence } from "@/lib/hooks/useWalletPortfolioIntelligence";
import { useWalletPortfolioAI } from "@/lib/hooks/useWalletPortfolioAI";
import { useWalletAnalytics } from "@/lib/hooks/useWalletAnalytics";
import { useWalletAutomation } from "@/lib/hooks/useWalletAutomation";
import { buildCrossFeatureIntelligence } from "@/lib/cross-feature/engine";
import type { CrossFeatureIntelligence } from "@/lib/cross-feature/types";
import { buildHistoricalReport } from "@/components/wallet/walletReportEngine";

export function useCrossFeatureIntelligence(): CrossFeatureIntelligence {
  const { intelligence } = useWalletPortfolioIntelligence();
  const { ai } = useWalletPortfolioAI();
  const { analytics, history } = useWalletAnalytics();
  const walletAutomation = useWalletAutomation();

  const monthlyReport = useMemo(() => buildHistoricalReport(history, analytics, "30d"), [history, analytics]);

  return useMemo(
    () =>
      buildCrossFeatureIntelligence({
        intelligence,
        ai,
        analytics,
        history,
        automationEvents: walletAutomation.events,
        automationResults: walletAutomation.results,
        monthlyReport,
      }),
    [intelligence, ai, analytics, history, walletAutomation.events, walletAutomation.results, monthlyReport]
  );
}
