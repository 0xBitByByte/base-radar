/**
 * V4-ANALYTICS-001A (Phase 9) — Change Frequency: how often each metric
 * genuinely changed, scanned across the FULL history (a rate is inherently
 * a lifetime/multi-period concept, not a single-window one). "Genuinely
 * changed" reuses the exact same real "is this a real move" predicates
 * `trend.ts` already uses per metric — `SCORE_CHANGE_THRESHOLD` for the
 * four score-scale metrics, real distinct-value comparison for the two
 * categorical ones — never a new threshold invented for this file.
 * `perWeek`/`perMonth` are simple linear projections of the real
 * `lifetimeChanges / lifetimeDays` rate, not a forecast.
 */

import type { ChangeFrequency, ChangeFrequencyMetric } from "@/lib/wallet-analytics/types";
import { SCORE_CHANGE_THRESHOLD } from "@/lib/wallet-automation/triggers";
import type { AutomationSnapshot } from "@/lib/wallet-automation/types";

type FrequencyDefinition = { metric: string; label: string; changedBetween: (a: AutomationSnapshot, b: AutomationSnapshot) => boolean };

const FREQUENCY_DEFINITIONS: FrequencyDefinition[] = [
  { metric: "health", label: "Health", changedBetween: (a, b) => Math.abs(b.healthScore - a.healthScore) >= SCORE_CHANGE_THRESHOLD },
  { metric: "confidence", label: "Confidence", changedBetween: (a, b) => Math.abs(b.confidenceScore - a.confidenceScore) >= SCORE_CHANGE_THRESHOLD },
  { metric: "risk", label: "Risk", changedBetween: (a, b) => Math.abs(b.riskScore - a.riskScore) >= SCORE_CHANGE_THRESHOLD },
  { metric: "diversification", label: "Diversification", changedBetween: (a, b) => Math.abs(b.diversificationScore - a.diversificationScore) >= SCORE_CHANGE_THRESHOLD },
  { metric: "recommendation", label: "Recommendation", changedBetween: (a, b) => a.primaryRecommendationId !== b.primaryRecommendationId },
  { metric: "fingerprint", label: "Fingerprint", changedBetween: (a, b) => a.fingerprint !== b.fingerprint },
];

function countChanges(history: AutomationSnapshot[], changedBetween: (a: AutomationSnapshot, b: AutomationSnapshot) => boolean): number {
  let count = 0;
  for (let i = 1; i < history.length; i++) {
    if (changedBetween(history[i - 1], history[i])) count++;
  }
  return count;
}

export function buildChangeFrequency(history: AutomationSnapshot[]): ChangeFrequency {
  if (history.length < 2) return null;

  const lifetimeDays = (new Date(history[history.length - 1].timestamp).getTime() - new Date(history[0].timestamp).getTime()) / (1000 * 60 * 60 * 24);

  const metrics: ChangeFrequencyMetric[] = FREQUENCY_DEFINITIONS.map((definition) => {
    const lifetimeChanges = countChanges(history, definition.changedBetween);
    const perDay = lifetimeDays > 0 ? lifetimeChanges / lifetimeDays : 0;
    return {
      metric: definition.metric,
      label: definition.label,
      lifetimeChanges,
      lifetimeDays: Math.round(lifetimeDays * 10) / 10,
      perDay: Math.round(perDay * 100) / 100,
      perWeek: Math.round(perDay * 7 * 100) / 100,
      perMonth: Math.round(perDay * 30 * 100) / 100,
    };
  });

  return { metrics };
}
