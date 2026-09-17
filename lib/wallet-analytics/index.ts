/**
 * V4-ANALYTICS-001 — the one clean public surface for this directory,
 * matching `lib/portfolio-intelligence/index.ts`/`lib/portfolio-ai/index.ts`'s
 * own barrel convention.
 */

export { buildWalletAnalytics } from "@/lib/wallet-analytics/engine";
export type * from "@/lib/wallet-analytics/types";

export { appendSnapshot, historyBounds, DEFAULT_MAX_HISTORY_LENGTH } from "@/lib/wallet-analytics/history";
export { buildTrends } from "@/lib/wallet-analytics/trend";
export { numericTrendConfidence, categoricalTrendConfidence } from "@/lib/wallet-analytics/confidence";
export { buildPortfolioEvolution, longestConsecutiveRun } from "@/lib/wallet-analytics/comparison";
export { buildBiggestChange } from "@/lib/wallet-analytics/biggestChange";
export { buildAllocationAnalytics } from "@/lib/wallet-analytics/allocation";
export { buildAnalyticsTimeline } from "@/lib/wallet-analytics/timeline";
export { buildAnalyticsExecutiveSummary } from "@/lib/wallet-analytics/summary";

// V4-ANALYTICS-001A
export { ANALYTICS_WINDOWS, ANALYTICS_WINDOW_LABEL, filterHistoryByWindow, filterEventsByWindow } from "@/lib/wallet-analytics/window";
export { buildPortfolioMilestones } from "@/lib/wallet-analytics/milestones";
export { buildPersonalBests } from "@/lib/wallet-analytics/personalBests";
export { buildRecoveryAnalysis } from "@/lib/wallet-analytics/recovery";
export { buildTrendCorrelation } from "@/lib/wallet-analytics/correlation";
export { buildChangeFrequency } from "@/lib/wallet-analytics/frequency";
export { buildStabilityIndex } from "@/lib/wallet-analytics/stability";
export { buildAnalyticsExportSnapshot } from "@/lib/wallet-analytics/export";

// V4-ANALYTICS-001B
export { buildAnalyticsHighlights } from "@/lib/wallet-analytics/highlights";

// V4-ANALYTICS-001C
export { serializeAnalyticsSnapshot, deserializeAnalyticsSnapshot } from "@/lib/wallet-analytics/serialization";
export { CURRENT_ANALYTICS_SNAPSHOT_VERSION } from "@/lib/wallet-automation/types";
