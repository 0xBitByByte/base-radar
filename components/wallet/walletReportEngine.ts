/**
 * V4-HISTORY-005 — the Report Engine. Reports summarize stored history —
 * they never replay, never call Portfolio Intelligence/Analytics, never
 * query a provider. Every input here is already real:
 *
 *   - `history: AnalyticsSnapshot[]` — already-persisted snapshots, the
 *     same array `useWalletHistory()`/`HistoryBrowserSection` already read.
 *   - `analytics: WalletAnalytics` — an ALREADY-BUILT object the caller
 *     computed once via `buildWalletAnalytics()` (typically through
 *     `useWalletAnalytics()`). This file never imports or calls
 *     `buildWalletAnalytics` itself — "DO NOT rerun Analytics" is enforced
 *     by construction, not by convention.
 *
 * Per Phase 7's architecture split ("Reports own presentation only...
 * Analytics owns calculations"), this file is colocated under
 * `components/wallet/` — the same "presentation-layer logic over
 * already-real data, not a second engine" convention `walletHistoryFilters.ts`/
 * `walletSnapshotCompare.ts`/`walletReplayController.ts` already established
 * — rather than under `lib/wallet-analytics/` or a new `lib/` engine
 * directory. The one genuinely new computation here (Fingerprint Changes:
 * walking consecutive snapshots for a categorical value change) is an
 * equality check, not a scoring formula — see that section's own doc
 * comment. Every "highest/lowest" statistic reuses `extremeMilestone()`
 * from `lib/wallet-analytics/milestones.ts` verbatim, applied to a
 * period-filtered slice instead of the full history — never a second
 * max/min implementation. `largestImprovement`/`largestDecline` reuse
 * `compareSnapshots()` from `walletSnapshotCompare.ts` verbatim.
 */

import { compareSnapshots, type SnapshotDiffField } from "@/components/wallet/walletSnapshotCompare";
import { historyBounds } from "@/lib/wallet-analytics/history";
import { extremeMilestone } from "@/lib/wallet-analytics/milestones";
import type { AnalyticsHighlight, PersonalBests, PortfolioMilestone, PortfolioMilestones, RecoveryEvent, WalletAnalytics } from "@/lib/wallet-analytics/types";
import type { AnalyticsSnapshot } from "@/lib/wallet-history/types";

/**
 * PR-092.05 (Portfolio Reports) — `"1d"` added additively: "Daily"/"Weekly"/
 * "Monthly" cadence (the brief's own wording) already maps directly onto
 * this existing period system — Weekly is `"7d"`, Monthly is `"30d"`, both
 * already built, tested, and exportable. `"1d"` was the one genuine gap.
 * Every existing period's own label/value (`"7d"`/`"30d"`/`"90d"`/`"all"`)
 * is completely unchanged, deliberately — dozens of existing tests already
 * assert the exact "Last 7 Days"/"Last 30 Days" strings, and this pass is
 * additive, not a wording rewrite. Snapshots only accrue while the app is
 * actually visited (see `lib/wallet-history/`'s own doc comment), so a
 * "Daily" report can genuinely be thin or empty —
 * `buildHistoricalReport()`'s existing `periodHistory.length === 0 → null`
 * early return (unchanged below) already renders that honestly; no new
 * empty-state logic was needed here.
 */
export type ReportPeriod = "1d" | "7d" | "30d" | "90d" | "all";

export const REPORT_PERIODS: ReportPeriod[] = ["1d", "7d", "30d", "90d", "all"];

export const REPORT_PERIOD_LABEL: Record<ReportPeriod, string> = {
  "1d": "Last 24 Hours",
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  "90d": "Last 90 Days",
  all: "All History",
};

const DAY_MS = 24 * 60 * 60 * 1000;
const REPORT_PERIOD_DAYS: Record<Exclude<ReportPeriod, "all">, number> = { "1d": 1, "7d": 7, "30d": 30, "90d": 90 };

