/**
 * V4-INTELLIGENCE-003 (Phase 2) — the one public entry point. Pure,
 * synchronous, deterministic. Consumes already-built outputs from Portfolio
 * Intelligence, Portfolio AI, Wallet Automation, Wallet Analytics, Wallet
 * History, and Historical Reports (the caller builds `monthlyReport` via
 * `buildHistoricalReport()`, the same convention `lib/ai-chat/` already
 * established — this engine never builds one itself); AI Chat is consumed
 * only as its static question catalog (via `chatQuestionId` refs in
 * `topics.ts`) — this engine never calls `askQuestion()`. Produces ONLY
 * relationships: no score, trend, or recommendation is computed here.
 */

import { buildCorrelatedEvents } from "@/lib/cross-feature/events";
import { buildCrossFeatureIndexes } from "@/lib/cross-feature/indexes";
import { buildRecommendationCorrelations } from "@/lib/cross-feature/recommendations";
import { buildUnifiedTimeline } from "@/lib/cross-feature/timeline";
import type { CrossFeatureIntelligence } from "@/lib/cross-feature/types";
import type { AutomationResult } from "@/lib/automation/types";
import type { PortfolioAI } from "@/lib/portfolio-ai/types";
import type { PortfolioIntelligence } from "@/lib/portfolio-intelligence/types";
import type { WalletAnalytics } from "@/lib/wallet-analytics/types";
import type { AnalyticsSnapshot } from "@/lib/wallet-history/types";
import type { WalletEvent } from "@/lib/wallet-automation/types";
import type { HistoricalReport } from "@/components/wallet/walletReportEngine";

export type CrossFeatureInput = {
  intelligence: PortfolioIntelligence | null;
  ai: PortfolioAI | null;
  analytics: WalletAnalytics;
  history: AnalyticsSnapshot[];
  automationEvents: WalletEvent[];
  automationResults: AutomationResult[];
  monthlyReport: HistoricalReport | null;
};

export function buildCrossFeatureIntelligence(input: CrossFeatureInput): CrossFeatureIntelligence {
  const refsInput = { history: input.history, automationResults: input.automationResults, monthlyReport: input.monthlyReport };

  const events = buildCorrelatedEvents(input.analytics.highlights, input.history, refsInput);
  const recommendations = buildRecommendationCorrelations(input.intelligence?.recommendations ?? [], input.history, refsInput, input.ai?.actions[0]?.id ?? null);
  const timeline = buildUnifiedTimeline(input.automationEvents, input.analytics.highlights, input.history, input.monthlyReport);

  // "Latest" is the real most-recent event by timestamp — `events` itself
  // stays in Highlights' own priority order (importance, matching every
  // other Highlights-consuming surface in this app), so this is a separate,
  // real max-by-timestamp pick, not a second ranking engine.
  const latestStory = events.length === 0 ? null : events.reduce((latest, event) => (event.timestamp > latest.timestamp ? event : latest));

  // V4-FUTURE-001G — one pass each over `events`/`recommendations`
  // (already-built above, never re-fetched) to populate O(1) lookup maps —
  // see `indexes.ts`'s own doc comment for why this never duplicates a
  // source object.
  const indexes = buildCrossFeatureIndexes(events, recommendations);

  return { events, recommendations, timeline, latestStory, indexes };
}
