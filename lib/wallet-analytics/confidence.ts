/**
 * V4-ANALYTICS-002 / V4-ANALYTICS-001A (Phase 3) — Trend Confidence: how
 * reliable a `Trend`'s classified `direction` is, given the shape of the
 * history it came from. This is NOT Portfolio AI's `confidenceScore` (a
 * snapshot-in-time read of pricing/data completeness) — it is confidence in
 * the HISTORICAL TREND ITSELF.
 *
 * Deterministic only, three point-scored factors summed to a 0-6 total:
 *   - snapshot count (more snapshots → more reliable)
 *   - time span covered (a longer window → less likely to be noise)
 *   - step-to-step consistency (did every step move the same direction as
 *     the overall trend, or did it zig-zag to get there?)
 * Every input is `history.length`, real ISO timestamps, or the same real
 * per-snapshot values `trend.ts` already reads — nothing here is guessed.
 *
 * Returns the full `TrendConfidenceDetail` (level + the real numbers behind
 * it), not just the bare level — `trend.ts` pulls `.confidence` for the
 * existing plain-string field and keeps the whole object as
 * `confidenceDetail`.
 */

import type { TrendConfidence, TrendConfidenceDetail, TrendDirection } from "@/lib/wallet-analytics/types";

const MIN_SNAPSHOTS_FOR_HIGH_COUNT = 5;
const MIN_SNAPSHOTS_FOR_MEDIUM_COUNT = 3;

const MIN_SPAN_DAYS_FOR_HIGH = 7;
const MIN_SPAN_DAYS_FOR_MEDIUM = 1;

const MIN_CONSISTENCY_RATIO_FOR_HIGH = 0.75;
const MIN_CONSISTENCY_RATIO_FOR_MEDIUM = 0.4;

function countFactor(snapshotCount: number): number {
  if (snapshotCount >= MIN_SNAPSHOTS_FOR_HIGH_COUNT) return 2;
  if (snapshotCount >= MIN_SNAPSHOTS_FOR_MEDIUM_COUNT) return 1;
  return 0;
}

function spanDaysBetween(firstTimestamp: string, lastTimestamp: string): number {
  return (new Date(lastTimestamp).getTime() - new Date(firstTimestamp).getTime()) / (1000 * 60 * 60 * 24);
}

function spanFactor(spanDays: number): number {
  if (spanDays >= MIN_SPAN_DAYS_FOR_HIGH) return 2;
  if (spanDays >= MIN_SPAN_DAYS_FOR_MEDIUM) return 1;
  return 0;
}

function consistencyFactor(ratio: number): number {
  if (ratio >= MIN_CONSISTENCY_RATIO_FOR_HIGH) return 2;
  if (ratio >= MIN_CONSISTENCY_RATIO_FOR_MEDIUM) return 1;
  return 0;
}

function scoreToConfidence(points: number): TrendConfidence {
  if (points >= 5) return "high";
  if (points >= 3) return "medium";
  return "low";
}

const CONFIDENCE_LEVEL_WORD: Record<TrendConfidence, string> = { high: "High", medium: "Medium", low: "Low", unknown: "Unknown" };

/**
 * `values`/`timestamps` are the FULL ordered per-snapshot series for this
 * metric (not just the two endpoints `trend.ts` classifies `direction`
 * from) — consistency can only be judged by looking at every step in
 * between. `isStepSignificant` is the same real "does this step count as a
 * move" predicate the metric's own trend classification uses (an absolute
 * score threshold, or a ratio threshold for dollar-scale Portfolio Value) —
 * passed in rather than hardcoded so this stays generic across every
 * numeric metric.
 *
 * Deliberately does NOT take `Trend.direction` as an input: for an inverted
 * metric like Risk (`higherIsBetter: false`), `direction: "improving"`
 * means the RAW number went DOWN — using that label's sign as "the overall
 * direction" would silently flip the polarity for every inverted metric and
 * mark a perfectly consistent risk-decreasing series as inconsistent. The
 * overall sign here is derived straight from the raw endpoint values via
 * the same `isStepSignificant` predicate used for every step — a metric's
 * higher-is-better framing is a `trend.ts` display concern, not something
 * this raw-consistency check needs to know about.
 */
