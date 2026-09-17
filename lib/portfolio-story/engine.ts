/**
 * V4-FUTURE-002 (Feature 5 — Portfolio Story Mode) — the one public entry
 * point. Pure, synchronous, deterministic composition over FIVE
 * already-built objects — never calls `buildWalletAnalytics`,
 * `buildPortfolioIntelligence`, `buildPortfolioAI`, `buildHistoricalReport`,
 * or `buildCrossFeatureIntelligence` itself. The caller (a hook) builds all
 * five exactly once and passes them in — the same "caller-built, never
 * engine-built" convention `lib/monthly-digest/engine.ts` already
 * established.
 *
 * `null` only when `report` itself is `null` (the caller's History was
 * genuinely empty) — a real, empty-but-present report still produces a
 * real, honest story with empty sections, never a fabricated one.
 */

import type { PortfolioStory } from "@/lib/portfolio-story/types";
import type { PortfolioAI } from "@/lib/portfolio-ai/types";
import type { PortfolioIntelligence } from "@/lib/portfolio-intelligence/types";
import type { WalletAnalytics } from "@/lib/wallet-analytics/types";
import type { CrossFeatureIntelligence } from "@/lib/cross-feature/types";
import type { HistoricalReport } from "@/components/wallet/walletReportEngine";

export function buildPortfolioStory(
  report: HistoricalReport | null,
  analytics: WalletAnalytics,
  intelligence: PortfolioIntelligence | null,
  ai: PortfolioAI | null,
  crossFeature: CrossFeatureIntelligence,
  now: string = new Date().toISOString()
): PortfolioStory | null {
  if (!report) return null;

  return {
    introduction: intelligence?.executiveSummary ?? "",
    report,
    whereYouStarted: report.overview.firstSnapshotDate
      ? { date: report.overview.firstSnapshotDate, value: report.overview.startValue, health: report.health.first?.value ?? null }
      : null,
    // `CrossFeatureIntelligence.timeline` is newest-first (the right order
    // for a browse list); a story reads oldest-first, so reverse without
    // mutating the source array.
    keyTurningPoints: [...crossFeature.timeline].reverse().map((entry) => ({ timestamp: entry.timestamp, headline: entry.headline, tone: entry.tone })),
    recoveries: report.majorRecoveries,
    biggestImprovement: report.statistics.largestImprovement,
    biggestDecline: report.statistics.largestDecline,
    milestones: analytics.highlights.filter((h) => h.type === "milestone"),
    currentPosition: report.overview.lastSnapshotDate
      ? { date: report.overview.lastSnapshotDate, value: report.overview.endValue, health: report.health.last?.value ?? null }
      : null,
    nextRecommendedAction: ai?.overview.nextAction ? { action: ai.overview.nextAction, reason: ai.overview.actionReason } : null,
    aiOverview: ai?.overview ?? null,
    generatedAt: now,
  };
}
