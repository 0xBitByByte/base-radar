/**
 * V4-INTELLIGENCE-003 — the one shared helper `events.ts`/
 * `recommendations.ts` both build their `FeatureRefs` from, so the actual
 * matching logic (which real automation result, which real report period)
 * exists exactly once in this layer.
 */

import { TOPIC_METADATA } from "@/lib/cross-feature/topics";
import type { FeatureRefs } from "@/lib/cross-feature/types";
import type { AutomationResult } from "@/lib/automation/types";
import type { WalletRuleId } from "@/lib/wallet-automation/types";
import type { AnalyticsSnapshot } from "@/lib/wallet-history/types";
import type { HistoricalReport } from "@/components/wallet/walletReportEngine";

/**
 * EXACT match only — a topic's real timestamp (e.g. a Highlight's own
 * `recovery.recoveryDate`) either identifies a real, already-persisted
 * snapshot or it doesn't; an "approximately nearby" snapshot would be a
 * fabricated implication of identity this layer refuses to make.
 */
function findHistorySnapshot(history: AnalyticsSnapshot[], timestamp: string | null): string | null {
  if (!timestamp) return null;
  return history.find((s) => s.timestamp === timestamp)?.timestamp ?? null;
}

/** The real `AutomationResult` for `ruleId` closest in time to `timestamp` — `null` when that rule never fired, never a guessed substitute from a different rule. */
function findAutomationResult(results: AutomationResult[], ruleId: WalletRuleId | null, timestamp: string | null): string | null {
  if (!ruleId) return null;
  const candidates = results.filter((r) => r.ruleId === ruleId);
  if (candidates.length === 0) return null;
  if (!timestamp) return candidates[0].id;

  const targetMs = new Date(timestamp).getTime();
  const nearest = candidates.reduce((best, r) => (Math.abs(new Date(r.triggeredAt).getTime() - targetMs) < Math.abs(new Date(best.triggeredAt).getTime() - targetMs) ? r : best));
  return nearest.id;
}

/** Whether `timestamp` genuinely falls within the caller-supplied Report's own real period bounds — never a second period computation. */
function findReportPeriod(report: HistoricalReport | null, timestamp: string | null): HistoricalReport["period"] | null {
  if (!report || !timestamp || !report.overview.firstSnapshotDate || !report.overview.lastSnapshotDate) return null;
  const t = new Date(timestamp).getTime();
  const inBounds = t >= new Date(report.overview.firstSnapshotDate).getTime() && t <= new Date(report.overview.lastSnapshotDate).getTime();
  return inBounds ? report.period : null;
}

export type RefsInput = {
  history: AnalyticsSnapshot[];
  automationResults: AutomationResult[];
  monthlyReport: HistoricalReport | null;
};

export function buildFeatureRefs(topic: string, timestamp: string | null, input: RefsInput): FeatureRefs {
  const meta = TOPIC_METADATA[topic];
  return {
    historySnapshotTimestamp: findHistorySnapshot(input.history, timestamp),
    analyticsTrendMetric: meta?.analyticsTrendMetric ?? null,
    reportPeriod: findReportPeriod(input.monthlyReport, timestamp),
    chatQuestionId: meta?.chatQuestionId ?? null,
    automationResultId: findAutomationResult(input.automationResults, meta?.automationRuleId ?? null, timestamp),
  };
}
