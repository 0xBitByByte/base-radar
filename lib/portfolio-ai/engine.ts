/**
 * V4-INTELLIGENCE-003 — the one public entry point for the AI Advisor
 * layer, mirroring `lib/portfolio-intelligence/engine.ts`'s own shape:
 * every underlying piece (`insights`, `actions`, `timeline`,
 * `summaryLines`, `overview`, `conversationContext`) is built exactly once
 * here and composed into `PortfolioAI`. This function's only real inputs
 * are an already-built `PortfolioIntelligence` snapshot and, optionally,
 * Wallet Automation's already-real `WalletEvent[]` log for the timeline —
 * no blockchain call, no provider call, no re-fetch, no recalculation of
 * any score/warning/recommendation/opportunity. `walletEvents` defaults to
 * `[]` so this function stays callable (with an honestly-empty timeline)
 * anywhere only `PortfolioIntelligence` is available.
 */

import { buildAIActions } from "@/lib/portfolio-ai/actions";
import { buildAIOverview } from "@/lib/portfolio-ai/advisor";
import { buildConversationContext } from "@/lib/portfolio-ai/conversation";
import { buildAIInsights } from "@/lib/portfolio-ai/insights";
import { buildAISummaryLines } from "@/lib/portfolio-ai/summary";
import { buildAITimeline } from "@/lib/portfolio-ai/timeline";
import type { PortfolioAI } from "@/lib/portfolio-ai/types";
import type { PortfolioIntelligence } from "@/lib/portfolio-intelligence/types";
import type { WalletEvent } from "@/lib/wallet-automation/types";

export function buildPortfolioAI(intelligence: PortfolioIntelligence, walletEvents: WalletEvent[] = []): PortfolioAI {
  const insights = buildAIInsights(intelligence);

  return {
    overview: buildAIOverview(intelligence, insights[0] ?? null),
    insights,
    actions: buildAIActions(intelligence),
    timeline: buildAITimeline(walletEvents),
    summaryLines: buildAISummaryLines(intelligence),
    conversationContext: buildConversationContext(intelligence),
  };
}

export type { PortfolioAI } from "@/lib/portfolio-ai/types";
