/**
 * V4-AI-CHAT-001 (Phase 5) — Suggested Questions: a real, deterministic
 * "does this question have real substance right now" predicate per
 * question id, reusing the exact same fields `answers.ts` reads — never a
 * second data source. "Suggestions disappear if unsupported" is enforced
 * by these predicates being real, non-trivial checks (not just "the
 * question id exists"): e.g. `fingerprintChange` is only suggested when a
 * real fingerprint change is on record, not merely because a wallet is
 * connected.
 */

import { AI_CHAT_QUESTIONS } from "@/lib/ai-chat/questions";
import type { AIChatQuestionId, ConversationInput, SuggestedQuestion } from "@/lib/ai-chat/types";

type SuggestionPredicate = (input: ConversationInput) => boolean;

const SUGGESTION_PREDICATES: Record<AIChatQuestionId, SuggestionPredicate> = {
  healthChange: (input) => input.analytics.snapshotCount >= 2,
  confidenceLow: (input) => input.intelligence?.confidenceLevel === "Low",
  biggestRisk: (input) => !!input.intelligence && (input.ai?.insights.some((i) => i.priority === "critical-risk") || input.intelligence.warnings.length > 0),
  diversification: (input) => input.intelligence !== null,
  recentChanges: (input) => input.analytics.timeline.length > 0,
  whatImproved: (input) => input.analytics.trends.some((t) => t.direction === "improving") || input.analytics.evolution.largestImprovement !== null,
  whatWorsened: (input) => input.analytics.trends.some((t) => t.direction === "declining") || input.analytics.evolution.largestDeterioration !== null,
  largestHolding: (input) => !!input.intelligence?.largestHolding,
  fingerprintChange: (input) => input.analytics.trends.find((t) => t.metric === "fingerprint")?.direction === "unknown",
  improveFirst: (input) => !!input.ai?.overview.nextAction,
  thisMonth: (input) => (input.monthlyReport?.overview.snapshotCount ?? 0) >= 2,
  portfolioEvolution: (input) => !!(input.analytics.evolution.largestImprovement || input.analytics.evolution.largestDeterioration || input.analytics.evolution.biggestAllocationShift),
  topRecommendation: (input) => (input.ai?.actions.length ?? 0) > 0,
  automationTriggered: (input) => input.automationResults.length > 0,
};

/** Real, ranked order — most broadly useful first. Only the questions whose predicate passes for THIS input are returned; nothing is padded to a fixed count. */
const SUGGESTION_ORDER: AIChatQuestionId[] = [
  "biggestRisk",
  "improveFirst",
  "healthChange",
  "confidenceLow",
  "whatImproved",
  "whatWorsened",
  "recentChanges",
  "thisMonth",
  "fingerprintChange",
  "topRecommendation",
  "automationTriggered",
  "diversification",
  "largestHolding",
  "portfolioEvolution",
];

export function buildSuggestedQuestions(input: ConversationInput): SuggestedQuestion[] {
  return SUGGESTION_ORDER.filter((id) => SUGGESTION_PREDICATES[id](input)).map((id) => ({ id, prompt: AI_CHAT_QUESTIONS[id].prompt }));
}
