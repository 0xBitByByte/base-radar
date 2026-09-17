/**
 * V4-ANALYTICS-001 (Phase 4) — the Trend Engine. Compares the OLDEST and
 * NEWEST snapshot in the given history (never re-fetches, never
 * recalculates a score — every value read here already exists on
 * `AutomationSnapshot`). Reuses `lib/wallet-automation/triggers.ts`'s own
 * `SCORE_CHANGE_THRESHOLD`/`VALUE_CHANGE_RATIO_THRESHOLD` rather than
 * inventing new magnitudes — the same "what counts as a real change" bar
 * Wallet Automation's own triggers already use.
 *
 * `higherIsBetter` mirrors `WalletIntelligenceSections.tsx`'s own
 * established `scoreColorClass(value, invert)` precedent (risk is the one
 * inverted metric there too) — not a new value judgment invented for this
 * module.
 */

import { historyBounds } from "@/lib/wallet-analytics/history";
import { categoricalTrendConfidence, numericTrendConfidence } from "@/lib/wallet-analytics/confidence";
import type { Trend, TrendDirection } from "@/lib/wallet-analytics/types";
import { SCORE_CHANGE_THRESHOLD, VALUE_CHANGE_RATIO_THRESHOLD } from "@/lib/wallet-automation/triggers";
import type { AutomationSnapshot } from "@/lib/wallet-automation/types";

function classifyNumericTrend(from: number, to: number, higherIsBetter: boolean, threshold: number): TrendDirection {
  const delta = to - from;
  if (Math.abs(delta) < threshold) return "stable";
  const improved = higherIsBetter ? delta > 0 : delta < 0;
  return improved ? "improving" : "declining";
}

function numericTrend(
  metric: string,
  label: string,
  history: AutomationSnapshot[],
  read: (snapshot: AutomationSnapshot) => number,
  higherIsBetter: boolean,
  threshold: number,
  unit = ""
): Trend {
  const { first, last } = historyBounds(history);
  const from = read(first!);
  const to = read(last!);
  const direction = classifyNumericTrend(from, to, higherIsBetter, threshold);
  const delta = Math.round((to - from) * 10) / 10;
  const values = history.map(read);
  const timestamps = history.map((s) => s.timestamp);
  const confidenceDetail = numericTrendConfidence(values, timestamps, (stepDelta) => Math.abs(stepDelta) >= threshold);
  return {
    metric,
    label,
    direction,
    from,
    to,
    delta,
    reason: `${label} moved from ${from}${unit} to ${to}${unit} (${delta >= 0 ? "+" : ""}${delta}${unit}).`,
    confidence: confidenceDetail.confidence,
    confidenceDetail,
  };
}

/** Categorical metrics (fingerprint, primary recommendation) never claim "improving"/"declining" — a category change isn't a value judgment this module makes. "stable" when unchanged throughout every snapshot in history, "unknown" when it changed at least once. */
function categoricalTrend(metric: string, label: string, history: AutomationSnapshot[], read: (snapshot: AutomationSnapshot) => string | null): Trend {
  const { first, last } = historyBounds(history);
  const from = first ? read(first) : null;
  const to = last ? read(last) : null;
  const distinctValues = new Set(history.map(read));
  const direction: TrendDirection = distinctValues.size <= 1 ? "stable" : "unknown";
  const confidenceDetail = categoricalTrendConfidence(history.length, first!.timestamp, last!.timestamp, direction as "stable" | "unknown");

  return {
    metric,
    label,
    direction,
    from,
    to,
    delta: null,
    reason:
      direction === "stable"
        ? `${label} stayed ${to ?? "unset"} across ${history.length} snapshot${history.length === 1 ? "" : "s"}.`
        : `${label} changed ${distinctValues.size - 1} time${distinctValues.size - 1 === 1 ? "" : "s"} across ${history.length} snapshots (from ${from ?? "unset"} to ${to ?? "unset"}).`,
    confidence: confidenceDetail.confidence,
    confidenceDetail,
  };
}

/**
 * One `Trend` per metric this phase names: Health, Confidence, Risk,
 * Portfolio Value, Diversification, Stablecoin Allocation (the one
 * continuously-tracked allocation-mix %, standing in for the brief's
 * "Allocation trend" — full per-asset allocation trends live in
 * `allocation.ts` instead, since a single scalar can't honestly represent
 * "allocation" the way it can "health"), Recommendation, and Fingerprint
 * Evolution — 8 total, matching the brief's own list.
 *
 * Fewer than 2 snapshots: every trend honestly reports `"unknown"` — a
 * single point in time has no trajectory.
 */