/** Mirrors `lib/wallet-analytics/window.ts`'s `filterHistoryByWindow` structure exactly — a distinct function (not a shared import) only because Report periods ("90d") and `AnalyticsWindow` ("24h"/"thisMonth") are genuinely different sets, per this task's own brief. Filtering is the only thing this function does — no trend/statistic computed here. */
export function filterHistoryByReportPeriod(history: AnalyticsSnapshot[], period: ReportPeriod, now: string): AnalyticsSnapshot[] {
  if (period === "all") return history;
  const startMs = new Date(now).getTime() - REPORT_PERIOD_DAYS[period] * DAY_MS;
  return history.filter((snapshot) => new Date(snapshot.timestamp).getTime() >= startMs);
}

function inPeriod(dateIso: string, startMs: number | null): boolean {
  return startMs === null || new Date(dateIso).getTime() >= startMs;
}

export type ReportOverview = {
  period: ReportPeriod;
  periodLabel: string;
  snapshotCount: number;
  firstSnapshotDate: string | null;
  lastSnapshotDate: string | null;
  startValue: number | null;
  endValue: number | null;
  /** Raw `endValue - startValue` — no "improving/declining" framing, matching `walletSnapshotCompare.ts`'s own restraint. */
  netValueChange: number | null;
};

/** One metric's real range across the period — both extremes computed via `extremeMilestone()`, the same algorithm Milestones uses for all-time. */
export type ReportMetricSummary = {
  metric: string;
  label: string;
  highest: PortfolioMilestone;
  lowest: PortfolioMilestone;
  first: { value: number; date: string } | null;
  last: { value: number; date: string } | null;
  /** Raw `last - first`, no direction judgment. */
  change: number | null;
};

/** One real fingerprint transition — detected by walking consecutive real snapshots and comparing an already-stored categorical field, never a new classification. */
export type FingerprintChange = { from: string; to: string; date: string };

export type ReportStatistics = {
  highestValue: PortfolioMilestone;
  lowestRisk: PortfolioMilestone;
  highestConfidence: PortfolioMilestone;
  bestHealth: PortfolioMilestone;
  largestImprovement: SnapshotDiffField | null;
  largestDecline: SnapshotDiffField | null;
  recoveryCount: number;
  milestoneCount: number;
  snapshotCount: number;
};

export type HistoricalReport = {
  period: ReportPeriod;
  overview: ReportOverview;
  health: ReportMetricSummary;
  confidence: ReportMetricSummary;
  risk: ReportMetricSummary;
  value: ReportMetricSummary;
  fingerprintChanges: FingerprintChange[];
  /** `analytics.recoveries`, filtered to this period's real `recoveryDate` — never recomputed. */
  majorRecoveries: RecoveryEvent[];
  /** `analytics.personalBests` verbatim, all-time by nature — see that type's own doc comment. */
  personalBests: PersonalBests;
  /** `analytics.milestones` verbatim, all-time by nature. */
  milestones: PortfolioMilestones;
  /** `analytics.highlights` verbatim, already ranked/deduplicated. */
  highlights: AnalyticsHighlight[];
  statistics: ReportStatistics;
};

function buildMetricSummary(periodHistory: AnalyticsSnapshot[], metric: string, label: string, read: (s: AnalyticsSnapshot) => number): ReportMetricSummary {
  const { first, last } = historyBounds(periodHistory);
  const firstValue = first ? { value: read(first), date: first.timestamp } : null;
  const lastValue = last ? { value: read(last), date: last.timestamp } : null;
  return {
    metric,
    label,
    highest: extremeMilestone(periodHistory, `Highest ${label}`, read, "max"),
    lowest: extremeMilestone(periodHistory, `Lowest ${label}`, read, "min"),
    first: firstValue,
    last: lastValue,
    change: firstValue && lastValue ? Math.round((lastValue.value - firstValue.value) * 10) / 10 : null,
  };
}

