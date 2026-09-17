/**
 * V4-ANALYTICS-001A (Phase 10) — Portfolio Stability Index. Measures CHANGE
 * BEHAVIOR — how often, how much, and how consistently the portfolio
 * moves — explicitly NOT quality or health, and never portfolio value
 * alone. Built entirely from three already-real, already-computed
 * ingredients, never a new recalculation:
 *   - Frequency: `ChangeFrequency`'s real per-week rates, summed.
 *   - Magnitude: the real `|delta|` already on each numeric `Trend`.
 *   - Consistency: the real `consistencyScore` already on each `Trend`'s
 *     `confidenceDetail` (V4-ANALYTICS-001A Phase 3).
 * Each ingredient is normalized to 0-1 via a fixed, documented cap (a
 * classification banding, the same kind of fixed-threshold approach
 * `lib/portfolio-intelligence/risk.ts`'s own `concentrationLevel` already
 * uses — not a fabricated intelligence score).
 */

import type { ChangeFrequency, PortfolioStabilityIndex, PortfolioStabilityLevel, Trend } from "@/lib/wallet-analytics/types";

const FREQUENCY_CAP_CHANGES_PER_WEEK = 10;
const MAGNITUDE_CAP_AVG_DELTA = 50;

const STABILITY_LEVEL_LABEL: Record<PortfolioStabilityLevel, string> = {
  "very-stable": "Very Stable",
  stable: "Stable",
  "moderately-active": "Moderately Active",
  "highly-active": "Highly Active",
  "very-volatile": "Very Volatile",
};

function bandLevel(score: number): PortfolioStabilityLevel {
  if (score < 0.15) return "very-stable";
  if (score < 0.35) return "stable";
  if (score < 0.55) return "moderately-active";
  if (score < 0.75) return "highly-active";
  return "very-volatile";
}

const MAGNITUDE_TREND_METRICS = new Set(["health", "confidence", "risk", "diversification", "stablecoinAllocation"]);

export function buildStabilityIndex(trends: Trend[], changeFrequency: ChangeFrequency, snapshotCount: number): PortfolioStabilityIndex {
  if (snapshotCount < 2 || !changeFrequency) return null;

  const totalChangesPerWeek = changeFrequency.metrics.reduce((sum, m) => sum + m.perWeek, 0);
  const frequencyComponent = Math.min(totalChangesPerWeek / FREQUENCY_CAP_CHANGES_PER_WEEK, 1);

  const magnitudeTrends = trends.filter((t) => MAGNITUDE_TREND_METRICS.has(t.metric) && t.delta !== null);
  const avgMagnitude = magnitudeTrends.length > 0 ? magnitudeTrends.reduce((sum, t) => sum + Math.abs(t.delta ?? 0), 0) / magnitudeTrends.length : 0;
  const magnitudeComponent = Math.min(avgMagnitude / MAGNITUDE_CAP_AVG_DELTA, 1);

  const consistencyScores = trends.map((t) => t.confidenceDetail.consistencyScore).filter((s): s is number => s !== null);
  const avgConsistency = consistencyScores.length > 0 ? consistencyScores.reduce((sum, s) => sum + s, 0) / consistencyScores.length : 0.5;
  const consistencyComponent = Math.round(avgConsistency * 100) / 100;
  const inconsistencyComponent = 1 - consistencyComponent;

  const score = Math.round(((frequencyComponent + magnitudeComponent + inconsistencyComponent) / 3) * 100) / 100;
  const level = bandLevel(score);

  return {
    level,
    label: STABILITY_LEVEL_LABEL[level],
    score,
    frequencyComponent: Math.round(frequencyComponent * 100) / 100,
    magnitudeComponent: Math.round(magnitudeComponent * 100) / 100,
    consistencyComponent,
    reason: `${STABILITY_LEVEL_LABEL[level]}: ~${totalChangesPerWeek.toFixed(1)} real changes/week across all tracked metrics, ${avgMagnitude.toFixed(1)} average magnitude, ${Math.round(consistencyComponent * 100)}% step consistency.`,
  };
}