export function numericTrendConfidence(
  values: number[],
  timestamps: string[],
  isStepSignificant: (stepDelta: number, previousValue: number) => boolean
): TrendConfidenceDetail {
  if (values.length < 2) {
    return { confidence: "unknown", confidenceReason: "Not enough history yet to rate confidence.", snapshotCount: values.length, timeSpanDays: null, consistencyScore: null };
  }

  const overallDelta = values[values.length - 1] - values[0];
  const overallSignificant = isStepSignificant(overallDelta, values[0]);
  const overallSign = !overallSignificant ? 0 : overallDelta > 0 ? 1 : -1;
  let matchingSteps = 0;
  for (let i = 1; i < values.length; i++) {
    const stepDelta = values[i] - values[i - 1];
    const significant = isStepSignificant(stepDelta, values[i - 1]);
    const stepSign = !significant ? 0 : stepDelta > 0 ? 1 : -1;
    if (stepSign === overallSign || stepSign === 0) matchingSteps++;
  }
  const consistencyScore = Math.round((matchingSteps / (values.length - 1)) * 100) / 100;
  const spanDays = Math.round(spanDaysBetween(timestamps[0], timestamps[timestamps.length - 1]) * 10) / 10;

  const points = countFactor(values.length) + spanFactor(spanDays) + consistencyFactor(consistencyScore);
  const confidence = scoreToConfidence(points);

  return {
    confidence,
    confidenceReason: `${CONFIDENCE_LEVEL_WORD[confidence]} confidence: ${values.length} snapshots over ${spanDays} day${spanDays === 1 ? "" : "s"}, ${Math.round(consistencyScore * 100)}% step-to-step consistency.`,
    snapshotCount: values.length,
    timeSpanDays: spanDays,
    consistencyScore,
  };
}

/**
 * For a categorical metric (recommendation/fingerprint). `direction ===
 * "unknown"` means the category genuinely changed at least once across
 * history — there is no single settled trend left to rate the reliability
 * of, so this always reports `"unknown"` too, the same restraint
 * `categoricalTrend`'s own `direction` already exercises (`consistencyScore`
 * is honestly `null` here, not a fabricated 0). `direction === "stable"`
 * means the value never changed once across every snapshot in the window —
 * by definition maximally consistent — so only the count/span factors vary;
 * the consistency factor is fixed at its max (2), `consistencyScore: 1`.
 */
export function categoricalTrendConfidence(
  snapshotCount: number,
  firstTimestamp: string,
  lastTimestamp: string,
  direction: Extract<TrendDirection, "stable" | "unknown">
): TrendConfidenceDetail {
  if (snapshotCount < 2) {
    return { confidence: "unknown", confidenceReason: "Not enough history yet to rate confidence.", snapshotCount, timeSpanDays: null, consistencyScore: null };
  }

  const spanDays = Math.round(spanDaysBetween(firstTimestamp, lastTimestamp) * 10) / 10;

  if (direction === "unknown") {
    return {
      confidence: "unknown",
      confidenceReason: "This category changed during the window, so there's no single settled trend to rate the confidence of.",
      snapshotCount,
      timeSpanDays: spanDays,
      consistencyScore: null,
    };
  }

  const points = countFactor(snapshotCount) + spanFactor(spanDays) + 2;
  const confidence = scoreToConfidence(points);
  return {
    confidence,
    confidenceReason: `${CONFIDENCE_LEVEL_WORD[confidence]} confidence: unchanged across ${snapshotCount} snapshots over ${spanDays} day${spanDays === 1 ? "" : "s"}.`,
    snapshotCount,
    timeSpanDays: spanDays,
    consistencyScore: 1,
  };
}
