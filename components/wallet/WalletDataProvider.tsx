"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import { useWallet } from "@/lib/hooks/useWallet";
import { usePortfolio, type UsePortfolioResult } from "@/lib/hooks/usePortfolio";
import { useWalletPortfolioIntelligence } from "@/lib/hooks/useWalletPortfolioIntelligence";
import { useWalletPortfolioAI } from "@/lib/hooks/useWalletPortfolioAI";
import { useWalletAutomation, type UseWalletAutomationResult } from "@/lib/hooks/useWalletAutomation";
import { useWalletAnalytics } from "@/lib/hooks/useWalletAnalytics";
import { useWalletHistory, type UseWalletHistoryResult } from "@/lib/hooks/useWalletHistory";
import { buildCrossFeatureIntelligence } from "@/lib/cross-feature/engine";
import { buildMonthlyDigest } from "@/lib/monthly-digest/engine";
import { buildPortfolioStory } from "@/lib/portfolio-story/engine";
import { buildHistoricalReport, type HistoricalReport } from "@/components/wallet/walletReportEngine";
import type { PortfolioIntelligence } from "@/lib/portfolio-intelligence/types";
import type { PortfolioAI } from "@/lib/portfolio-ai/types";
import type { WalletAnalytics } from "@/lib/wallet-analytics/types";
import type { CrossFeatureIntelligence } from "@/lib/cross-feature/types";
import type { MonthlyDigest } from "@/lib/monthly-digest/types";
import type { PortfolioStory } from "@/lib/portfolio-story/types";

/**
 * V4-FUTURE-002C — architecture-only. Investigation (this phase) found
 * that `/dashboard/wallet` and its sibling pages
 * (`/dashboard/wallet/review`, `/dashboard/wallet/verify`) each
 * independently called the SAME hook chain — `useWalletPortfolioIntelligence`,
 * `useWalletPortfolioAI`, `useWalletAutomation`, `useWalletAnalytics`,
 * `useWalletHistory`, `useCrossFeatureIntelligence`, `useMonthlyDigest`,
 * `usePortfolioStory` — meaning every one of those hooks' underlying
 * engines (`buildPortfolioIntelligence`, `buildPortfolioAI`,
 * `buildWalletAnalytics`, `buildCrossFeatureIntelligence`, ...) ran once
 * PER CONSUMING COMPONENT, not once per page.
 *
 * This file does not change what any of those hooks compute or how — "do
 * not redesign hooks internally." It changes WHERE they're called: once,
 * here, by whichever page wraps itself in `<WalletDataProvider>`, with
 * every other component in that subtree reading the result via
 * `useWalletData()` instead of re-deriving it. `analytics`/`history` here
 * are the canonical "all"-window pair — the same default every
 * `useMonthlyDigest`/`usePortfolioStory`/`useCrossFeatureIntelligence`
 * caller already used; a page's own WINDOW-SELECTABLE Trends view (see
 * `WalletPortfolioPage.tsx`) stays a separate, local
 * `useWalletAnalytics(selectedWindow)` call — genuinely different output
 * per window, never something a shared cache could serve.
 *
 * Deliberately NOT mounted at `app/dashboard/layout.tsx` — that would run
 * this entire chain on every Dashboard page (including ones that never
 * needed it, like Projects), a real behavior/performance change beyond
 * this phase's "no user-visible behavior change" mandate. Each Wallet page
 * mounts its own `<WalletDataProvider>` instance instead.
 *
 * V4-FUTURE-002D — closes the remaining gap 002C left open. `crossFeature`/
 * `digest`/`story` are now built by calling `buildCrossFeatureIntelligence`/
 * `buildMonthlyDigest`/`buildPortfolioStory` — the underlying ENGINE
 * functions, already designed as pure "caller-built, never engine-built"
 * functions — directly, with the `intelligence`/`ai`/`analytics`/
 * `automation` this Provider already computed. This Provider no longer
 * calls the `useCrossFeatureIntelligence()`/`useMonthlyDigest()`/
 * `usePortfolioStory()` HOOKS at all — those three hooks are completely
 * UNCHANGED (still exported, still self-composing, still used exactly as
 * before by `PortfolioWidget`, `AutomationCenter`, and `AutomationWidget`,
 * none of which are wrapped in this Provider) — "do not redesign public
 * APIs." Only this ONE caller, which already had cheaper access to the
 * same inputs, stopped going through them.
 */

