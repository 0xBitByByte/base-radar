/**
 * V4-FUTURE-002A — the one shared shape the Wallet Verification Harness,
 * its assertions, and its fixture builders all pass around. Every field is
 * an already-built object from an existing engine — this type exists only
 * to avoid three different "here's every Wallet object at once" shapes
 * across `lib/dev/walletFixtures.ts`, `lib/dev/walletAssertions.ts`, and
 * `components/wallet/dev/WalletVerificationHarness.tsx`.
 */

import type { PortfolioIntelligence } from "@/lib/portfolio-intelligence/types";
import type { PortfolioAI } from "@/lib/portfolio-ai/types";
import type { WalletAnalytics } from "@/lib/wallet-analytics/types";
import type { AnalyticsSnapshot } from "@/lib/wallet-history/types";
import type { AutomationResult } from "@/lib/automation/types";
import type { WalletEvent } from "@/lib/wallet-automation/types";
import type { HistoricalReport } from "@/components/wallet/walletReportEngine";
import type { MonthlyDigest } from "@/lib/monthly-digest/types";
import type { PortfolioStory } from "@/lib/portfolio-story/types";
import type { CrossFeatureIntelligence } from "@/lib/cross-feature/types";

export type WalletVerificationBundle = {
  intelligence: PortfolioIntelligence | null;
  ai: PortfolioAI | null;
  analytics: WalletAnalytics;
  history: AnalyticsSnapshot[];
  automationResults: AutomationResult[];
  automationEvents: WalletEvent[];
  /** The 30-day report — the same period `useMonthlyDigest()`/`useAIChat()` build theirs from. */
  report30d: HistoricalReport | null;
  /** The "all" period report — the same period `usePortfolioStory()` builds its own from. */
  reportAll: HistoricalReport | null;
  digest: MonthlyDigest | null;
  story: PortfolioStory | null;
  crossFeature: CrossFeatureIntelligence;
};