/** Walks consecutive real snapshots; every time `fingerprint` differs from the one before it, that's a real, stored transition — an equality check, not a new classification. */
function buildFingerprintChanges(periodHistory: AnalyticsSnapshot[]): FingerprintChange[] {
  const changes: FingerprintChange[] = [];
  for (let i = 1; i < periodHistory.length; i++) {
    const previous = periodHistory[i - 1];
    const current = periodHistory[i];
    if (previous.fingerprint !== current.fingerprint) {
      changes.push({ from: previous.fingerprint, to: current.fingerprint, date: current.timestamp });
    }
  }
  return changes;
}

function pickExtremeDelta(fields: SnapshotDiffField[], direction: "positive" | "negative"): SnapshotDiffField | null {
  const candidates = fields.filter((f) => f.delta !== null && (direction === "positive" ? f.delta > 0 : f.delta < 0));
  if (candidates.length === 0) return null;
  return candidates.reduce((best, field) => (Math.abs(field.delta!) > Math.abs(best.delta!) ? field : best));
}

function countRealMilestones(milestones: PortfolioMilestones, startMs: number | null): number {
  return Object.values(milestones).filter((m): m is Exclude<PortfolioMilestone, null> => m !== null && inPeriod(m.date, startMs)).length;
}

/**
 * The one public entry point. `null` only when `history` is genuinely
 * empty — nothing real to report. `analytics` must already be built by the
 * caller (typically `useWalletAnalytics()`'s own `analytics` field) — this
 * function never computes it.
 */
export function buildHistoricalReport(history: AnalyticsSnapshot[], analytics: WalletAnalytics, period: ReportPeriod, now: string = new Date().toISOString()): HistoricalReport | null {
  if (history.length === 0) return null;

  const periodHistory = filterHistoryByReportPeriod(history, period, now);
  const startMs = period === "all" ? null : new Date(now).getTime() - REPORT_PERIOD_DAYS[period] * DAY_MS;
  const { first, last } = historyBounds(periodHistory);

  const overview: ReportOverview = {
    period,
    periodLabel: REPORT_PERIOD_LABEL[period],
    snapshotCount: periodHistory.length,
    firstSnapshotDate: first?.timestamp ?? null,
    lastSnapshotDate: last?.timestamp ?? null,
    startValue: first?.totalValue ?? null,
    endValue: last?.totalValue ?? null,
    netValueChange: first && last ? Math.round((last.totalValue - first.totalValue) * 10) / 10 : null,
  };

  const health = buildMetricSummary(periodHistory, "healthScore", "Health", (s) => s.healthScore);
  const confidence = buildMetricSummary(periodHistory, "confidenceScore", "Confidence", (s) => s.confidenceScore);
  const risk = buildMetricSummary(periodHistory, "riskScore", "Risk", (s) => s.riskScore);
  const value = buildMetricSummary(periodHistory, "totalValue", "Portfolio Value", (s) => s.totalValue);

  const comparison = first && last && first.timestamp !== last.timestamp ? compareSnapshots(first, last) : null;

  const majorRecoveries = analytics.recoveries.filter((r) => inPeriod(r.recoveryDate, startMs));

  return {
    period,
    overview,
    health,
    confidence,
    risk,
    value,
    fingerprintChanges: buildFingerprintChanges(periodHistory),
    majorRecoveries,
    personalBests: analytics.personalBests,
    milestones: analytics.milestones,
    highlights: analytics.highlights,
    statistics: {
      highestValue: extremeMilestone(periodHistory, "Highest Portfolio Value", (s) => s.totalValue, "max"),
      lowestRisk: extremeMilestone(periodHistory, "Lowest Risk", (s) => s.riskScore, "min"),
      highestConfidence: extremeMilestone(periodHistory, "Highest Confidence", (s) => s.confidenceScore, "max"),
      bestHealth: extremeMilestone(periodHistory, "Best Health", (s) => s.healthScore, "max"),
      largestImprovement: comparison ? pickExtremeDelta(comparison.fields, "positive") : null,
      largestDecline: comparison ? pickExtremeDelta(comparison.fields, "negative") : null,
      recoveryCount: majorRecoveries.length,
      milestoneCount: countRealMilestones(analytics.milestones, startMs),
      snapshotCount: periodHistory.length,
    },
  };
}
