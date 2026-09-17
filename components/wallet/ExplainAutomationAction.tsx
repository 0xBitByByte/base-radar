"use client";

import { buildNotificationExplanation } from "@/lib/notification-explain/engine";
import { buildExplainabilityTimeline } from "@/lib/notification-explain/timeline";
import { ExplainButton } from "@/components/wallet/NotificationExplanationPanel";
import type { AIChatQuestionId } from "@/lib/ai-chat/types";
import type { AutomationResult } from "@/lib/automation/types";
import type { CrossFeatureIntelligence } from "@/lib/cross-feature/types";
import type { PortfolioAI } from "@/lib/portfolio-ai/types";
import type { WalletAnalytics } from "@/lib/wallet-analytics/types";

/**
 * V4-FUTURE-001E — the one shared "does this notification have a real
 * explanation, and if so, render the button for it" integration point.
 * Every existing Explain integration (`RecentWalletEventsSection`,
 * `AutomationItem`, `AutomationWidget`) independently duplicated the same
 * three steps: (1) check `result.metadata?.source === "wallet-automation"`
 * — Notification Explainability only ever has real data for wallet-scoped
 * results, never watchlist/project ones; (2) call
 * `buildNotificationExplanation()`; (3) render `ExplainButton`. This
 * component is that sequence, written once.
 *
 * Renders `null` for a non-wallet-sourced result — callers never need
 * their own gate; passing ANY `AutomationResult` (wallet or not) here is
 * always safe. Never generates or changes the explanation itself —
 * `buildNotificationExplanation()` (`lib/notification-explain/engine.ts`)
 * and `ExplainButton` (`NotificationExplanationPanel.tsx`) are unmodified;
 * this file only wires them together.
 */
export function ExplainAutomationAction({
  result,
  crossFeature,
  ai,
  analytics,
  askQuestion,
}: {
  result: AutomationResult;
  crossFeature: CrossFeatureIntelligence;
  ai: PortfolioAI | null;
  analytics: WalletAnalytics;
  askQuestion?: (questionId: AIChatQuestionId) => void;
}) {
  if (result.metadata?.source !== "wallet-automation") return null;

  const explanation = buildNotificationExplanation(result, crossFeature, ai, analytics);
  // V4-FUTURE-001F — the same real `crossFeature` this component already
  // has, reused for the lifecycle timeline too — never a second
  // correlation pass.
  const timeline = buildExplainabilityTimeline(result, crossFeature);
  return <ExplainButton explanation={explanation} timeline={timeline} onAskQuestion={askQuestion} />;
}
