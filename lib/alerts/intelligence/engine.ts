/**
 * AI Alert Intelligence — the pipeline entry point (PR15.3 Part 1).
 * `buildIntelligenceAlerts` is a pure function: same `Alert[]` in, same
 * `IntelligenceAlert[]` out, every time — no randomness, no network calls,
 * no AI API, no localStorage. Runs entirely in the browser, after
 * `lib/alerts/service.ts`'s `refreshAlerts()`/`recomputeDerived()` already
 * produced the current alert set (see that file for where this is
 * wired in).
 *
 * The seven stages:
 *   1. Collect  — the caller passes in already-fetched `Alert[]`
 *      (`lib/alerts/service.ts` passes its own `getVisibleAlerts()`
 *      result — Watchlist-visible alerts only, never the unfiltered feed).
 *   2. Normalize — a no-op here: `Alert` is already one normalized shape
 *      regardless of which provider produced it (that's the whole point
 *      of `lib/alerts/providers`), so there's nothing left to reconcile.
 *   3. Group by project — `grouping.ts`.
 *   4. Score — `scoring.ts`, one modular scorer per category.
 *   5. Detect narrative — `narratives.ts`.
 *   6. Generate executive summary — `summary.ts`.
 *   7. Expose — the returned `IntelligenceAlert[]`, sorted by score
 *      (highest-signal projects first).
 *
 * No UI reads this yet (PR15.3 Part 2) — this file only builds the model.
 */

import type { Alert, AlertSeverity } from "@/lib/alerts/types";
import { groupAlertsByProject } from "@/lib/alerts/intelligence/grouping";
import { detectNarrative } from "@/lib/alerts/intelligence/narratives";
import { computeConfidence, computeScore, scoreAlert } from "@/lib/alerts/intelligence/scoring";
import { buildHeadline, buildNextStep, buildReasoning, buildSummary } from "@/lib/alerts/intelligence/summary";
import type { IntelligenceAlert, IntelligenceSignal } from "@/lib/alerts/intelligence/types";

/** Exported for `lib/alerts/service.ts`'s `sortIntelligenceAlerts` (PR15.3 Part 3, "Highest Severity" sort) — reused rather than redefined there so there's exactly one severity ordering in the codebase. */
export const SEVERITY_RANK: Record<AlertSeverity, number> = {
  info: 0,
  success: 1,
  warning: 2,
  critical: 3,
};

/** The most severe REAL severity among a project's alerts — never invented independently of what actually happened. */
function maxSeverity(alerts: Alert[]): AlertSeverity {
  return alerts.reduce<AlertSeverity>(
    (worst, alert) => (SEVERITY_RANK[alert.severity] > SEVERITY_RANK[worst] ? alert.severity : worst),
    "info"
  );
}

/** The most recent real timestamp among a project's alerts. */
function latestTimestamp(alerts: Alert[]): string {
  return alerts.reduce(
    (latest, alert) => (new Date(alert.timestamp).getTime() > new Date(latest).getTime() ? alert.timestamp : latest),
    alerts[0].timestamp
  );
}

function scoreGroupSignals(alerts: Alert[]): IntelligenceSignal[] {
  const signals: IntelligenceSignal[] = [];
  for (const alert of alerts) {
    const signal = scoreAlert(alert);
    if (signal) signals.push(signal);
  }
  return signals;
}

/** Stages 3-7, applied to one project's already-grouped alerts. */
function buildIntelligenceAlertForGroup(projectId: string, projectName: string, alerts: Alert[]): IntelligenceAlert {
  const signals = scoreGroupSignals(alerts);
  const narrative = detectNarrative(signals);

  return {
    id: `intelligence:${projectId}`,
    projectId,
    projectName,
    severity: maxSeverity(alerts),
    confidence: computeConfidence(signals),
    headline: buildHeadline(projectName, narrative),
    summary: buildSummary(projectName, narrative, signals),
    signals,
    categories: Array.from(new Set(alerts.map((alert) => alert.category))),
    score: computeScore(signals),
    relatedAlertIds: alerts.map((alert) => alert.id),
    timestamp: latestTimestamp(alerts),
    reasoning: buildReasoning(signals),
    nextStep: buildNextStep(narrative),
    narrative,
  };
}

/**
 * The full pipeline. Empty input produces an empty result — never a
 * fabricated "everything is stable" summary for projects that have no
 * real alerts at all.
 */
export function buildIntelligenceAlerts(alerts: Alert[]): IntelligenceAlert[] {
  const groups = groupAlertsByProject(alerts);
  return groups
    .map((group) => buildIntelligenceAlertForGroup(group.projectId, group.projectName, group.alerts))
    .sort((a, b) => b.score - a.score);
}
