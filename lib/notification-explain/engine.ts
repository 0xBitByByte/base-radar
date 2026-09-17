/**
 * V4-FUTURE-001 (Notification Explainability, Phase 2) — the one public
 * entry point. Pure, synchronous, deterministic — and almost entirely a
 * LOOKUP, not a computation: `CrossFeatureIntelligence.events`/
 * `.recommendations` already correlate a real `AutomationResult.id` to a
 * real `FeatureRefs`/`RecommendationCorrelation` (built by
 * `lib/cross-feature/refs.ts` for exactly this purpose) — this file's only
 * real job is finding the ONE entry matching `result.id` and reshaping it
 * into `NotificationExplanation`. No score, trend, or recommendation is
 * computed here; `analytics`/`ai` are read only for their own already-real
 * fields (`Trend.reason`/`Trend.confidence`, `AIOverview.actionReason`).
 *
 * V4-FUTURE-001G — the "finding the ONE entry" step now reads
 * `crossFeature.indexes.eventByAutomationId`/`.recommendationByAutomationId`
 * (O(1) `Map.get`) instead of `Array.prototype.find()` — those indexes are
 * built with the identical "first match wins" semantics `.find()` had, so
 * this produces byte-identical output to before this phase.
 */

import { AI_CHAT_QUESTIONS } from "@/lib/ai-chat/questions";
import type { SuggestedQuestion } from "@/lib/ai-chat/types";
import type { AutomationResult } from "@/lib/automation/types";
import type { CrossFeatureIntelligence } from "@/lib/cross-feature/types";
import type { NotificationExplanation } from "@/lib/notification-explain/types";
import type { PortfolioAI } from "@/lib/portfolio-ai/types";
import type { WalletAnalytics } from "@/lib/wallet-analytics/types";

const EMPTY_REFS = { historySnapshotTimestamp: null, analyticsTrendMetric: null, reportPeriod: null, chatQuestionId: null, automationResultId: null };

function buildSuggestedQuestions(chatQuestionId: SuggestedQuestion["id"] | null): SuggestedQuestion[] {
  const questions: SuggestedQuestion[] = [];
  if (chatQuestionId) questions.push({ id: chatQuestionId, prompt: AI_CHAT_QUESTIONS[chatQuestionId].prompt });
  if (chatQuestionId !== "recentChanges") questions.push({ id: "recentChanges", prompt: AI_CHAT_QUESTIONS.recentChanges.prompt });
  return questions;
}

/**
 * This phase's own brief lists `HistoricalReport` among the engine's
 * consumed inputs — deliberately NOT a parameter here: `crossFeature`'s own
 * `refs.reportPeriod` was already computed FROM the caller's report (see
 * `lib/cross-feature/refs.ts`'s `findReportPeriod`), so accepting a second
 * `report` parameter this function never reads would only create the
 * appearance of consuming it — the real consumption already happened one
 * layer down, exactly once.
 */
export function buildNotificationExplanation(result: AutomationResult, crossFeature: CrossFeatureIntelligence, ai: PortfolioAI | null, analytics: WalletAnalytics): NotificationExplanation {
  const matchedEvent = crossFeature.indexes.eventByAutomationId.get(result.id) ?? null;
  const matchedRecommendation = crossFeature.indexes.recommendationByAutomationId.get(result.id) ?? null;
  const refs = matchedEvent?.refs ?? EMPTY_REFS;
  const matchedTrend = refs.analyticsTrendMetric ? (analytics.trends.find((t) => t.metric === refs.analyticsTrendMetric) ?? null) : null;

  const supportingEvidence: string[] = [];
  if (matchedEvent) supportingEvidence.push(matchedEvent.headline);
  if (matchedTrend && matchedTrend.reason !== matchedEvent?.headline) supportingEvidence.push(matchedTrend.reason);

  const reason = typeof result.metadata?.reason === "string" ? result.metadata.reason : result.summary;

  const nextAction = matchedRecommendation ? { action: matchedRecommendation.title, reason: matchedRecommendation.isPrimary ? (ai?.overview.actionReason ?? null) : null } : null;

  return {
    resultId: result.id,
    headline: result.title,
    reason,
    supportingEvidence,
    refs,
    relatedRecommendation: matchedRecommendation,
    suggestedQuestions: buildSuggestedQuestions(refs.chatQuestionId),
    nextAction,
    confidence: matchedTrend?.confidence ?? "unknown",
  };
}
