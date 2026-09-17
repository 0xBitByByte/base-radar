/**
 * V4-FUTURE-001 (Phase 2) — the one public entry point. Pure, synchronous,
 * deterministic composition over FOUR already-built objects — never calls
 * `buildWalletAnalytics`, `buildPortfolioAI` (`lib/portfolio-ai/engine.ts`),
 * `buildHistoricalReport`, or `buildCrossFeatureIntelligence` itself. The
 * caller (a hook) builds all four exactly once and passes them in — the
 * same "caller-built, never engine-built" convention `lib/ai-chat/` and
 * `lib/cross-feature/` already established for `HistoricalReport`.
 *
 * `null` only when `report` itself is `null` (the caller's History was
 * genuinely empty — `buildHistoricalReport`'s own honest "nothing to
 * report" case) — a real, empty-but-present report (zero snapshots in a
 * narrow period, but history exists overall) still produces a real,
 * honest digest with empty sections, never a fabricated one.
 */

import { buildPortfolioStory } from "@/lib/monthly-digest/story";
import type { MonthlyDigest } from "@/lib/monthly-digest/types";
import type { PortfolioAI } from "@/lib/portfolio-ai/types";
import type { PortfolioIntelligence } from "@/lib/portfolio-intelligence/types";
import type { WalletAnalytics } from "@/lib/wallet-analytics/types";
import type { CrossFeatureIntelligence } from "@/lib/cross-feature/types";
import type { HistoricalReport } from "@/components/wallet/walletReportEngine";

const MONTH_LABEL_FORMAT = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
const MAX_IMPORTANT_HIGHLIGHTS = 5;
const MAX_TOP_PRIORITIES = 3;

export function buildMonthlyDigest(
  report: HistoricalReport | null,
  analytics: WalletAnalytics,
  intelligence: PortfolioIntelligence | null,
  ai: PortfolioAI | null,
  crossFeature: CrossFeatureIntelligence,
  now: string = new Date().toISOString()
): MonthlyDigest | null {
  if (!report) return null;

  const monthLabel = MONTH_LABEL_FORMAT.format(new Date(report.overview.lastSnapshotDate ?? now));

  return {
    monthLabel,
    report,
    healthSummary: report.health,
    largestImprovement: report.statistics.largestImprovement,
    largestDecline: report.statistics.largestDecline,
    recoveries: report.majorRecoveries,
    newPersonalBests: analytics.highlights.filter((h) => h.type === "newPersonalBest"),
    milestones: analytics.highlights.filter((h) => h.type === "milestone"),
    importantHighlights: analytics.highlights.slice(0, MAX_IMPORTANT_HIGHLIGHTS),
    story: buildPortfolioStory(crossFeature.timeline, report.overview.firstSnapshotDate, report.overview.lastSnapshotDate),
    recommendations: {
      topPriorities: ai?.actions.slice(0, MAX_TOP_PRIORITIES) ?? [],
      completedImprovements: report.majorRecoveries,
      stillOutstanding: intelligence?.recommendations ?? [],
    },
    nextMonthFocus: ai?.overview.nextAction ? { action: ai.overview.nextAction, reason: ai.overview.actionReason } : null,
    aiOverview: ai?.overview ?? null,
  };
}
