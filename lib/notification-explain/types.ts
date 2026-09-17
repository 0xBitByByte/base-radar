/**
 * V4-FUTURE-001 (Notification Explainability) — domain types. Every field
 * is either a direct reference into an already-built `CrossFeatureIntelligence`
 * correlation, or a real string already sitting on `AutomationResult`/
 * `Trend`/`PortfolioAI` — see `engine.ts`'s own doc comment for the exact
 * source of each.
 */

import type { FeatureRefs, RecommendationCorrelation } from "@/lib/cross-feature/types";
import type { SuggestedQuestion } from "@/lib/ai-chat/types";
import type { TrendConfidence } from "@/lib/wallet-analytics/types";

export type NotificationExplanation = {
  resultId: string;
  /** `result.title`, verbatim. */
  headline: string;
  /** The real smart-result `reason` (`result.metadata.reason`) when present, else `result.summary` — never a new sentence. */
  reason: string;
  /** Real, already-composed facts — the matched `CorrelatedEvent.headline` and/or matched `Trend.reason` — never fabricated, empty when no real match exists. */
  supportingEvidence: string[];
  /** The SAME `FeatureRefs` `CrossFeatureIntelligence` already built for this result's correlated event — Related History/Analytics/Report/AI Question, reused verbatim. All `null` when this result has no correlated event (an honest "nothing to reference," not an error). */
  refs: FeatureRefs;
  /** The real `RecommendationCorrelation` Cross-Feature Intelligence already matched to this result, if any. */
  relatedRecommendation: RecommendationCorrelation | null;
  /** Real questions from the static AI Chat catalog — never new question text. Always includes a topic-specific question (when `refs.chatQuestionId` exists) plus the universal "What changed recently?" fallback. */
  suggestedQuestions: SuggestedQuestion[];
  /** The related recommendation's own title, plus Portfolio AI's own `actionReason` ONLY when that recommendation is genuinely Portfolio AI's own top priority (`relatedRecommendation.isPrimary`) — never attributes an AI-authored reason to a recommendation the AI didn't specifically rank first. */
  nextAction: { action: string; reason: string | null } | null;
  /** The matched `Trend.confidence` verbatim — `"unknown"` when there's no real trend match, never a guessed rating. */
  confidence: TrendConfidence;
};