export type WalletDataContextValue = {
  isConnected: boolean;
  isSupportedNetwork: boolean;
  address: string | undefined;
  ensName: string | null | undefined;
  portfolio: UsePortfolioResult;
  intelligence: PortfolioIntelligence | null;
  ai: PortfolioAI | null;
  automation: UseWalletAutomationResult;
  /** The canonical "all"-window analytics — see this file's own doc comment. */
  analytics: WalletAnalytics;
  walletHistory: UseWalletHistoryResult;
  report30d: HistoricalReport | null;
  reportAll: HistoricalReport | null;
  crossFeature: CrossFeatureIntelligence;
  digest: MonthlyDigest | null;
  story: PortfolioStory | null;
};

const WalletDataContext = createContext<WalletDataContextValue | null>(null);

export function WalletDataProvider({ children }: { children: ReactNode }) {
  const { isConnected, isSupportedNetwork, address, ensName } = useWallet();
  const portfolio = usePortfolio();
  const { intelligence } = useWalletPortfolioIntelligence();
  const { ai } = useWalletPortfolioAI();
  const automation = useWalletAutomation();
  const { analytics, history } = useWalletAnalytics();
  // `useWalletHistory()` owns real `localStorage` persistence (append on
  // new snapshot, subscription) — genuinely hook-shaped state, not a pure
  // derivation, so unlike `crossFeature`/`digest`/`story` below it stays a
  // real hook call. It also internally calls `useWalletAutomation()` again
  // (`snapshot`/`diff`) — a residual duplication that would require
  // redesigning ITS public API to remove; see this phase's own Architecture
  // Assessment for why that's left alone.
  const walletHistory = useWalletHistory();

  const report30d = useMemo(() => buildHistoricalReport(history, analytics, "30d"), [history, analytics]);
  const reportAll = useMemo(() => buildHistoricalReport(history, analytics, "all"), [history, analytics]);

  const crossFeature = useMemo(
    () => buildCrossFeatureIntelligence({ intelligence, ai, analytics, history, automationEvents: automation.events, automationResults: automation.results, monthlyReport: report30d }),
    [intelligence, ai, analytics, history, automation.events, automation.results, report30d]
  );

  const digest = useMemo(() => buildMonthlyDigest(report30d, analytics, intelligence, ai, crossFeature), [report30d, analytics, intelligence, ai, crossFeature]);
  const story = useMemo(() => buildPortfolioStory(reportAll, analytics, intelligence, ai, crossFeature), [reportAll, analytics, intelligence, ai, crossFeature]);

  const value = useMemo<WalletDataContextValue>(
    () => ({ isConnected, isSupportedNetwork, address, ensName, portfolio, intelligence, ai, automation, analytics, walletHistory, report30d, reportAll, crossFeature, digest, story }),
    [isConnected, isSupportedNetwork, address, ensName, portfolio, intelligence, ai, automation, analytics, walletHistory, report30d, reportAll, crossFeature, digest, story]
  );

  return <WalletDataContext.Provider value={value}>{children}</WalletDataContext.Provider>;
}

/** Throws outside a `<WalletDataProvider>` — a silent `null` fallback would let a future consumer render a broken, half-empty page instead of surfacing the missing provider immediately. */
export function useWalletData(): WalletDataContextValue {
  const context = useContext(WalletDataContext);
  if (!context) throw new Error("useWalletData() must be called within a <WalletDataProvider>.");
  return context;
}
