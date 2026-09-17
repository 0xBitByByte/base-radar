/**
 * V4-ANALYTICS-001A (Phase 8) — Trend Correlation: deterministic
 * CO-OCCURRENCE only, never causation and never AI. Explains the current
 * `biggestChange` outcome by naming which OTHER real trends moved alongside
 * it in the same window, ranked by magnitude — "these moved together," not
 * "this caused that." `note` states that distinction explicitly on every
 * non-null result so no consumer mistakes correlation for an inferred
 * cause. Reuses `buildTrends()`'s already-computed output; never re-reads
 * snapshots or recomputes a delta.
 */

import type { Trend, TrendCorrelation, TrendCorrelationDriver, TrendDirection } from "@/lib/wallet-analytics/types";

const CORRELATION_NOTE = "Reflects real metrics that moved during the same window — not a proven cause. Never inferred by AI.";

function normalizedMagnitude(trend: Trend): number {
  if (trend.metric === "value" && typeof trend.from === "number" && trend.from !== 0) {
    return Math.abs((trend.delta ?? 0) / trend.from) * 100;
  }
  return Math.abs(trend.delta ?? 0);
}

function toDriver(trend: Trend): TrendCorrelationDriver {
  return { metric: trend.metric, label: trend.label, direction: trend.direction };
}

function moved(direction: TrendDirection): boolean {
  return direction === "improving" || direction === "declining";
}

export function buildTrendCorrelation(trends: Trend[], outcomeMetric: string | null): TrendCorrelation {
  if (!outcomeMetric) return null;
  const outcome = trends.find((t) => t.metric === outcomeMetric);
  if (!outcome) return null;

  const others = trends.filter((t) => t.metric !== outcome.metric);
  const movedOthers = others.filter((t) => moved(t.direction));
  const rankedNumericDrivers = movedOthers.filter((t) => t.delta !== null).sort((a, b) => normalizedMagnitude(b) - normalizedMagnitude(a));
  const changedCategorical = others.filter((t) => t.delta === null && t.direction === "unknown");

  const affectedMetrics = [...movedOthers, ...changedCategorical].map((t) => t.metric);

  const confidence = affectedMetrics.length >= 2 ? "medium" : affectedMetrics.length === 1 ? "low" : "unknown";

  return {
    outcomeMetric: outcome.metric,
    outcomeLabel: outcome.label,
    primaryDriver: rankedNumericDrivers[0] ? toDriver(rankedNumericDrivers[0]) : null,
    secondaryDriver: rankedNumericDrivers[1] ? toDriver(rankedNumericDrivers[1]) : null,
    affectedMetrics,
    confidence,
    note: CORRELATION_NOTE,
  };
}
