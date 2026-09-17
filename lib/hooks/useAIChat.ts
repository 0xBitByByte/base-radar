"use client";

/**
 * V4-AI-CHAT-001 (Phase 6) — the one hook the AI Chat panel reads through.
 * Assembles `ConversationInput` from hooks that already exist
 * (`useWalletPortfolioIntelligence()`, `useWalletPortfolioAI()`,
 * `useWalletAnalytics()`, `useWalletAutomation()`) plus a real 30-day
 * Report built via `buildHistoricalReport()` — the exact same function
 * `WalletReportView`/`PortfolioWidget` already call, never a second report
 * path. No blockchain call, no Analytics/History recomputation happens in
 * this file — every value here is a direct read of an already-computed
 * hook result.
 *
 * Conversation history (`turns`) is session-only local state — asking a
 * question never persists anything; a fresh page load starts a fresh
 * conversation, matching every other session-only UI state in this app.
 *
 * Bug fix (post-V4-FUTURE-002D) — on `/dashboard/wallet`, this hook was
 * independently re-deriving `intelligence`/`ai`/`analytics`/`automation`
 * via its own `useWalletPortfolioIntelligence()`/`useWalletPortfolioAI()`/
 * `useWalletAnalytics()`/`useWalletAutomation()` calls, completely separate
 * from the canonical copies `WalletDataProvider` already built for the
 * rest of that same page (`useWalletData()`). Each hook instance owns its
 * OWN independent `usePortfolio()` fetch (confirmed in `usePortfolio.ts` —
 * real per-call-site `useState`/`useEffect`, not a shared external store),
 * so this hook's own copy could genuinely be still-loading or errored
 * while the page's canonical copy had already succeeded — the exact
 * "connected + Synced, but AI Chat says no wallet data" bug this fixes.
 *
 * `overrideInput`, when supplied, is used INSTEAD of the internally-derived
 * value — the internal hooks below are still called unconditionally
 * (React's Rules of Hooks forbid a conditional hook call, and this hook's
 * other real callers — `AutomationCenter`, `AutomationWidget` — are not
 * wrapped in `WalletDataProvider` and have no override to pass, so they
 * need the internal derivation to keep working exactly as before,
 * completely unchanged). This is the same additive, backward-compatible
 * "accept the already-built value, never redesign the public contract"
 * pattern `WalletDataProvider.tsx` itself already uses for
 * `buildCrossFeatureIntelligence`/`buildMonthlyDigest`/`buildPortfolioStory`
 * (V4-FUTURE-002D).
 */

import { useCallback, useMemo, useState } from "react";

import { useWalletPortfolioIntelligence } from "@/lib/hooks/useWalletPortfolioIntelligence";
import { useWalletPortfolioAI } from "@/lib/hooks/useWalletPortfolioAI";
import { useWalletAnalytics } from "@/lib/hooks/useWalletAnalytics";
import { useWalletAutomation } from "@/lib/hooks/useWalletAutomation";
import { askQuestion, buildSuggestedQuestions } from "@/lib/ai-chat/engine";
import type { AIChatQuestionId, AIChatResponse, ConversationInput, SuggestedQuestion } from "@/lib/ai-chat/types";
import { buildHistoricalReport } from "@/components/wallet/walletReportEngine";

export type ConversationTurn = { response: AIChatResponse; askedAt: string };

export type UseAIChatResult = {
  turns: ConversationTurn[];
  ask: (questionId: AIChatQuestionId) => void;
  clearConversation: () => void;
  suggestedQuestions: SuggestedQuestion[];
  /** `true` once there's at least a connected wallet's `PortfolioIntelligence` to talk about — the panel's own "connect a wallet" gate. */
  hasData: boolean;
};

export function useAIChat(overrideInput?: ConversationInput): UseAIChatResult {
  const { intelligence } = useWalletPortfolioIntelligence();
  const { ai } = useWalletPortfolioAI();
  const { analytics, history } = useWalletAnalytics();
  const walletAutomation = useWalletAutomation();

  const monthlyReport = useMemo(() => buildHistoricalReport(history, analytics, "30d"), [history, analytics]);

  const derivedInput: ConversationInput = useMemo(
    () => ({
      intelligence,
      ai,
      analytics,
      history,
      automationEvents: walletAutomation.events,
      automationResults: walletAutomation.results,
      automationDiff: walletAutomation.diff,
      monthlyReport,
    }),
    [intelligence, ai, analytics, history, walletAutomation.events, walletAutomation.results, walletAutomation.diff, monthlyReport]
  );

  const input = overrideInput ?? derivedInput;

  const suggestedQuestions = useMemo(() => buildSuggestedQuestions(input), [input]);

  const [turns, setTurns] = useState<ConversationTurn[]>([]);

  const ask = useCallback(
    (questionId: AIChatQuestionId) => {
      const response = askQuestion(questionId, input);
      setTurns((prev) => [...prev, { response, askedAt: new Date().toISOString() }]);
    },
    [input]
  );

  const clearConversation = useCallback(() => setTurns([]), []);

  return { turns, ask, clearConversation, suggestedQuestions, hasData: input.intelligence !== null };
}
