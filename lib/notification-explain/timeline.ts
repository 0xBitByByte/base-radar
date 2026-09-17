/**
 * V4-FUTURE-001F — the Explainability Timeline: a fixed, 6-stage lifecycle
 * view of one real `AutomationResult`, showing which real modules already
 * reference the same real moment. Deliberately consumes ONLY
 * `AutomationResult` + `CrossFeatureIntelligence` (per this phase's own
 * brief) — not raw `WalletAnalytics`/`HistoricalReport`/`MonthlyDigest`,
 * because those were ALREADY consumed one layer down when
 * `buildCrossFeatureIntelligence()` built the real `FeatureRefs` this file
 * only reads. No new correlation happens here — see `lib/cross-feature/refs.ts`
 * for where these refs actually get computed.
 *
 * "Report included it" and "Monthly Digest referenced it" are deliberately
 * gated on the SAME real `refs.reportPeriod` field, not two independent
 * signals — a `MonthlyDigest` (V4-FUTURE-001, Feature 3) always wraps the
 * exact same `HistoricalReport` for its period (`digest.report`), so "the
 * report includes this" and "the digest referencing that period includes
 * this" are the same real fact, not two separate confirmations. Presenting
 * them as independently-verified would be exactly the fabricated link this
 * phase's brief forbids.
 */

import type { CrossFeatureIntelligence } from "@/lib/cross-feature/types";
import type { AutomationResult } from "@/lib/automation/types";

export type ExplainabilityTimelineStage = "automation" | "analytics" | "history" | "report" | "digest" | "aiChat";

export type ExplainabilityTimelineNode = {
  stage: ExplainabilityTimelineStage;
  title: string;
  feature: string;
  /** A real timestamp when this stage is reached (reused from the matched `CorrelatedEvent`, falling back to the result's own `triggeredAt`) — `null` only when this stage was never reached, never a fabricated time. */
  timestamp: string | null;
  /** Whether a real reference for this stage actually exists — never assumed true. */
  reached: boolean;
};

const STAGE_META: { stage: ExplainabilityTimelineStage; title: string; feature: string }[] = [
  { stage: "automation", title: "Automation fired", feature: "Wallet Automation" },
  { stage: "analytics", title: "Analytics trend updated", feature: "Wallet Analytics" },
  { stage: "history", title: "History snapshot stored", feature: "Wallet History" },
  { stage: "report", title: "Report included it", feature: "Historical Reports" },
  { stage: "digest", title: "Monthly Digest referenced it", feature: "Monthly Digest" },
  { stage: "aiChat", title: "AI Chat can explain it", feature: "AI Chat" },
];

/**
 * Always returns exactly the same 6 stages, in the same fixed pipeline
 * order — a UI renders every stage (Phase 3's "compact vertical timeline"),
 * greying out the ones with `reached: false`, rather than a variable-length
 * list that would need its own layout logic per real event.
 */
export function buildExplainabilityTimeline(result: AutomationResult, crossFeature: CrossFeatureIntelligence): ExplainabilityTimelineNode[] {
  // V4-FUTURE-001G — O(1) index lookup, same "first match wins" semantics as the `Array.prototype.find()` this replaced.
  const matchedEvent = crossFeature.indexes.eventByAutomationId.get(result.id) ?? null;
  const refs = matchedEvent?.refs ?? null;
  const reachedTimestamp = matchedEvent?.timestamp ?? result.triggeredAt;

  const reachedByStage: Record<ExplainabilityTimelineStage, boolean> = {
    automation: true,
    analytics: refs?.analyticsTrendMetric !== null && refs?.analyticsTrendMetric !== undefined,
    history: refs?.historySnapshotTimestamp !== null && refs?.historySnapshotTimestamp !== undefined,
    report: refs?.reportPeriod !== null && refs?.reportPeriod !== undefined,
    digest: refs?.reportPeriod !== null && refs?.reportPeriod !== undefined,
    aiChat: refs?.chatQuestionId !== null && refs?.chatQuestionId !== undefined,
  };

  return STAGE_META.map(({ stage, title, feature }) => ({
    stage,
    title,
    feature,
    reached: reachedByStage[stage],
    timestamp: reachedByStage[stage] ? reachedTimestamp : null,
  }));
}
