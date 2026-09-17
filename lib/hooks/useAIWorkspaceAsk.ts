"use client";

/**
 * PR-090.02 (AI Ask) — the one hook the AI Ask panel reads through. Takes
 * the AI Workspace's own already-built `WorkspaceView` as a parameter
 * rather than deriving it — `AIWorkspaceView.tsx` builds it exactly once via
 * `buildWorkspaceView()`, and this hook must never open a second path to
 * the same data (the Wallet AI Chat lesson: inject canonical data once).
 *
 * Conversation history (`turns`) is session-only local state, matching
 * `useAIChat()`'s own `turns` — asking a question never persists anything;
 * a fresh page load starts a fresh conversation.
 */

import { useCallback, useState } from "react";

import { askWorkspaceQuestion } from "@/lib/ai-workspace/ask/engine";
import { ASK_QUESTIONS } from "@/lib/ai-workspace/ask/questions";
import { ASK_QUESTION_IDS } from "@/lib/ai-workspace/ask/types";
import type { AskQuestion, AskQuestionId, AskResponse } from "@/lib/ai-workspace/ask/types";
import type { WorkspaceView } from "@/lib/ai-workspace/types";

export type AskTurn = { response: AskResponse; askedAt: string };

export type UseAIWorkspaceAskResult = {
  turns: AskTurn[];
  ask: (questionId: AskQuestionId) => void;
  clearConversation: () => void;
  questions: AskQuestion[];
};

export function useAIWorkspaceAsk(view: WorkspaceView): UseAIWorkspaceAskResult {
  const [turns, setTurns] = useState<AskTurn[]>([]);

  const ask = useCallback(
    (questionId: AskQuestionId) => {
      const response = askWorkspaceQuestion(questionId, view);
      setTurns((prev) => [...prev, { response, askedAt: new Date().toISOString() }]);
    },
    [view]
  );

  const clearConversation = useCallback(() => setTurns([]), []);

  return { turns, ask, clearConversation, questions: ASK_QUESTION_IDS.map((id) => ASK_QUESTIONS[id]) };
}
