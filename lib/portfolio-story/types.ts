/**
 * V4-FUTURE-002 (Feature 5 — Portfolio Story Mode) — domain types. Every
 * field is a direct reference to an already-built object or a real,
 * deterministic SELECTION over one — never a new calculation, never
 * generated text. See `engine.ts`'s own doc comment for the exact source of
 * each field.
 *
 * Distinct from `lib/monthly-digest/types.ts`'s `DigestStoryEntry`: that
 * type is a narrow, single-month-scoped `{timestamp, headline}` pair meant
 * to sit inside a digest. `PortfolioStory` is the full, multi-section
 * narrative for the dedicated Story Mode view, covering the wallet's whole
 * recorded history (an "all"-period report), not one calendar month.
 */

import type { AIOverview } from "@/lib/portfolio-ai/types";
import type { AnalyticsHighlight, RecoveryEvent } from "@/lib/wallet-analytics/types";
import type { HistoricalReport } from "@/components/wallet/walletReportEngine";
import type { SnapshotDiffField } from "@/components/wallet/walletSnapshotCompare";
import type { WalletEventTone } from "@/lib/wallet-automation/types";

/** One real correlated moment, reused verbatim from `CrossFeatureIntelligence.timeline` — never re-derived. */
export type PortfolioStoryMoment = { timestamp: string; headline: string; tone: WalletEventTone };

/** A single real point-in-time read — the wallet's first or most recent recorded snapshot. */
export type PortfolioStorySnapshot = { date: string; value: number | null; health: number | null };

export type PortfolioStory = {
  /** `PortfolioIntelligence.executiveSummary` verbatim — the app's own already-composed "health, largest holding, diversification, main risk, top recommendation" paragraph. Never a second summary. */
  introduction: string;
  /** The full underlying "all"-period report this story was built from — reused verbatim so the exporter can build the same sections without a second traversal. */
  report: HistoricalReport;
  whereYouStarted: PortfolioStorySnapshot | null;
  /** Chronological (oldest first — a story reads forward), the wallet's entire real correlated moment history, from `CrossFeatureIntelligence.timeline`. */
  keyTurningPoints: PortfolioStoryMoment[];
  recoveries: RecoveryEvent[];
  biggestImprovement: SnapshotDiffField | null;
  biggestDecline: SnapshotDiffField | null;
  /** Already-prioritized real milestones (`analytics.highlights.filter(type === "milestone")`) — never re-ranked here. */
  milestones: AnalyticsHighlight[];
  currentPosition: PortfolioStorySnapshot | null;
  /** `ai.overview.nextAction`/`actionReason` verbatim — the same real "what to do next" Portfolio AI already computed. */
  nextRecommendedAction: { action: string; reason: string | null } | null;
  /** `ai.overview`, exposed as-is for a UI that wants the full advisor read alongside the story. */
  aiOverview: AIOverview | null;
  generatedAt: string;
};
