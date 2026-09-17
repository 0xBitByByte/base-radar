/**
 * V4-AI-CHAT-001 (Phase 2) — the one public entry point. Pure, synchronous,
 * deterministic: same `(questionId, input)` in, same `AIChatResponse` out.
 * No React, no provider calls, no LLM — every answer is composed from
 * fields the caller already computed (see `types.ts`'s `ConversationInput`
 * doc comment for exactly which hooks each field comes from).
 */

import { AI_CHAT_ANSWER_BUILDERS } from "@/lib/ai-chat/answers";
import { AI_CHAT_QUESTIONS } from "@/lib/ai-chat/questions";
import type { AIChatQuestionId, AIChatResponse, ConversationInput } from "@/lib/ai-chat/types";

/**
 * `questionId` is typed as `string` (not `AIChatQuestionId`) deliberately —
 * a real caller (a button click) always passes a known id, but this
 * function must still behave honestly if it's ever handed an id outside
 * the fixed 14 (e.g. a stale id from a future removed question), rather
 * than throwing. That's the one real "unsupported question" case this
 * engine has — every KNOWN id always produces a real, honest answer (see
 * `answers.ts`'s own "never fabricate, always answer honestly" discipline).
 */
export function askQuestion(questionId: string, input: ConversationInput): AIChatResponse {
  const builder = AI_CHAT_ANSWER_BUILDERS[questionId];
  if (!builder) {
    return { questionId: questionId as AIChatQuestionId, question: "Unknown question", answered: false, answer: "I don't have a way to answer that yet.", facts: [], sources: [] };
  }
  return builder(input);
}

export { AI_CHAT_QUESTIONS };
export { buildSuggestedQuestions } from "@/lib/ai-chat/suggestions";
export type { AIChatFact, AIChatQuestion, AIChatQuestionId, AIChatResponse, ConversationInput, SuggestedQuestion } from "@/lib/ai-chat/types";
export { AI_CHAT_QUESTION_IDS } from "@/lib/ai-chat/types";