export function buildTrends(history: AutomationSnapshot[]): Trend[] {
  if (history.length < 2) {
    const unknownConfidenceDetail = { confidence: "unknown" as const, confidenceReason: "Not enough history yet to rate confidence.", snapshotCount: history.length, timeSpanDays: null, consistencyScore: null };
    return [
      { metric: "health", label: "Health", direction: "unknown", from: null, to: null, delta: null, reason: "Not enough history yet — at least 2 snapshots are needed to compute a trend.", confidence: "unknown", confidenceDetail: unknownConfidenceDetail },
      { metric: "confidence", label: "Confidence", direction: "unknown", from: null, to: null, delta: null, reason: "Not enough history yet.", confidence: "unknown", confidenceDetail: unknownConfidenceDetail },
      { metric: "risk", label: "Risk", direction: "unknown", from: null, to: null, delta: null, reason: "Not enough history yet.", confidence: "unknown", confidenceDetail: unknownConfidenceDetail },
      { metric: "value", label: "Portfolio Value", direction: "unknown", from: null, to: null, delta: null, reason: "Not enough history yet.", confidence: "unknown", confidenceDetail: unknownConfidenceDetail },
      { metric: "diversification", label: "Diversification", direction: "unknown", from: null, to: null, delta: null, reason: "Not enough history yet.", confidence: "unknown", confidenceDetail: unknownConfidenceDetail },
      { metric: "stablecoinAllocation", label: "Stablecoin Allocation", direction: "unknown", from: null, to: null, delta: null, reason: "Not enough history yet.", confidence: "unknown", confidenceDetail: unknownConfidenceDetail },
      { metric: "recommendation", label: "Recommendation", direction: "unknown", from: null, to: null, delta: null, reason: "Not enough history yet.", confidence: "unknown", confidenceDetail: unknownConfidenceDetail },
      { metric: "fingerprint", label: "Fingerprint", direction: "unknown", from: null, to: null, delta: null, reason: "Not enough history yet.", confidence: "unknown", confidenceDetail: unknownConfidenceDetail },
    ];
  }

  const { first, last } = historyBounds(history);
  const from = first!;
  const to = last!;

  return [
    numericTrend("health", "Health", history, (s) => s.healthScore, true, SCORE_CHANGE_THRESHOLD),
    numericTrend("confidence", "Confidence", history, (s) => s.confidenceScore, true, SCORE_CHANGE_THRESHOLD, "%"),
    numericTrend("risk", "Risk", history, (s) => s.riskScore, false, SCORE_CHANGE_THRESHOLD),
    (() => {
      const ratio = from.totalValue > 0 ? Math.abs(to.totalValue - from.totalValue) / from.totalValue : 0;
      const direction: TrendDirection = ratio < VALUE_CHANGE_RATIO_THRESHOLD ? "stable" : to.totalValue >= from.totalValue ? "improving" : "declining";
      const delta = Math.round((to.totalValue - from.totalValue) * 100) / 100;
      const values = history.map((s) => s.totalValue);
      const timestamps = history.map((s) => s.timestamp);
      const confidenceDetail = numericTrendConfidence(values, timestamps, (stepDelta, previousValue) =>
        previousValue > 0 ? Math.abs(stepDelta) / previousValue >= VALUE_CHANGE_RATIO_THRESHOLD : stepDelta !== 0
      );
      return {
        metric: "value",
        label: "Portfolio Value",
        direction,
        from: from.totalValue,
        to: to.totalValue,
        delta,
        reason: `Known portfolio value moved from $${from.totalValue.toLocaleString()} to $${to.totalValue.toLocaleString()} (${delta >= 0 ? "+" : ""}$${Math.abs(delta).toLocaleString()}).`,
        confidence: confidenceDetail.confidence,
        confidenceDetail,
      };
    })(),
    numericTrend("diversification", "Diversification", history, (s) => s.diversificationScore, true, SCORE_CHANGE_THRESHOLD),
    numericTrend("stablecoinAllocation", "Stablecoin Allocation", history, (s) => s.stablecoinExposure, true, SCORE_CHANGE_THRESHOLD, "%"),
    categoricalTrend("recommendation", "Recommendation", history, (s) => s.primaryRecommendationId),
    categoricalTrend("fingerprint", "Fingerprint", history, (s) => s.fingerprint),
  ];
}
