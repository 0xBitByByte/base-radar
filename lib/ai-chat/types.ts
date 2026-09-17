/**
 * V4-AI-CHAT-001 — domain types for the AI Chat conversation engine. This is
 * NOT an LLM integration: every answer is assembled deterministically from
 * fields that already exist on `PortfolioIntelligence`/`PortfolioAI`/
 * `WalletAnalytics`/`AutomationResult`/`WalletEvent`/`HistoricalReport` —
 * the same "presentation layer over already-computed data, never a second
 * analysis engine" discipline `lib/portfolio-ai/` itself already documents
 * (see that module's own `ConversationContext`, built explicitly "for a
 * future LLM-based chat layer (V4-AI-CHAT-001)" — this phase).
 *
 * `ConversationInput` deliberately does NOT import `HistoricalReport`'s
 * builder (`components/wallet/walletReportEngine.ts`) — Reports is listed
 * in this phase's own brief as an INPUT the caller supplies, not something
 * this engine calls itself, keeping `lib/ai-chat/` from reaching into
 * `components/` for anything beyond plain data types. The caller (a hook or
 * the chat panel) builds the report once via the same `buildHistoricalReport()`
 * every other Reports consumer already uses, and passes the result in.
 */

import type { AutomationDiff, WalletEvent } from "@/lib/wallet-automation/types";
import type { AutomationResult } from "@/lib/automation/types";
import type { PortfolioIntelligence } from "@/lib/portfolio-intelligence/types";
import type { PortfolioAI } from "@/lib/portfolio-ai/types";
import type { WalletAnalytics } from "@/lib/wallet-analytics/types";
import type { AnalyticsSnapshot } from "@/lib/wallet-history/types";
/** Type-only import — no runtime dependency on `components/`, just the shape of what the caller must already have built. See this file's own doc comment. */
import type { HistoricalReport } from "@/components/wallet/walletReportEngine";

/**
 * The 14 questions named in this phase's brief, verbatim, plus a fixed id
 * for each — the ONLY questions this engine ever answers. "Structured
 * prompts and structured responses" (Phase 6) means a user SELECTS one of
 * these; there is no free-text parsing anywhere in this engine.
 */
export const AI_CHAT_QUESTION_IDS = [
  "healthChange",
  "confidenceLow",
  "biggestRisk",
  "diversification",
  "recentChanges",
  "whatImproved",
  "whatWorsened",
  "largestHolding",
  "fingerprintChange",
  "improveFirst",
  "thisMonth",
  "portfolioEvolution",
  "topRecommendation",
  "automationTriggered",
] as const;
export type AIChatQuestionId = (typeof AI_CHAT_QUESTION_IDS)[number];

export type AIChatQuestion = {
  id: AIChatQuestionId;
  /** The fixed, exact prompt text from this phase's brief. */
  prompt: string;
  /** Which real modules this question's answer is assembled from — shown so the panel never implies free-form reasoning happened. */
  sources: string[];
};

/** One real, already-computed fact cited in an answer — never a generated sentence, always traceable to a real field. */
export type AIChatFact = { label: string; value: string };

export type AIChatResponse = {
  questionId: AIChatQuestionId;
  question: string;
  /** `true` for every one of the 14 known question ids — even when the honest answer is "not enough data yet." `false` only for a question id this engine genuinely doesn't recognize. */
  answered: boolean;
  /** A deterministic, template-composed sentence or two — never invented, always built from `facts` below. */
  answer: string;
  facts: AIChatFact[];
  sources: string[];
};

export type SuggestedQuestion = { id: AIChatQuestionId; prompt: string };

/**
 * Everything the conversation engine reads — assembled once by the caller
 * from hooks that already exist (`useWalletPortfolioIntelligence()`,
 * `useWalletPortfolioAI()`, `useWalletAnalytics()`, `useWalletHistory()`,
 * `useWalletAutomation()`), plus a Reports object the caller builds via
 * `buildHistoricalReport()`. Every field is nullable/empty-array-safe —
 * "empty wallet"/"empty history" are real, expected states, not errors.
 */
export type ConversationInput = {
  intelligence: PortfolioIntelligence | null;
  ai: PortfolioAI | null;
  analytics: WalletAnalytics;
  history: AnalyticsSnapshot[];
  automationEvents: WalletEvent[];
  automationResults: AutomationResult[];
  automationDiff: AutomationDiff | null;
  /** `buildHistoricalReport(history, analytics, "30d")`, or `null` when history is empty — see this file's own doc comment for why this engine never builds it itself. */
  monthlyReport: HistoricalReport | null;
};
