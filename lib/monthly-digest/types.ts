/**
 * V4-FUTURE-001 (Monthly Portfolio Digest) — domain types. Every field is
 * either a direct reference to an already-built object (`report`,
 * `healthSummary`) or a real, deterministic FILTER/SELECTION over one
 * (`story`, `newPersonalBests`) — never a new calculation. See `engine.ts`'s
 * own doc comment for the exact source of each field.
 */

import type { AIAction, AIOverview } from "@/lib/portfolio-ai/types";
import type { PortfolioRecommendation } from "@/lib/portfolio-intelligence/types";
import type { AnalyticsHighlight, RecoveryEvent } from "@/lib/wallet-analytics/types";
import type { HistoricalReport, ReportMetricSummary } from "@/components/wallet/walletReportEngine";
import type { SnapshotDiffField } from "@/components/wallet/walletSnapshotCompare";

/** One real correlated moment, reused verbatim from `CrossFeatureIntelligence.timeline` — never re-derived. */
export type DigestStoryEntry = { timestamp: string; headline: string };

export type DigestRecommendations = {
  /** `ai.actions`, already priority-ranked — top 3, never a second ranking. */
  topPriorities: AIAction[];
  /** The real recoveries this period (`report.majorRecoveries`) — a poor state that got fixed IS a completed improvement; the same real facts as the digest's own "Recoveries" section, reused under this heading for the recommendation-summary reading. */
  completedImprovements: RecoveryEvent[];
  /** `intelligence.recommendations`, already priority-sorted — every recommendation still active as of the latest snapshot. */
  stillOutstanding: PortfolioRecommendation[];
};

export type MonthlyDigest = {
  /** e.g. "September 2026" — derived from the real `report.overview.lastSnapshotDate`'s calendar month, never a recomputed report window. The underlying data is still the real rolling-period `report` below. */
  monthLabel: string;
  /** The full underlying report this digest was built from — reused verbatim so the exporter (Phase 8) can build the SAME report sections without a second traversal. */
  report: HistoricalReport;
  healthSummary: ReportMetricSummary;
  largestImprovement: SnapshotDiffField | null;
  largestDecline: SnapshotDiffField | null;
  recoveries: RecoveryEvent[];
  newPersonalBests: AnalyticsHighlight[];
  milestones: AnalyticsHighlight[];
  /** Top-ranked real highlights (already prioritized by `buildAnalyticsHighlights()`) — never re-ranked here. */
  importantHighlights: AnalyticsHighlight[];
  /** Chronological (oldest first — a story reads forward), real correlated moments within this digest's period, from `CrossFeatureIntelligence.timeline`. */
  story: DigestStoryEntry[];
  recommendations: DigestRecommendations;
  /** `ai.overview.nextAction`/`actionReason` verbatim — the same real "what to do next" Portfolio AI already computed. */
  nextMonthFocus: { action: string; reason: string | null } | null;
  /** `ai.overview`, exposed as-is for a UI that wants the full advisor read alongside the digest. */
  aiOverview: AIOverview | null;
};
