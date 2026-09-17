/**
 * PR-090.02 (AI Ask) — the one public entry point. Pure, synchronous,
 * deterministic: same `(questionId, view)` in, same `AskResponse` out. No
 * React, no provider call, no LLM — mirrors `lib/ai-chat/engine.ts`'s own
 * `askQuestion()` contract exactly, but reads a `WorkspaceView` instead of
 * assembling a wallet-specific `ConversationInput`.
 */

import { ASK_ANSWER_BUILDERS } from "@/lib/ai-workspace/ask/answers";
import { ASK_QUESTIONS } from "@/lib/ai-workspace/ask/questions";
import type { AskQuestionId, AskResponse } from "@/lib/ai-workspace/ask/types";
import type { WorkspaceView } from "@/lib/ai-workspace/types";

/**
 * `questionId` is typed as `string` (not `AskQuestionId`) deliberately — a
 * real caller (a button click) always passes a known id, but this function
 * must still behave honestly if it's ever handed an id outside the fixed
 * six, rather than throwing.
 */
export function askWorkspaceQuestion(questionId: string, view: WorkspaceView): AskResponse {
  const builder = ASK_ANSWER_BUILDERS[questionId as AskQuestionId];
  if (!builder) {
    return { questionId: questionId as AskQuestionId, question: "Unknown question", summary: "I don't have a way to answer that yet.", citedClaims: [] };
  }
  return builder(view);
}

export { ASK_QUESTIONS };
export { ASK_QUESTION_IDS } from "@/lib/ai-workspace/ask/types";
export type { AskQuestion, AskQuestionId, AskResponse } from "@/lib/ai-workspace/ask/types";
