/**
 * V4-FUTURE-002 (Feature 7 — Smart Report Sharing) — domain types. This
 * feature never uploads, integrates with an external service, or generates
 * new analysis — every field in `ShareSourceData` is a direct reference to
 * an already-built object this app's other features already produce; the
 * engine only SELECTS which of them to fold into one shareable bundle.
 */

import type { PortfolioAI } from "@/lib/portfolio-ai/types";
import type { PortfolioIntelligence } from "@/lib/portfolio-intelligence/types";
import type { WalletAnalytics } from "@/lib/wallet-analytics/types";
import type { CrossFeatureIntelligence } from "@/lib/cross-feature/types";
import type { MonthlyDigest } from "@/lib/monthly-digest/types";
import type { PortfolioStory } from "@/lib/portfolio-story/types";
import type { HistoricalReport } from "@/components/wallet/walletReportEngine";
import type { AnalyticsSnapshot } from "@/lib/wallet-history/types";

/** The small slice of `UseWalletHistoryResult` the "History" toggle needs — never the raw hook return type, so this `lib/` module never depends on a `lib/hooks/` type. */
export type ShareHistorySummary = {
  snapshotCount: number;
  oldestSnapshot: AnalyticsSnapshot | null;
  newestSnapshot: AnalyticsSnapshot | null;
};

export type ShareSourceData = {
  report: HistoricalReport;
  ai: PortfolioAI | null;
  intelligence: PortfolioIntelligence | null;
  analytics: WalletAnalytics;
  history: ShareHistorySummary;
  crossFeature: CrossFeatureIntelligence;
  digest: MonthlyDigest | null;
  story: PortfolioStory | null;
};

/** Every field defaults to `false` — sharing starts as the base report alone, opt-in only, never opt-out. */
export type ShareIncludeOptions = {
  history: boolean;
  timeline: boolean;
  recommendations: boolean;
  highlights: boolean;
  digest: boolean;
  story: boolean;
};

export const DEFAULT_SHARE_OPTIONS: ShareIncludeOptions = {
  history: false,
  timeline: false,
  recommendations: false,
  highlights: false,
  digest: false,
  story: false,
};

export type ShareFormat = "markdown" | "text" | "html";

/**
 * V4-FUTURE-002B — four fixed combinations of the SAME `ShareIncludeOptions`
 * toggles above. Each preset only flips which already-real sections are
 * included; none builds new content. Order matters — this is also the
 * display order of the preset buttons.
 */
export type SharePresetId = "executiveSummary" | "investorSummary" | "developerSummary" | "fullPortfolio";

export const SHARE_PRESETS: { id: SharePresetId; label: string; options: ShareIncludeOptions }[] = [
  { id: "executiveSummary", label: "Executive Summary", options: { history: false, timeline: false, recommendations: true, highlights: false, digest: false, story: false } },
  { id: "investorSummary", label: "Investor Summary", options: { history: true, timeline: false, recommendations: true, highlights: true, digest: false, story: false } },
  { id: "developerSummary", label: "Developer Summary", options: { history: true, timeline: true, recommendations: false, highlights: false, digest: false, story: false } },
  { id: "fullPortfolio", label: "Full Portfolio", options: { history: true, timeline: true, recommendations: true, highlights: true, digest: true, story: true } },
];
